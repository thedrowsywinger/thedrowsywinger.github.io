# Following One Request Through Logs with Grafana and Loki

We use Grafana and Loki to turn one reported problem into a sequence of events that we can check against the code.
The goal is a bounded explanation: what happened, which evidence supports it, and what we still do not know.

The starting point is often one identifier and an approximate time.
The useful error can be in another service, under another identifier, or in the line next to the one that matched.
So we follow a fixed method instead of searching everywhere at once.

This article explains that method.
All identifiers, services, timelines, and values are synthetic.
They show how the method works, not a real event.

## 1. Know which tool answers which question

Grafana is our investigation interface.
It connects to backends through data sources.
Loki stores application logs and answers queries written in LogQL, its query language.

Prometheus holds measurements, such as CPU and memory, and Grafana shows those too.

```text
Reported problem
  --> Grafana
        +--> Loki: what the application recorded
        +--> Prometheus: how the services and hosts behaved

Events + measurements
  --> the deployed code and configuration
        --> an explanation we can test
```

A CPU increase next to an error spike is a reason to ask another question.
It does not show which one caused the other.

We reach Loki from the command line through a small wrapper.
The wrapper reads a local credential profile, so no token goes into the command itself.
The token's permissions decide what we can read.
Log access does not give access to databases or to the cluster.

## 2. Fix the environment, service, and time window

First, we find out where the reported action ran.
An identifier without an environment can lead to unrelated records.
A local time without its timezone moves the search to the wrong window.

1. Confirm the environment and the business area.
2. Record the reported time and its timezone.
3. Convert the window to UTC, and save both forms.
4. Choose the likely service and check its labels.
5. Start with a narrow window around the reported action.

A label is a named attribute on a log stream.
A log stream is the group of entries that share the same labels.
Our services do not all use the same label name for the service, so we look up the labels instead of assuming `app` everywhere.

```bash
agent-loki demo-prod labels
agent-loki demo-prod values app
```

