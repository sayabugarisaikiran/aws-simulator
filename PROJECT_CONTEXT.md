# AWS Simulator: canonical project context

## Objective and scope
Build an interactive AWS learning simulator for students. Finish a single VPC
with multiple subnets before adding EC2 or other service modules. Components:
VPC, subnet, route table, internet gateway, zonal public NAT gateway, Elastic IP,
and optional user-created custom Network ACLs. Selecting a component opens its
settings on the right. Newly added configuration fields start blank.
Traffic simulation is accepted as an optional toggle; it models one outbound
IPv4/TCP request and return path, with a test endpoint standing in for EC2.
No AWS infrastructure is created and no packets are sent.

## Technology decision
The user explicitly chose Rust. The existing implementation is React/TypeScript
with a native Rust simulation model in engine/. Migration of validation and
traffic simulation is implemented through a local HTTP engine. The React UI and
CSS rendering remain. Tauri packaging and WASM are still future options.
Do not assume Rust requires a visual redesign or guarantees faster rendering.

## Visual references
Primary, successfully viewed Facebook reel:
https://www.facebook.com/reel/2153278182227766
Observed: a robotics simulator attributed to Movez, with a light cream workspace,
detailed isometric hardware on a base plate, small component callouts, parts and
controls on the left, status readouts at upper right, compact bottom controls.
Separate observed frames show a robotics assembly and a Raspberry Pi board.
This is the long-term visual ambition, not a claim that the current UI matches it.
The entire reel's interactions/audio were not exhaustively inspected.

Earlier links, retained for history:
https://www.facebook.com/100083241103501/videos/1147056528002101/ (not viewed)
https://www.instagram.com/reel/DeznVNHtlSf/ (access restricted)
Do not require the user to supply these again for routine continuation.

## Current design constraint
The user rejected both the initial Three.js redesign and a revised version.
The accepted baseline is the original CSS tile workspace: pastel rounded cards,
Lucide icons, labels below cards, dotted connections/canvas, a lavender VPC floor,
Internet badge, left component palette and right configuration panel.
Keep this baseline while fixing issues. Real 3D matching the accepted appearance
remains open. `network-scene.tsx` contains an unused Three.js experiment;
`page.tsx` currently renders the CSS scene. Do not mount it as an automatic fix.

## Current implementation
- app/page.tsx: UI, editing, history (three snapshots), persistence and traffic playback.
- engine/src/lib.rs: live Rust CIDR, validation, ACL, route and traffic engine.
- engine/src/main.rs: loopback HTTP service (5180), plus JSON-lines --stdio mode.
- app/rust-engine.ts: frontend client; Vite proxies /api/engine to local Rust.
  The UI now uses assess (subnet-only probe), not the legacy simulate action.
- app/model.mjs: example fixtures and legacy JavaScript reference for parity tests.
  The live UI no longer imports its validate/simulate functions.
- scripts/dev-rust.mjs: starts Rust and UI together, with cleanup on shutdown.
- scripts/test-rust-parity.mjs: 21 Rust/JS behavioral comparisons.
- app/workspace-controls.mjs: drag-coordinate math and history.
- app/scene-layout.mjs: camera/layout experiment; page wraps cameraOrbit with -dy
  to reverse vertical independently of horizontal.
- app/globals.css: original styling plus targeted fixes.
- Browser localStorage key: vpc-lab-v1. Schema version 2 stores separate example
  and custom drafts with nodes, selection, source, undo history and view. Legacy
  single-workspace data migrates into its original mode. Preserve configurations.
- The user requested a full student reference example: UI now uses example(true),
  including custom ACL cards as well as their subnet layers in example mode.
  Custom/blank workspaces still create no custom ACLs automatically. Existing
  saved configurations are retained; click Example network to load the new fixture. No custom ACL uses a modelled
  implicit AWS default allow ACL, explained in the traffic trace.
- Created NACLs gain a layer only when associated with a subnet. Associations are
  selectable in NACL settings and subnet settings. Associated ACL tiles are hidden in custom mode; example mode shows all components.

## Running and verification
See RUNNING.md. Local dev: npm run dev, normally http://127.0.0.1:5173/.
Node >=22.13 required. A temporary standalone Node installation exists at
/private/tmp/node-v22.16.0-darwin-arm64/bin; it may disappear after cleanup/reboot.
The ChatGPT-bundled Node cannot load this project's native dependencies on macOS.
Latest migration verification: Rust compiled; 2 Rust unit tests and 21 Rust/JS
parity cases passed; TypeScript noEmit passed. Live frontend HTTP proxy to Rust
returned the expected successful 13-step private-subnet round trip. Existing 17
JS/control tests passed prior to migration; rerun as needed for changed inputs. This is historical evidence, not a guarantee for future edits.
Latest label spacing, vertical direction and NACL association UI still need
browser/user verification; existing browser tab attachment failed. Avoid opening
repeated duplicate preview tabs. Rust engine is now implemented and running locally. The user requested a GitHub checkpoint on 8 November 2026; inspect Git for
current commit/push status before acting. No remote machine is required.

