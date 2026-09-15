# Agent Usage Detail Record (AUDR)

An open standard for recording who initiated your agent runs and how much each cost, across every system a run passes through.

This is the agent-readable version of the AUDR homepage. The human-readable page is [index.html](/).

**License:** Apache 2.0  
**Stewarded by:** Chargebee  
**Contact:** [audr@chargebee.com](mailto:audr@chargebee.com)

## Resources

- [Specification (HTML)](/spec/v1.0.0/index.html)
- [Specification (Markdown)](/spec/v1.0.0/SPEC.md)
- [JSON Schema](/spec/v1.0.0/audr.schema.json)
- [Homepage structured data](/index.schema.json)
- [GitHub](https://github.com/openaudr/audr/tree/main/)

## The problem

A run can be fully observable at every individual layer and still leave you without a single end-to-end record of who ran it and what it cost.

A single agent run touches multiple systems. The application knows the customer and the feature. The router knows the tokens and the cost. The tools know what they executed. Without a shared way to join these, usage data is orphaned from the business context that gives it meaning.

The telecom industry solved this with the Call Detail Record, an open standard carriers converged on so a call's attributes could be captured and exchanged in a common format, independent of any single carrier's systems. AUDR is built on the same principle: a common record for agent runs that any harness, router, or billing system can emit and ingest to help businesses make sense of the economics at the run level.

## How it works

A record carries the raw counts that drive cost — tokens, tool calls, seconds of compute — alongside the business context that says whose cost it is: customer, feature, environment. Every layer keeps reporting what it already reports. AUDR adds three rules that let those reports come together into one record.

1. **Shared run ID.** Minted by the harness, passed to the router in request metadata, and echoed back. Every system that touches the run carries the same ID.
2. **Clear authority per field.** The harness owns attribution: customer, environment, initiator. The router owns usage: tokens, provider. Each fact has exactly one source.
3. **Strict merge rules.** The sink assembles records sharing a run and span ID. No component rewrites another's block. Conflicts are rejected, and a correction is a new record, never a mutation.

```json
{
  "run": {
    "run_id": "run_8f2a1c",
    "span_id": "span_4b91"
  },
  "attribution": {
    "customer_id": "acme-corp",
    "initiator": "end_user"
  },
  "usage": {
    "llm": { "input_tokens": 1204, "output_tokens": 318 }
  },
  "emitter": { "component": "router" }
}
```

`run.run_id` is minted by the harness. `attribution` is sourced from the harness. `usage.llm` is sourced from the router.

## Try it

Wrap your router and get a usage record for every call, including the customer and cost. Write the records to a file or export them to your existing OpenTelemetry pipeline. No account, hosted backend, or pricing configuration needed.

```js
import { withAUDR } from "@audr/openrouter";

const router = withAUDR(openrouter, {
  customer_id: req.customerId,
  environment: "production",
  initiator: "end_user",
  sink: "file://./audr.jsonl",
});
// nothing else changes; every call now emits a record
```

**Adapters:** NVIDIA NeMo Relay, OpenRouter, LiteLLM.

## Stewardship

AUDR was drafted at Chargebee, and is being improved with collaboration across the ecosystem. Granular cost and usage instrumentation are foundational to agent unit economics — the infrastructure every team building or monetizing agents will need. We believe that infrastructure should be open, neutral, and community-owned. As adoption grows, the goal is to move cost governance to an independent foundation.

## Get involved

The most useful thing you can give us right now is an hour with the spec and an honest account of where it breaks for a cost model you have and we haven't imagined.

- **[Read the spec](/spec/v1.0.0/index.html).** Full schema, field ownership rules, and delivery semantics.
- **[Write an adapter](https://github.com/openaudr/audr).** For a harness or router we haven't reached yet. A conformant adapter is roughly 200 lines against the shared fixtures.
- **[Open an issue](https://github.com/openaudr/audr/issues).** Especially if you think a design decision above can be improved. Tell us specifically where it breaks.

## Frequently asked questions

### Why AUDR?

AUDR is useful anywhere you need a reliable record of what an agent run consumed and who or what it was associated with.

Wrap your router, emit the records, and it can help you answer questions like: How much does this agentic feature cost? What does this customer's agent usage look like, and how much does it cost? What are the unit economics and margins per customer for my agentic features? Which workflows or models are driving our costs? Which power users are driving our costs?

### Isn't this what OpenTelemetry's GenAI conventions are for?

Partly. AUDR is designed to sit on top of OpenTelemetry, not compete with it. OTel's GenAI semantic conventions provide the right foundation for describing model calls and usage, and AUDR reuses them. An AUDR record can be emitted as an OTel span, and the OTel collector is a first-class sink.

What OTel does not define is the set of rules you need when usage becomes a durable record: which attributes are required, how attribution is handled when it's missing, how retries remain idempotent, or how corrections are made. Observability can tolerate a dropped span. A usage record cannot. AUDR adds those requirements and delivery semantics on top of OTel.

### How is this different from FOCUS?

They solve different parts of the same problem. FOCUS standardizes the billing data you receive from providers, so costs from AWS, Azure, and others can be represented in a common schema. AUDR standardizes the usage you emit when an agent run happens, before that usage is priced.

The two are complementary. AUDR records can be rated by any backend and mapped into FOCUS-compatible cost data. We are looking to complete the upstream half of an existing standard, not stand up a competing one.

### What does this cost in latency?

Nothing in the normal request path. AUDR emits records asynchronously and out of band, so recording usage does not add synchronous work to inference.

The one exception is optional pre-flight budget gating. If you use it, you would make a single check before a run starts.

### Chargebee drafted AUDR. What keeps this from becoming a Chargebee-specific format?

We built AUDR as an open standard because we don't think the infrastructure for agent economics should belong to any one company. Agents run across many models, routers, tools, applications, and rating systems. The record that connects all of that usage should be a common language that anyone can speak, not a format designed to pull you toward a particular vendor.

That belief also shapes how we've built AUDR. The spec carries no prices or rating logic, and the SDK has no concept of plans, invoices, or how a customer should be charged. It records what happened and who it happened for. What you do with that data is up to you. Point the records at Chargebee, a competing rating engine, your own, or a warehouse for analytics, and AUDR works the same way.

### Do I need a billing system to use this?

No. You can store those records locally, send them to your warehouse, feed them into an observability system, or use them for internal cost analysis or future projections.

A billing system is just one possible consumer of that record. AUDR doesn't assume what you do with the data after it is emitted.

### Is the spec stable enough to build on?

Yes. The three rules at the core of AUDR are stable: one run ID across every layer, one authoritative source per field, and strict merging with no silent overwrites. These rules will not change without a major version.

The field set will continue to grow as providers introduce new things to measure. That's expected and does not break existing implementations. What's shipped today is safe to build on, while the schema will continue to evolve with the systems it measures.
