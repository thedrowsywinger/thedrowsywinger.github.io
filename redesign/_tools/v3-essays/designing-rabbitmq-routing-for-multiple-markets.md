# Designing RabbitMQ Routing for Multiple Markets

We organize booking events around a clear routing rule: each market's events must reach that market's handlers.
Connections, channels, routing keys, and queues each have a separate role in expressing that rule.

A market is a business segment with its own booking workflow.
Several markets can run the same application code while using different configuration and data.
The messaging design must preserve those boundaries throughout publication and processing.

This article uses RabbitMQ's AMQP 0-9-1 messaging model.
All names, identifiers, and example values are synthetic.
The verification steps describe checks to perform, rather than completed deployment results.

## 1. Give each messaging resource a clear role

A connection is a network connection between an application and RabbitMQ.
A channel is a logical session inside that connection.
A queue holds messages for delivery, and a consumer receives deliveries from a queue.

An exchange routes published messages according to its type and bindings.
A binding connects an exchange to a destination queue and defines the relevant routing rule.
The routing key is a value supplied when publishing the message. [RabbitMQ exchanges](https://www.rabbitmq.com/docs/exchanges)

The message path looks like this.

```text
Publisher
  --> exchange + routing key
        --> matching queue binding
              --> queue
                    --> consumer
                          --> application handler
```

Connection sharing addresses network resources.
Queue bindings determine where messages go.
Changing one does not automatically change the other.

We therefore start with the delivery rule before choosing how many connections to open.

## 2. Put the market into the routing contract

For this example, we use a direct exchange.
It matches published routing keys exactly against binding keys. [RabbitMQ exchanges](https://www.rabbitmq.com/docs/exchanges)

We include the market in both routing keys and queue names.
The key controls matching; the queue name makes the destination's purpose visible.

```text
Direct exchange: demo.bookings

Routing key: booking.completed.market-a
  --> queue: demo.booking-status.market-a
        --> market-a workers

Routing key: booking.completed.market-b
  --> queue: demo.booking-status.market-b
        --> market-b workers
```

The publisher and consumer configuration must agree on the exchange, routing key, and binding.
A suffix in a queue name alone does not tell the exchange how to route a message.

Multiple eligible consumers on the same queue share its deliveries.
They do not each receive every message. [RabbitMQ consumers](https://www.rabbitmq.com/docs/consumers)

That is useful when several workers process one market's workload.
Each worker can handle the same business events and use the appropriate market configuration.

If another service needs its own copy, it needs its own queue with a matching binding.
For example, a status service and an audit service can each bind a separate queue to the same routing key.

Naming expresses routing intent.
It does not establish an authorization boundary.
Broker permissions and virtual-host design must provide the required access controls.

## 3. Share connections within an intentional boundary

One connection can carry several channels.
We can use named channels to keep subscriber configuration explicit while sharing that connection.

```text
Application instance
  |
  +--> booking connection
         |
         +--> status channel  --> status consumer
         |
         +--> payment channel --> payment consumer
```

The channels still share the connection's lifecycle.
Closing the connection closes its channels. [RabbitMQ channels](https://www.rabbitmq.com/docs/channels)

We also configure prefetch for the workload.
Prefetch limits how many deliveries can remain unacknowledged within its configured scope.
In RabbitMQ, a non-global prefetch setting applies separately to each consumer. [RabbitMQ consumer prefetch](https://www.rabbitmq.com/docs/consumer-prefetch)

We check how the selected client library applies that setting.
Separate channel names alone do not establish a shared or independent delivery budget.

A virtual host is a broker namespace containing resources such as exchanges, queues, and bindings.
An AMQP 0-9-1 connection belongs to one virtual host.
Communicating with another virtual host requires another connection. [RabbitMQ virtual hosts](https://www.rabbitmq.com/docs/vhosts)

The useful connection count follows from those boundaries and workload needs.
A lower number alone does not establish a better design.

## 4. Resolve configuration before declaring subscriptions

The application needs its market before it can build the routing configuration.
We keep the subscription's logical identity separate from configuration-dependent queue names.

A framework can register a stable handler name while loading code.
A configuration factory can later supply its exchange, routing key, queue, and options.
A configuration factory is a function that builds settings from initialized configuration.

```text
Load handler definitions
  --> register a stable handler name
        --> initialize configuration
              --> validate market
                    --> build queue and routing names
                          --> declare resources and attach consumer
```

This sequence makes configuration timing explicit.
Require a recognized market before constructing market-specific names.
That is a design requirement, not a claim about every framework's startup order.

Framework integration needs its own checks.
A controller-based handler may require an explicit discovery setting.
The startup check must establish that the intended handler is attached to the intended queue.
A declared queue alone does not establish that a consumer is running.

## 5. Define the message contract at the handler

The routing key and message body have different jobs.
The routing key selects the destination; the body carries the application event.

For example, we can use the routing key `booking.completed.market-a` with this synthetic body.

```json
{
  "pattern": "booking.completed",
  "data": {
    "bookingId": "demo-booking-42"
  }
}
```

A client library may pass the complete body to a handler or unwrap its data field.
We verify that behavior at the application boundary instead of inferring it from an HTTP handler's annotations.

The handler sequence is straightforward.

1. Validate the incoming message shape.
2. Map the event data to the expected operation.
3. Await the operation's completion.
4. Acknowledge the delivery after the required work succeeds.
5. Apply the configured error path when processing fails.

An acknowledgement tells RabbitMQ that the consumer considers a delivery handled.
Publisher confirms cover the publisher's interaction with the broker; they do not confirm consumer processing. [RabbitMQ acknowledgement guide](https://www.rabbitmq.com/docs/confirms)

A business check still needs evidence that the intended record changed.
That check can include the booking identifier, market, resulting state, and relevant operation result.

## 6. Make rejection and recovery deliberate

We choose the handler's error behavior as part of the subscription design.
Immediate requeue can repeatedly deliver a message whose processing will keep failing.
A bounded retry policy needs a delay, a limit, and a defined outcome when attempts are exhausted.

Another path rejects without requeue and sends eligible messages through a configured dead-letter exchange.
A dead-letter exchange routes messages removed from their source queues under specified conditions. [RabbitMQ dead-letter exchanges](https://www.rabbitmq.com/docs/dlx)

The following diagram assumes the required dead-letter configuration and routing are available.

```text
Handler succeeds
  --> acknowledge delivery

Handler fails
  --> reject without requeue
        --> configured dead-letter exchange
              --> inspection queue
```

We check the exchange, binding, permissions, destination availability, and queue-type behavior.
Dead-lettering is not an unconditional guarantee that every rejected message is retained. [RabbitMQ dead-letter safety](https://www.rabbitmq.com/docs/dlx#safety)

The inspection queue also needs an owner and a review process.
Moving a delivery there does not finish the underlying booking operation.

Before replaying a message, we check for effects that may already have happened.
A database write or supplier request can succeed before a later processing step fails.
[Making Booking Retries Safe](making-booking-retries-safe.html) explains coordinating repeated database effects for one booking identifier.

External operations need their own duplicate-detection and reconciliation rules.
Reconciliation compares recorded states and resolves uncertainty about what completed.

## 7. Plan topology changes as a deployment sequence

Topology means the configured exchanges, queues, and bindings.
Publishers and consumers can move between topology versions at different times.

Some queue properties must match an existing declaration.
An incompatible redeclaration can close the channel with a precondition error. [RabbitMQ queue declarations](https://www.rabbitmq.com/docs/queues#property-equivalence)

Use a planned migration when declarations cannot be changed in place.

1. Declare the new queues, bindings, and error-handling destinations.
2. Start the intended consumers and verify their configuration.
3. Check routing with synthetic messages for each market.
4. Switch publishers according to the migration plan.
5. Confirm that superseded publishers have stopped sending to the previous destinations.
6. Wait for previous queues and in-flight deliveries to finish processing.
7. Stop superseded consumers and retire their queues after verification.

The plan must also define rollback behavior.
If both paths can deliver the same business event during migration, handlers need a way to recognize repeated work.
Deleting a queue must not become the method for deciding whether its remaining work matters.

## 8. Verify routing and business effects separately

A successful connection establishes only one part of the design.
We also need to check declarations, bindings, consumers, acknowledgement behavior, and application results.

Use this verification sequence.

1. Inspect the expected exchange, queue names, and bindings.
2. Confirm the intended consumers are attached.
3. Publish a synthetic event for market A.
4. Verify its intended handler and business-state effect.
5. Confirm that market B's handler does not process it.
6. Repeat the checks for market B.
7. Trigger a controlled handler error and inspect the configured recovery path.
8. Test reconnect behavior and repeated deliveries in an appropriate test environment.

These checks answer different questions.
A publisher confirm is not a consumer acknowledgement, and neither alone proves the intended business result.

We make the routing rule visible at every stage.
Connections follow namespace and workload boundaries, channels carry explicit settings, and bindings connect each market's events to its consumers.
That gives us a design we can explain and verify without treating connection count as the goal.