For an event in the past, we set an absolute time range in Grafana.
Grafana supports both relative and absolute ranges. [Loki query guidance](https://grafana.com/docs/loki/latest/query/bp-query/)

We take a time from an identifier only after we check its format and the code that generates it.
Otherwise we use the reported time or a verified record timestamp.

## 3. Find the identifier before you parse anything

We search the likely service for the known identifier.
This query selects one service and keeps lines that contain the trace identifier.

```logql
{app="demo-flight"} |= "demo-trace-42"
```

The `|=` operator keeps lines that contain the given text.
We put simple text filters before parsers, so Loki does less work later. [Loki query guidance](https://grafana.com/docs/loki/latest/query/bp-query/)

For a recent problem, the wrapper takes a duration and a line limit.

```bash
agent-loki demo-prod query \
  '{app="demo-flight"} |= "demo-trace-42"' 10m 100
```

This searches the last ten minutes and asks for at most one hundred lines.
Loki returns the newest matches first, and the wrapper sorts them oldest first for display.
A display in time order does not prove that we have the whole window.

For structured logs, we parse JSON after the text filter has narrowed the matches.

```logql
{app="demo-flight"} |= "demo-trace-42" | json | event="http.request"
```

The parser extracts fields from valid JSON only.
A line that fails to parse gets an `__error__` label, and we check for it when results look incomplete. [Loki log queries](https://grafana.com/docs/loki/latest/query/log_queries/)

No matches can mean several things.
The time, environment, labels, or identifier can be wrong.
The service may not log that identifier, or the logs may be past their retention period.
We check these before we widen the search to every service.

## 4. Read the lines around the match

The line that matches the identifier is often not the line that explains the problem.
A stack trace can span several entries, and only the first one may contain the identifier.

So we open the surrounding context of the matching stream, and keep the window small.
Grafana's context view loads nearby entries from the same stream. [Grafana Loki query editor](https://grafana.com/docs/grafana/latest/datasources/loki/query-editor/)

```text
Identifier search
  --> matching event
        --> same stream, nearby time
              --> stack trace or the step before it
                    --> candidate code path
```

Nearby lines can belong to other requests running at the same time.
Before we join lines into one story, we check request identifiers, instance labels, and operation names.
Two lines close in time are not proof that they belong to the same request.

## 5. Follow identifiers across services

The first service may log a booking code, and the next one a supplier reference.
We keep the evidence that links one identifier to the next.

```text
Gateway event
  trace: demo-trace-42
  booking: demo-booking-17
          |
          v
Booking service event
  booking: demo-booking-17
  supplier reference: demo-supplier-8
          |
          v
Supplier adapter event
  supplier reference: demo-supplier-8
  result: validation rejected
```

Each arrow needs a recorded mapping or a code path that we have read.
A similar timestamp or a similar message is weaker evidence.
When a service does not log the shared identifier, we record that gap instead of inventing a full trace.

Then we read the handler in the revision that was deployed.
That tells a validation failure apart from a later database or supplier failure.
A local branch can differ from production, so its code alone cannot answer the question.

## 6. Count events without overstating impact

Once we understand one occurrence, we ask whether the same signature appears elsewhere.
This query counts matching entries across the service's streams.

```logql
sum(count_over_time({app="demo-flight"} |= "demo-error-code" [10m]))
```

`count_over_time` counts entries in the given duration for each stream, and `sum` adds the stream counts together. [Loki metric queries](https://grafana.com/docs/loki/latest/query/metric_queries/)

We run it as an instant query at the end of the chosen window.
In Grafana, an instant query uses the To value of the time range. [Grafana Loki query editor](https://grafana.com/docs/grafana/latest/datasources/loki/query-editor/)

A range query evaluates the expression again at each step.
If you add up overlapping ten-minute counts, you count some entries more than once. [Loki HTTP API](https://grafana.com/docs/loki/latest/reference/loki-http-api/)
So we check the query mode before we report a total.

A count of log entries is also not a count of affected bookings.
One booking can log the same error several times, or retry.
An impact number needs a defined business event and a reliable way to find unique records.

## 7. Keep large collections bounded

Every production log query is work for a shared service.
A small result does not mean that Loki scanned a small amount of data.
So a large collection needs a reason and a plan.

1. State why a larger collection is necessary.
2. Choose one service and fixed start and end times.
3. Split the window into small parts.
4. Request one part at a time, with a pause between requests.
5. Save each part with its query and its window.
6. Stop on errors or signs of load on the service.
7. Check coverage before you calculate totals.

Loki's range API takes explicit start, end, direction, and line-limit parameters.
A response that reaches the line limit may be cut off. [Loki HTTP API](https://grafana.com/docs/loki/latest/reference/loki-http-api/)

A formatted display is not an export.
Our wrapper's display drops stream labels and rounds timestamps to the second.
An exporter must keep the original timestamps, stream labels, and line text.

It must also handle page boundaries where several entries share one timestamp.
Moving past that timestamp can skip entries, and repeating it can return the same entries again.
Timestamp and text alone cannot tell every legitimate repeated entry apart.

We compare exported counts with counts queried separately over the same boundaries.
We also check the entries at each boundary and which streams are covered.
Matching counts alone do not prove that the entries are the same.
Logs that arrive late can also change the results between two checks.

When the logs hold query events, the same data can show database work per request.
[Query Profiling Found More Than Slow Queries](query-profiling-found-more-than-slow-queries.html) explains that analysis and its sampling limits.

## 8. Write the finding with what is still unknown

We end with a timeline and a claim that the evidence supports.
This report is fully synthetic.

```text
Window: 09:10-09:20 UTC, demo production environment

09:12:04  Gateway accepted demo-trace-42.
09:12:05  Booking service linked it to demo-booking-17.
09:12:05  Adapter logged a validation rejection for demo-supplier-8.

Observed:   linked events reached supplier validation.
Code check: the handler we read rejects a missing required field.
Hypothesis: that field was missing from this request.
Next check: confirm the field through an approved source.
Limit:      the logs we read do not show the original field value.
```

We share the relevant facts, not full request bodies.
Raw logs can hold credentials, customer details, and internal addresses.
Saved evidence needs access control and a retention period, even when the account can only read.

The method works when each step answers one specific question.
We move from one identifier to nearby context, then to related services, the code, and a carefully defined count.
The explanation stays tied to the evidence we actually collected.
