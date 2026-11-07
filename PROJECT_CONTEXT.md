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
- app/model.mjs: example fixtures and legacy JavaScript reference for parity tests.
  The live UI no longer imports its validate/simulate functions.
- scripts/dev-rust.mjs: starts Rust and UI together, with cleanup on shutdown.
- scripts/test-rust-parity.mjs: 21 Rust/JS behavioral comparisons.
- app/workspace-controls.mjs: drag-coordinate math and history.
- app/scene-layout.mjs: camera/layout experiment; page wraps cameraOrbit with -dy
  to reverse vertical independently of horizontal.
- app/globals.css: original styling plus targeted fixes.
- Browser localStorage key: vpc-lab-v1. Preserve existing user configurations.
- New example UI uses example(false): no custom ACLs. The example() fixture
  defaults to custom ACLs for existing tests. No custom ACL uses a modelled
  implicit AWS default allow ACL, explained in the traffic trace.
- Created NACLs gain a layer only when associated with a subnet. Associations are
  selectable in NACL settings and subnet settings. Associated ACL tiles are hidden.

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
