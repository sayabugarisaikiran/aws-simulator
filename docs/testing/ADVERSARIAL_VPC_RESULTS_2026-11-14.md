# Adversarial VPC check results (14 November 2026)

Run `cargo build --locked --manifest-path engine/Cargo.toml`, then
`npm run test:adversarial`. The entry point runs the Rust executable through
JSON lines and runs the client and persistence reliability tests.

| Challenge | Result and evidence |
| --- | --- |
| Longest prefix | The broken 8.8.8.0/24 NAT path blocks 8.8.8.8. The same table permits 1.1.1.1 through the default IGW. Native assertions passed. |
| Conflicting routes | Validation and the selected subnet probe reject identical destination prefixes in either order. |
| NAT loops | Self and two-gateway cycles terminate with blocked probes. The public NAT model requires a direct IGW route from the NAT subnet. |
| Invalid identities and references | Validation rejects duplicate IDs, a second VPC, and incorrect types on route targets. Malformed resource arrays are rejected. Selected probes enforce these restrictions on their dependencies. |
| Shared Elastic IP | Native validation and NAT probes reject reuse across public NAT gateways. |
| Delayed results | In an isolated browser, switched workspaces while a packet test waited on a paused Rust process. Resuming Rust left no old packet trace and Run test was available. Client tests verify request invalidation and cancellation. |
| Two tab saves | Both tabs opened the same draft. The second tab reported that saving was paused after the first saved. Its local edit remained visible and the first edit survived reload. |
| Quota and damaged JSON | Filled isolated browser storage. Editing triggered a save warning and the prior version survived reload. A damaged JSON fixture triggered the recovery warning. Client tests also cover malformed nested data. |
| Engine outage | Stopped Rust, observed the browser error and restarted it. Retry engine refreshed readiness and a new probe ran without reloading. Client tests exercise the deadline on both fetch and body parsing. |
| ACL ordering | Lower-numbered allow beats a higher-numbered deny and reversing their order changes the result. |
| ACL return source | An inbound 55000 rule limited to the VPC CIDR blocks the external return. A rule permitting the actual remote address allows it. |
| Shared ACL | Both subnets block when they share the denying ACL. Reassigning one to a permissive ACL changes only that subnet's batch result. |
| Malformed ACL | Validation and probes reject fractional and duplicate rule numbers, port overflow, reversed ranges, unknown directions/actions and blank values. |
| Buried cards | The component selector listed all 200 components, including 197 stacked subnet cards. Selected a long-named subnet and verified editing after zoom and rotation. |
| Readiness load | 197 subnet reports were returned in one native batch, around 110 ms including process startup on the tested machine. The browser showed readiness, accepted continuous typing on the selected subnet, and retained the edit across workspace switches and reload. |

Final regression run passed 46 native adversarial assertions, the 200-component
native batch, 27 JavaScript tests (including seven reliability tests), 21
Rust/JS parity cases, 20 earlier native corner cases, six Rust unit tests,
TypeScript, and Rust formatting. Browser checks used an isolated port and test
data. The earlier plan also proposes detailed UI latency measurement, sustained
drag testing, specific shared-ACL undo/reload coverage, and late-error injection.
Those exact sequences and browser-wide p95 latency remain unmeasured.
