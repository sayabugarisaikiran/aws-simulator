# Issue status

1. Validation wording — implemented: bare VPC reports only its CIDR check.
2. Rotation — horizontal confirmed by user. Vertical subsequently inverted;
   awaiting user confirmation. Keep horizontal unchanged.
3. Icon alignment — centred configuration-panel icon; implemented.
4. NACL layers — optional explicit creation/association, layer on associated
   subnet, no duplicate associated tile; implemented, latest visual QA pending.
   Do not add custom NACLs by default in blank/custom workspaces; the full example
   intentionally includes them as reference cards and layers. Saved existing NACLs are preserved.
5. True 3D — OPEN. CSS side faces provide depth, but the full engine is not active.
   Any future solution must preserve the accepted appearance.
6. Traffic appeared simultaneous — sequential active step; Pause/Resume/Next,
   only active connection highlights, prior checks collapsed. Implemented.
7. Text overlap — targeted label/zone/help spacing applied; visual QA pending.
8. Rust migration — native local HTTP validation/simulation engine implemented.
   Two Rust tests, 21 parity cases, TypeScript and live proxy integration passed.
   UI remains React/CSS. Desktop packaging/WASM, benchmarks and full visual QA
   are future work, not completed by this migration.

Do not claim all visual issues are resolved based only on passing model tests.

9. Full student reference example — implemented with all component types; blank
   workspace policy retained. Click Example network to load it explicitly.
10. Responsive fonts — larger rem-based minimums implemented; browser/zoom QA
    pending because attaching the existing browser tab failed.
11. Public IPv4 explanation — route/address distinction and a link to source
    endpoint settings implemented. Endpoint flag is never auto-enabled.
Latest UI checks: TypeScript and 17 JS/control tests pass.

12. Canvas-only wheel/pinch zoom — implemented and browser verified (80→180%,
    page scale unchanged); reset and zoom-out checked.
13. Overlapping labels — fixed slots, truncation, duplicate-caption removal,
    compact details and screen-space collision culling implemented. Zero visible
    label collisions in checked default/zoomed views. Extreme custom placements
    may hide lower-priority labels; titles/settings retain their full text.

14. Floating tilt bars — removed faulty card-side elements; browser verified absent.
15. Label fill — restored transparent backgrounds; browser computed style verified.
16. NAT placement — reference NAT/EIP now in upper Zone A; bounds regression test
    passes. Use Reload example to apply new positions to saved example layouts.
17. Custom-workspace loss on tab switch — separate drafts and legacy migration
    implemented; browser verified edits after switching and page reload.
18. Subnet internet readiness — live Rust-backed HTTPS/return-path check in VPC,
    gateway and subnet settings. Browser saw both complete example paths allowed.
Latest verification: TypeScript, 20 JS tests and 21 Rust/JS parity cases pass.

19. Confusing workspace tabs — simplified to Example network / My workspace;
    reset/clear moved to Actions, description clarifies saved drafts. Browser
    toolbar/popover check and TypeScript passed. No image/background edits.

## Corner-case QA run (8 November 2026)
All 20 native Rust corner cases, 20 JS tests, 21 parity cases and 2 Rust unit tests
passed. Browser verified draft switch/reload, undo limit, gateway/route/ACL
deletion, wheel isolation, reset and sampled long-label/overlap cases. No new
functional issues found in this scope. See docs/testing/VPC_TEST_REPORT_2026-11-08.md.
Physical-touch pinch, exhaustive viewport/tilt coverage and true 3D remain open.

20. Adversarial QA — 16 proposed cases saved in
    docs/testing/ADVERSARIAL_VPC_TEST_PLAN.md (14 November 2026). Not executed;
    no new defect claims. Prioritize false-allow and silent data-loss scenarios.

21. Misleading subnet endpoint checkbox — removed. Rust assess action separates
    route configuration, synthetic routing/NACL probe and workload-not-assessed
    status. No persisted addressing changes. Packet checks use this scope too.
    Browser verified statuses and absent checkbox; 6 Rust tests, 20 JS tests,
    21 parity cases, 20 legacy corner cases and TypeScript pass.
    Earlier endpoint-checkbox guidance (ticket 11) is superseded.

## Adversarial fixes (14 November 2026)
Implemented the validation, probe cancellation, save protection, engine
recovery, component selection and batched readiness fixes from item 20.
Native and browser results are recorded in
docs/testing/ADVERSARIAL_VPC_RESULTS_2026-11-14.md. Remaining verification includes
sustained drag latency, the exact ACL undo graph sequence and late-error injection.

## Service library (14 November 2026)
Implemented and verified on the local preview. Browser checks covered the
desktop sidebar, the compact layout, both workspace shortcuts, the Rust-backed
example readiness result and saving a custom edit when immediately returning to
the library.

Replaced the VPC cover with a light icon panel. The reported development
module error referenced the client navigation bundle, so the library and
workspace return now use native navigation. Verified the compact layout and
a browser round trip without console errors. TypeScript and 27 JS tests passed.

## Topology review
Reproduced a subnet named private using the public route table. The synthetic
probe passes with its assumed public IPv4, while the workload-style probe with
public IPv4 disabled stops at "Public IPv4 needed." The built-in example routes
its private subnet through NAT and an IGW. Removing the NAT Elastic IP blocks
that path. A missing subnet route table is reported explicitly in the simulator.
Pending improvements: show public/private routing and the public IPv4
requirement beside the probe result, make NAT subnet membership visually clear,
and model AZs explicitly before flagging cross-AZ NAT dependencies.

## Release candidate verification

- Topology review implemented. The probe identifies the associated table and
  public/private routing. Direct IGW success visibly requires assumed public
  IPv4. NAT placement follows its subnet association, and validation flags
  missing host subnets, IGW routes, and Elastic IPs. Subnets can be assigned AZ
  A or B. The NAT report warns of cross-AZ dependencies. Fresh reference
  workspaces use same-AZ NAT and separate public/private tables.
- Cards now render actual depth in the existing CSS 3D scene. Corrected card
  face and label alignment and added touch pinch handling. Browser checks
  covered tilt, rotation, and label collisions at 40% and 180% zoom. The
  editor fits the tested 320, 360, and 430 px viewports. A separate WebGL
  renderer remains outside this version. Physical touch and exhaustive
  viewport coverage have yet to be verified.
- Verified shared ACL reassignment, deletion, undo, workspace switch, and
  reload in an isolated browser. The late-error regression passed with an
  injected rejected fetch. Repeated browser drags with 200 components retained
  undo history and produced no console errors. The 197-subnet Rust batch took
  122 ms including process startup on this Mac. Browser input-to-paint
  percentiles remain unmeasured.
- Production build, TypeScript, 29 JS tests, seven Rust unit tests, 46 native
  adversarial assertions, 21 parity cases, and 20 native corner cases passed.
