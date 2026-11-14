# VPC corner-case test report — 8 November 2026

## Scope and result
Executed the requested corner cases without changing application implementation.
All checked scenarios behaved as expected; no new functional failures observed.
This is bounded verification, not a claim that all possible configurations work.

## Automated execution

- Native Rust: 20/20 corner scenarios passed, checked against explicit expected
  results (not just compared to JavaScript). Details and actual responses are in
  `vpc-corner-results-2026-11-08.json`.
- Existing JavaScript/control/draft tests: 20/20 passed.
- Rust unit tests: 2/2 passed.
- Rust/JavaScript parity cases: 21/21 passed.
- Native Rust build, Rust format check, TypeScript noEmit: passed.

Native scenarios: successful baseline; empty VPC CIDR; invalid octet;
noncanonical VPC range; out-of-VPC subnet; partial subnet overlap; missing route
association; no internet route; detached gateway; missing public endpoint IP;
NAT without Elastic IP; lower-numbered ACL deny; inbound 443 not permitting
return port 55000; unrelated unfinished subnet isolation; deletion of gateway,
route table and ACL; default ACL without custom association; HTTPS allowed while
22 is denied; actual port-22 denial.

Deletion semantics: direct engine input with a dangling ACL reference is rejected.
The UI instead removes that association on ACL deletion and returns to the
modelled default ACL. Both paths were tested separately.

## Browser checks

Used a temporary checkout and preview at 127.0.0.1:5174. Port 5174 uses different
browser storage from the user's normal 5173 preview. No test edits were made to
that normal preview's stored configuration.

| Check | Observed result |
| --- | --- |
| Create custom VPC, switch to example and back | Name and CIDR preserved |
| Reload custom workspace | Name and CIDR preserved |
| Four component additions then undo | Three undos available; first added component remains; Undo disables |
| Very long gateway name at 40% zoom | Truncated/bounded; zero visible-label rectangle overlaps |
| 180% zoom, 104° rotation and top view | Zero visible-label rectangle overlaps; page scale remains 1 and header 76px |
| Reset view | Restores 80%, tilt 35°, rotation -16° |
| Delete associated internet gateway | Dependent route error appears, UI stays responsive; Undo restores |
| Delete associated public route table | Subnet association error appears; Undo restores |
| Delete associated public ACL | Subnet custom ACL field clears; implicit default model path allowed; no crash |
| Wheel over canvas | Workspace reaches 180%; page scale stays 1, header height 76px |
| Drag private subnet onto public subnet | Lower-priority labels hidden; zero visible-label rectangle overlaps |
| Browser console | No captured errors at end of checks |

Temporary browser tab closed after verification. Temporary server stopped at
teardown. The temporary files/storage are test data, not project source.

## Limits

- This does not verify live AWS connectivity, security groups, DNS or IPv6.
- Physical touch-device pinch, all responsive screen sizes and arbitrary tilt
  angles were not exhaustively tested. Wheel zoom and button-driven view changes
  were tested.
- Components may deliberately overlap if dragged together. The tested guarantee
  is label decluttering; it is not automatic separation of the cards.
- UI validation and readiness are asynchronous; results were checked after Rust
  responded, not during their initial loading state.

## Re-run

```sh
cargo build --locked --manifest-path engine/Cargo.toml
cargo test --locked --manifest-path engine/Cargo.toml
cargo fmt --manifest-path engine/Cargo.toml --check
node scripts/test-vpc-corner-cases.mjs
node --test app/model.test.mjs app/backlog.test.mjs app/workspace-controls.test.mjs app/workspace-drafts.test.mjs
node scripts/test-rust-parity.mjs
npx tsc --noEmit
```
