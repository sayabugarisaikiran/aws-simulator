# Adversarial VPC test plan — 14 November 2026

The original plan follows. See ADVERSARIAL_VPC_RESULTS_2026-11-14.md for executed checks, fixes, and outstanding verification.
Run destructive/persistence tests in an isolated checkout and browser origin,
not the student's real saved workspace. Test the Rust engine independently of
JavaScript: agreement between implementations is not an AWS correctness oracle.

## P0: false permission and inconsistent routing

### A01: More-specific broken route must beat a working default
Working public subnet: 0.0.0.0/0 → attached IGW, public endpoint IP, permissive ACL.
Add 8.8.8.0/24 → a NAT gateway with no EIP. Test 8.8.8.8:443, then 1.1.1.1:443.
Expected: 8.8.8.8 fails through the selected NAT dependency; no fallback to IGW.
1.1.1.1 succeeds. Reordering routes must not change either result.

### A02: Conflicting duplicate route destinations
In a route table add 0.0.0.0/0 → IGW and 0.0.0.0/0 → NAT. Reverse their order.
Expected: reject conflicting duplicate destinations, never choose silently based
on insertion order. This is a validation requirement for the simulator.

### A03: NAT routing cycle
Point private routes at NAT-A; give NAT-A a subnet whose default route points
at NAT-A. Then try a two-NAT cycle. Expected: bounded evaluation, blocked result,
helpful cycle/dependency reason, no hang, recursion overflow or Allowed result.

### A04: Duplicate identities and wrong reference types (engine JSON)
Send duplicate node IDs with different types, two VPC objects, subnet.route
pointing to an ACL, or nat.eip pointing to a subnet. Expected: explicit invalid
configuration, no first-match ambiguity and no successful connectivity claim.

### A05: One public EIP reused by two zonal NAT gateways
Create two public NAT gateways sharing one EIP reference, with two private
subnets routed through them. Expected: reject invalid shared allocation under
this model's zonal public-NAT scope. Names do not establish resource identity.

## P0: state loss and stale results

### A06: Delayed success must not overwrite a new deny
Delay a simulation response, run an allowed path, then add an effective deny,
delete its gateway or switch workspaces before releasing the response.
Expected: no old success, old animation, selection or readiness state attached
to the new configuration. Repeat with late errors as well as late success.

### A07: Two browser tabs edit the same saved draft
Open two tabs on the same origin; edit different objects and refresh both.
Expected: no silent loss represented as safely saved. Synchronize, detect a
conflict, or clearly warn before overwriting. Current multi-tab support is not
established; this is a proposed product acceptance criterion.

### A08: Persistence fails or contains damaged data
Fill storage until quota is reached; edit and refresh. Separately test invalid
JSON and malformed nested drafts such as nodes:[null], duplicate IDs and an
unknown active mode. Expected: actionable save/recovery warning, no crash, no
silent overwrite of recoverable data. Existing export availability alone is not
a substitute for a clear failure state. Preserve original data while testing.

### A09: Undo must preserve a coherent resource graph
Associate ACL-A with two subnets. Reassign one to ACL-B, delete ACL-A, undo
its deletion, switch workspaces and reload. Expected: exact associations restored
for each saved draft, at most three undo steps and no accidental cross-draft undo.
Check export matches the visible configuration after every transition.

### A10: Rust service failure and recovery
Stop engine before validation; stop it during a request; restart it without
editing nodes. Also try a server that accepts a connection but never responds.
Expected: bounded waiting, no stale green result, UI remains interactive, clear
engine-unavailable state, and a discoverable retry/recovery path. A spinner that
never ends or a permanently disabled test button fails.

## P1: ACL correctness and validation

### A11: Broad low-numbered allow shadows a narrow deny
Outbound 50 ALLOW 0.0.0.0/0 TCP 0–65535; outbound 100 DENY 8.8.8.8/32 TCP 443.
Expected: request to 8.8.8.8:443 is allowed by 50. Swap the rule numbers: denied.
This catches a mistaken 'deny always wins' implementation. Keep return rules
permissive to isolate outbound precedence.

### A12: Return filtering must use the external host IP and destination port
Outbound permits 8.8.8.8:443. Inbound permits port 55000 only from 10.0.0.0/16.
Expected: return from 8.8.8.8 fails. Change inbound source to 8.8.8.8/32: succeeds.
The request's port 443 must not be reused as the response destination port.
The current endpoint/ephemeral-port model is fixed; do not assume OS realism.

### A13: Mutate a shared ACL, then reassign only one subnet
Two subnets share ACL-A; add a matching outbound deny. Expected: both affected
paths block. Reassign one subnet to permissive ACL-B: only that path recovers.
Edit/remove/undo a rule; verify readiness, trace, associations and layer selection
all reflect the same version. Selective path effects are expected for CIDR rules.

### A14: Malformed ACL rules and boundary values (UI + engine JSON)
Try duplicate rule numbers in the SAME direction; same number across opposite
directions; 0, 32767, 1.5; ports -1, 65536, 443.5, reversed ranges, blank fields;
direction 'sideways' and action 'permit'. Expected: reject malformed data; accept
same rule number across inbound/outbound because those are separate rule sets.
Unknown directions/actions must not be silently ignored by validation.

## P1: presentation and load

### A15: Decluttering must not make a resource impossible to select
Place two cards together. Give one a 200-character name; zoom 40%/180%, tilt near
maximum, rotate beyond a full turn, resize to narrow viewport and browser-zoom.
Expected: no text merging, no detached lines, selected item remains identifiable,
and each resource remains reachable through some accessible UI path. Merely
hiding all colliding labels is not sufficient if it makes the resource inaccessible.

### A16: Readiness amplification and interruption under load
Create 50, 100 and 200 components with many subnets sharing tables/ACLs. Type a
name continuously and drag a component while readiness is updating; switch
workspaces before requests finish. Expected: no crashes, state loss or stale
results. Measure UI latency, request counts, memory and engine recovery rather
than assuming Rust makes the UI fast. Suggested UX target: visible interaction
feedback within 100 ms; report hardware and measured percentiles.

## Independent expectations and limits

AWS references:
- Longest-prefix routing: https://docs.aws.amazon.com/vpc/latest/userguide/route-tables-priority.html
- NACL ordering, independent directions and stateless return checks:
  https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html

Treat unsupported functionality as explicitly unsupported, not as a passing
simulation. Do not demand IPv6, DNS or EC2/security-group behavior from the
current IPv4/TCP scope, but do reject or label such inputs clearly.
Prioritize A01, A02, A04, A06, A08 and A10. A false Allowed or silent loss of a
student's network is more serious than a cosmetic defect.