## Persistent handoff files

All canonical project records live in this repository:
- AGENTS.md: mandatory startup and end-of-turn continuity instructions.
- PROJECT_CONTEXT.md: current scope, architecture, references and implementation.
- DECISIONS.md: confirmed decisions, superseded directions and history.
- BACKLOG.md: issues, pending migration work and verification gaps.
- RUNNING.md: local setup and checks.

The user explicitly requires these records to be updated as development progresses.
Earlier notes in Documents/ChatGPT/AWS simulator/PROJECT_BRIEF.md are historical
and contain superseded statements; prefer these consolidated repository records.
The parent workspace AGENTS.md points here for chats started in the old folder.
Documentation is included in the repository checkpoint requested on 8 November
2026. Check Git rather than assuming later changes have been pushed.

## Rust migration limitations
The current engine is a local development service, not a hosted Worker. The
Sites hosting metadata remains but a hosted deployment needs a separate backend
strategy. No performance improvement is claimed without benchmarks. The reel
visual goal and true-3D rendering remain separate open work. Browser visual QA
was not completed during this migration; the UI markup/styles were preserved.

## Latest checkpoint verification (8 November 2026)
17 JavaScript/control tests, 21 Rust/JS parity cases, 2 Rust unit tests, Rust
formatting and TypeScript passed again before the requested GitHub checkpoint.

## Student-reference improvements (8 November 2026)
Full example restored at user request. Larger rem-based responsive typography
and minimums applied across controls, settings, labels and traffic results.
Public-IP blocking result explains that the route was found and offers a button
to open source endpoint settings. Direct IPv4 internet access requires endpoint
public addressing as well as an IGW route; do not auto-enable the endpoint flag.
TypeScript and 17 JS/control tests passed for this UI change. No Rust engine logic
changed. Existing browser-tab attachment still fails; typography/zoom layout QA
is pending. These new changes have not been committed/pushed.

## Isolated canvas zoom and label placement (8 November 2026)
Native non-passive wheel listener on the canvas handles scroll/pinch locally;
page/browser zoom outside stays untouched. Workspace range is 40–180%. Labels
use fixed slots, ellipsis, hidden duplicate type captions and compact detail below
70%. A layout effect measures projected rectangles after view/layout changes and
hides lower-priority colliding labels. Full names remain in titles/settings.
Browser verified scroll changed workspace from 80% to 180%, page viewport scale
remained 1 and header height 76px; zero visible-label collisions at checked views.
Reset returned to 80%, zoom-out to 60% activated compact mode. Temporary QA tab
closed. TypeScript passed. No Rust logic changed; no commit/push this turn.

## Five screenshot fixes (8 November 2026)
Removed the CSS card-side elements responsible for floating bars on tilt; restored
transparent label backgrounds. Example NAT/EIP moved to upper Zone A; subnets
and routes spaced below within expanded zone bounds. Existing saved node
positions are preserved; Reload example explicitly loads the new reference layout.
Example and custom tabs now restore independent drafts rather than clearing
them; Clear workspace is separate and undoable. Drafts persist across reloads.
app/workspace-drafts.mjs contains migration/save helpers; regression tests cover
switching, reload serialization, legacy migration and upper-zone NAT/EIP bounds.
Configuration panels for VPC/IGW/subnet show live Rust-backed outbound IPv4 HTTPS
readiness against 1.1.1.1:443 including response. This is a model check, not a real
internet probe or an all-destinations/security-groups/DNS guarantee.
Verified: TypeScript, 20 JS/control/draft tests and 21 Rust/JS parity cases pass.
Browser: custom named VPC survived example→custom and reload; QA additions were
undone. Zero card-side elements; computed label background transparent. Readiness
returned Allowed in model for both complete example subnets. Temporary tab closed.
Changes remain local/uncommitted.

## Simplified workspace navigation (8 November 2026)
The user cancelled image background removal; no image edit was performed.
Workspace toolbar now has exactly two stable choices: Example network and My
workspace. Start empty no longer changes names; switching retains saved drafts.
Restore example layout and Clear my workspace are separate Actions-menu items,
with Undo guidance. A short sentence explains each workspace and saved changes.
Browser verified the two-choice toolbar and Actions popover; temporary QA tab
closed. TypeScript passed. Existing card/canvas background remains unchanged.

