# Query Profiling Found More Than Slow Queries

A list of slow queries tells you which operations take time.
It does not tell you why the application ran them, or whether they did the right work.
We built our query profiler to answer those questions by keeping each operation inside the request that caused it.

We started with hotel services and then added other parts of the platform.
The services used different database libraries, but we asked the same three questions everywhere.

1. Which request caused this operation?
2. How many times did it run inside that request?
3. Did it make the business change we expected?

This article explains the design and the method.
All names, identifiers, and values are synthetic.
It describes how we read profiler output, not a measured speedup.

## 1. Put the query back inside its request

The profiler writes structured JSON events to standard output.
Loki collects them with the application logs, and Grafana gives us the views to analyze them.

We use two main event types.

1. A query event describes one database operation.
2. A request event summarizes one HTTP request.

Request context connects the two.
It holds a trace identifier, the route, and counters for the database work seen so far.

```text
HTTP request
  --> create request context
        |
        +--> database operation --> query event
        |
        +--> database operation --> query event
        |
        +--> response completes --> request summary

Events --> standard output --> Loki --> Grafana
```

We record route templates, not full URLs.
For example, `/bookings/:id` groups every booking page without putting each booking identifier into that field.

An adapter connects the shared profiler logic to one database library.
The adapter captures the request context when an operation starts.
It uses that same context when the operation completes.
Some libraries run their completion callbacks after the original context is gone, so this pairing keeps each operation attached to the right request.

Background work needs separate care.
A query can finish after the response summary is already written.
That query then does not appear in the summary's totals.

## 2. Group query shapes without collecting values

A query fingerprint is the structure of an operation with its values removed or replaced.
It lets many requests add to the same query group.

```text
Original filter
  demo_mappings.findOne({hotelId: "demo-hotel-a"})

MongoDB fingerprint
  demo_mappings.findOne({"hotelId":"string"})
```

Our MongoDB adapter keeps field names and operators, and replaces each value with its type name.
It also sorts object keys and collapses repeated array elements into one shape.

So a lookup with three identifiers and a lookup with thirty share one fingerprint.
The fingerprint describes the shape of the query, not the size of the batch.
We still need request counts and the code to understand the real workload.

SQL needs its own fingerprint logic.
A SQL statement and a MongoDB filter do not hold their values in the same form, so one replacement rule cannot cover both.

Fingerprints keep query values out of the profiler's query fields.
They do not make every log field safe.
Error messages and other metadata still need their own review.

## 3. Count the round trips in one request

Request context makes one pattern easy to see: many small queries inside one request.
Each query is fast on its own, so none of them appears in a slow-query list.
Together they can add up to most of the request's database time.

This is often an N+1 pattern.
One operation gets a list, and then one more operation runs for each item in it.

```text
One request, hotel identifiers looked up one by one

  hotel A --> findOne
  hotel B --> findOne
  hotel C --> findOne

Same request, identifiers looked up together

  [A, B, C] --> one batch lookup --> reuse the returned rows
```

This simplified code shows the change.

```typescript
// One query per hotel.
for (const hotelId of hotelIds) {
  await mappings.findOne({ hotelId });
}

// One query for all of them.
const rows = await mappings.find({ hotelId: { $in: hotelIds } });
```

The request summary shows the pattern directly.
Its query count grows with the number of items, while each query event looks harmless.

A real flow can need several batch lookups, not one.
For example, a supplier search can translate our identifiers into supplier identifiers, and then translate the results back.
Each direction is its own batch.

Two details decide whether the batch is correct.
First, keep identifier types the same as the stored values.
A numeric identifier turned into a string can stop matching in MongoDB.
Second, check that the batch query has an index on the deployed database.
An index declared in source code does not prove that the deployed collection has it.

## 4. A completed query is not a completed change

A database operation can finish quickly and without a driver error, and still miss its purpose.
An update that matches no record succeeds as an operation.
Its duration tells us nothing about whether the right record changed.

The profiler shows that an operation ran.
It does not show that the business state is correct.
So we read the code path behind important writes, not only their timing.

A failure path is a good example.
Suppose a booking record is created and a later step fails.
The handler must mark that record as failed, and for that it needs the record's identifier.

```text
Creation fails before a record exists
  --> log the error
  --> no status write

Record exists, then a later step fails
  --> use the identifier kept from creation
  --> try to save FAILED status
```

We keep the identifier in scope as soon as the record exists.
Our shared data layer also skips the write and logs a warning when the identifier is missing.
That guard checks that an identifier is present.
It cannot prove that the update matched the record we meant.

We keep the response to the caller separate from the status write.
If saving the failed status also fails, we log that error.
It does not replace the original failure response.

## 5. Keep elapsed time and query time apart

We measure request elapsed time and accumulated database time separately.
The operation timer measures the interval around the library call.
It is not database-server CPU time.

Operations can also run at the same time.
Their durations then add up to more than the time the user waited.

This is an idealized example, not a benchmark.

```text
Query A: [------ 100 ms ------]
Query B: [------ 100 ms ------]

Accumulated query time:  200 ms
Elapsed time for both:   100 ms, when they fully overlap
```

Request elapsed time also includes application work and calls to other services.
A slow endpoint can have very little database time.
The profiler helps us choose the next thing to investigate, instead of assuming that every slow response needs a database fix.

## 6. Keep the sampling rate visible

Sampling means that we record only some of the requests.
Different routes can use different rates.
For each request, the profiler makes one sampling decision and keeps it for all the work in that request.

So raw event counts from routes with different rates are not comparable.
Traffic volume and the mix of routes can also change between two windows.

To compare a before and an after, we use these measures.

1. Queries per request.
2. Database time per request.
3. Time per run of one query fingerprint.
4. Total database time over comparable periods, corrected for sampling.

Both windows need the same coverage.
Some route filters keep request summaries but drop individual query events.
A comparison must use routes with the same profiler settings.

Deploys need care too.
During a rollout, an older instance without the profiler writes no profiler events.
If its requests are in the denominator, the new instance seems to miss traffic.

## 7. Check the profiler itself

The profiler adds application work and log volume.
It is not free, and its output is not complete by default.

Its reporting code catches its own errors and records them as separate events.
That keeps profiler failures out of the normal request path.
It does not mean that logging costs nothing.

When we roll the profiler out to a service, we run these checks.

1. Confirm that the expected build is running.
2. Check the service, environment, module, and route labels.
3. Compare sampled request counts with an independent request log.
4. Check query timings, failure fields, and events with missing context.
5. Read sample output for values that should not be there.
6. Review log volume and profiler error events.

These checks test the instrument.
They do not show that a fix worked.
A healthy profiler can still report a slow or incorrect application.

## 8. Claim only what the evidence shows

A code change and its measured effect are two separate claims.
Batching a lookup is a concrete change that we can read in the code.
Its effect in production needs a comparable measurement window, with the sampling rate and coverage from section 6.

The most useful thing the profiler gave us was not a faster query.
It was the link between an operation and its purpose.
A repeated lookup explains extra work.
A write that runs but changes nothing explains a wrong state.
Keeping each query inside its request let us ask both questions with the same data.