## Requested corner-case execution (8 November 2026)
Executed tests only; no application behavior changes. 20 native Rust corner
scenarios, 20 existing JS/control tests, 21 parity cases and 2 Rust unit tests pass.
Build, format check and TypeScript pass. Browser tested persistence across switch
and reload, three-undo limit, long labels at 40/180% and rotated/top view, reset,
associated-resource deletion, default-ACL fallback, canvas wheel isolation and
intentional overlapping component placement. No new functional failures observed.
Full evidence: docs/testing/VPC_TEST_REPORT_2026-11-08.md and JSON results. Reusable
runner: scripts/test-vpc-corner-cases.mjs. Browser test used an isolated temporary
checkout/port 5174 to preserve the user's port-5173 workspace. No physical-touch
pinch or exhaustive responsive/tilt coverage claim. No commit/push this turn.

## Adversarial QA plan (14 November 2026)
User requested tougher challenge cases. Saved 16 proposed tests in
docs/testing/ADVERSARIAL_VPC_TEST_PLAN.md, focused on false allows, conflicting
routes/identities, invalid ACL input, shared-resource propagation, stale responses,
state-loss and service recovery. These tests have NOT been executed; source risks
are not confirmed defects. No implementation changes were made.

## Local preview restart (14 November 2026)
User requested opening the app for manual testing. Rust engine on port 5180 was
already running; UI server was stopped and the temporary Node runtime had been
cleaned up. Restored official Node 22.16.0 under /private/tmp and started the UI
on 127.0.0.1:5173. Verified UI HTTP 200 and successful Rust validation through
/api/engine. No application code or saved workspace changes. Temporary runtime
may need restoration after future cleanup.

## Subnet vs workload correction (14 November 2026)
Removed the test-endpoint public-IP checkbox and its action link from subnet
settings. Rust assess returns separate Internet route configured/not configured,
routing/NACL probe passed/blocked, and workload access not assessed statuses.
Route checks ignore ACL/workload status; synthetic network probes explicitly
assume future public IPv4 for direct IGW and private addressing for NAT. Probe
assumptions are visible in the UI, and temporary cloned input never persists
publicIp=true. Existing saved fields and legacy simulate API remain compatible.
UI packet animation also uses assess steps; success says Subnet network checks
passed, never promises actual EC2 access. Design/layout preserved.
Verified: 6 Rust tests (4 new), 20 JS tests, 21 parity cases, 20 native legacy
corner cases and TypeScript passed. Browser confirmed 0 endpoint checkboxes and
separate Configured/Passed/Not assessed statuses. Rust engine restarted on 5180.
Records updated; changes are local, not committed/pushed.

## Adversarial validation and recovery (14 November 2026)
Rust rejects ambiguous resources, conflicting route destinations, malformed ACL
rules and reused NAT Elastic IPs. NAT cycles and NAT chains block with a clear
message. Subnet readiness is a debounced assess_all request and excludes canvas
position and name changes as triggers. Probe requests have a ten-second deadline
and cancel when the active network or probe inputs change. Saving uses a Web
Lock where supported, compares the prior stored value, and pauses with export
and recovery actions on conflict, quota failure or corrupt data. The
configuration selector reaches components obscured on the canvas.
See docs/testing/ADVERSARIAL_VPC_RESULTS_2026-11-14.md for verification and limits.

## Service library (14 November 2026)
The local home page is an Apple TV-inspired service library with a sidebar,
featured VPC artwork and shortcuts for the example and custom workspaces.
The existing editor is at /vpc. Opening VPC normally resumes the last active
draft. The query parameter workspace explicitly selects example or custom.
All services returns to the library and saves pending edits before leaving.

The VPC feature now uses a single network icon on a pale panel. Library links
use ordinary page navigation. Returning from VPC still saves pending edits
before leaving.

The simulator derives probe routing from explicit route table associations and
does not emulate the AWS main route table fallback. Canvas coordinates are
visual only. The AZ outlines do not currently affect Rust routing or resilience
checks. The built-in example has separate public and private route tables and
a zonal public NAT associated with the public subnet and an Elastic IP.

## Release candidate topology and canvas

The Rust assessment returns the subnet's route table and routing classification,
whether the chosen route needs a public IPv4, and the NAT host and AZ relation
when applicable. Explicit AZ A/B settings constrain subnet placement.
Associated zonal public NATs appear inside their host subnet cards and inherit
the host's AZ. Older saved subnets without an AZ remain unassigned. The built-in
example places its NAT and private workload subnet in AZ A. Restore the example
from Actions to apply that reference to an older saved example.
The canvas uses rounded CSS depth layers, touch pinch zoom, and projected
label bounds. Release verification and its limits are recorded in BACKLOG.md.
