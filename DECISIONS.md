# Confirmed decisions and history

Recorded from this project conversation on 7 November 2026. This is a decision
record, not a verbatim chat archive. Latest explicit user instructions take
precedence. Keep confirmed decisions separate from proposed architecture.

## Product decisions

- Audience: students learning AWS through building and observing networks.
- Finish one working VPC version before EC2. An earlier mention of EC2-first was
  explicitly corrected by the user to VPC-first.
- Initial workspace: one VPC, multiple subnets. Multiple VPCs are out of scope.
- Include VPC, subnets, route tables, internet gateway, zonal public NAT gateway,
  Elastic IP, and custom NACLs. No real infrastructure provisioning is requested.
- Components are added from a draggable palette and configured in the right-side
  panel. New fields are blank, with examples shown as placeholders.
- Animated traffic was accepted as a preview feature that may be removed later.
  Keep its visibility toggle. Test endpoints can stand in for EC2 for now.
- Explain blocked/allowed request AND return traffic. NACLs are stateless.
- Undo retains only the last three workspace edits, grouping a drag or continuous
  field edit as one change. Reset view restores zoom, tilt and rotation without
  resetting the architecture.

## Design decisions

- Maintain the original pastel cards, rounded corners, Lucide icons, labels under
  components, dotted links/canvas, lavender VPC base and Internet badge.
- The user rejected the first WebGL block/tower redesign and the revised WebGL
  card styling, and requested rollback to the original CSS tiles.
- Functional fixes must preserve the accepted design. Do not call a redesign a
  bug fix. A real 3D implementation must match the accepted appearance.
- The long-term reference is the successfully viewed robotics reel at
  https://www.facebook.com/reel/2153278182227766 (description in PROJECT_CONTEXT.md).
  It informs the future goal; it does not authorize replacing the current design.
- NACLs should appear as a layer/boundary on the associated subnet only after
  explicit creation/association. Do not create a custom NACL by default. Avoid
  showing both an associated ACL tile and its boundary. Selecting the layer opens
  the ACL rules. The intended long-term hierarchy is VPC → subnet → resources,
  with the NACL at the subnet boundary.
- Horizontal rotation was confirmed fixed. The subsequent vertical-only reversal
  and label spacing changes still await visual/user confirmation.

## Workflow decisions

- The user prefers collecting numbered tickets, then fixing them together when
  explicitly requested. They later authorized implementing the collected backlog.
- This repository, /Users/saikiran/aws-simulator, is the development source.
  The original Documents/ChatGPT/AWS simulator/vpc-lab directory is historical.
- Run locally on the user's Mac. A remote lab is optional, not required. No remote
  host, credentials or connection has been configured or tested.
- Source and documentation were copied into the repository while preserving its
  existing README and Git metadata. Do not assume uncommitted files are backed up
  remotely or pushed to GitHub. That earlier documentation-only task did not authorize a commit/push; this was
  superseded by the explicit push request on 8 November 2026.

## Rust decision

- The user explicitly chose Rust after discussion of local execution and the reel.
- Historical: Rust migration was pending when the initial records were written.
  Superseded by the migration entry below. The UI remains React/TypeScript.
- Rust backend + React UI, Rust/WASM engine and Tauri desktop were discussed.
  None of these integration choices has been confirmed. A full Rust UI was only
  discussed as a possibility, not approved as a required rewrite.
- Rust does not itself determine visual fidelity or guarantee faster animations.
  Preserve functionality, workspace data and accepted appearance during migration.

## Continuity requirement (explicit user request)

The user wants project context and decisions retained across model changes and
new sessions without repeatedly resending the reel. Keep AGENTS.md,
PROJECT_CONTEXT.md, DECISIONS.md and BACKLOG.md current as work progresses.
Record new decisions, implementation changes, validation evidence and limitations.
No application implementation change was requested in this documentation turn.

## Implemented Rust migration (7 November 2026)
The user requested moving to Rust and checking feasibility. Implemented a native
Rust engine while preserving the UI. Selected a loopback HTTP integration as the
first practical migration, rather than a desktop UI rewrite. This integration was
an implementation choice under the user's migration request, not an earlier
explicit user choice of HTTP over Tauri/WASM. Validation and simulation now run
in Rust; the old JS model is retained for fixtures/parity checks. npm run dev
starts both processes. Installed official stable Rust 1.99.1 with rustfmt using
rustup without modifying shell configuration. Dependencies: serde_json, tiny_http.
Verified compilation, two unit tests, 21 parity cases, TypeScript and a real request
through the UI proxy. No benchmark or reel-equivalent rendering claim is made.

## Repository checkpoint (8 November 2026)
The user explicitly requested committing and pushing the accumulated simulator
work to the configured GitHub repository, origin/main. Include the React/CSS UI,
Rust engine, tests, tooling and persistent project records. Exclude node_modules,
Rust target artifacts, local environment files and runtime state via .gitignore.
Pre-commit checks: 17 JavaScript/control tests, 21 Rust/JS parity cases, 2 Rust
unit tests, Rust formatting and TypeScript all pass. Visual QA gaps in BACKLOG.md
remain open. Commit/push does not imply deploying the application.

## Example vs blank-workspace policy (8 November 2026)
The user requested all components in the example network as a student reference.
This supersedes omitting custom ACLs from the example only. Show associated ACL
reference cards alongside layers in example mode; keep custom-workspace layers
on explicit creation/association. Preserve saved configurations and original UI.
Increase typography responsively. Explain public IPv4 requirements independently
of route configuration; a route to an IGW does not allocate a workload address.

## Workspace zoom behavior (8 November 2026)
User requested zoom inside the work area affect only that area. Wheel/pinch
inside canvas now controls local scale independently of page zoom. Text scales
with cards, with bounded labels and collision-based decluttering instead of
allowing oversized text to merge. Repeated type captions are removed; secondary
details are hidden at compact zoom. Preserve existing card styling.

## Workspace drafts and screenshot corrections (8 November 2026)
The user reported losing custom work by switching example/start-empty. These
controls now switch independently persisted drafts. Clearing must be an explicit,
undoable action. Reload example is explicit to avoid overwriting saved positions.
Remove detached CSS depth faces and all text-background fills. Put reference NAT
and Elastic IP in the upper public zone. Add live subnet internet readiness via
the existing Rust simulation; explain missing routes/addressing/ACL requirements
and state the test's destination, protocol and limitations.

## Navigation clarity (8 November 2026)
User explicitly cancelled image background removal and requested simpler tabs.
Keep two persistent workspace choices with fixed names, move reset/clear commands
into a separate Actions disclosure, and retain independently saved workspaces.

## Test-only request (8 November 2026)
User asked the agent to execute the proposed VPC corner cases. Performed native
engine and isolated browser QA, retained the report and reusable runner, and made
no application implementation changes. Normal saved user workspace was untouched.

## Tougher QA request (14 November 2026)
User asked for adversarial corner cases beyond the prior passing suite. Prepared
a separate proposed test plan with independent expected outcomes; no execution
or application fixes authorized by this request. Multi-tab conflict detection and
100 ms interaction feedback are proposed acceptance criteria, not existing guarantees.

## Remove premature workload configuration (14 November 2026)
User requested fixes after questioning the endpoint checkbox. Separate subnet
network readiness from workload internet access. EC2 interface addressing belongs
to the future workload stage. For the VPC stage, use transparent synthetic probe
assumptions rather than an editable subnet-level workload flag. Retain stored
legacy data without changing public IP flags. This supersedes the earlier UI
checkbox and Open source endpoint settings guidance.

## Adversarial reliability (14 November 2026)
Use explicit conflict handling for competing tabs. A tab that detects new saved
data pauses its writes and retains its in-memory edits for export. Provide
explicit recovery from the saved version. Keep the visual workspace and add a
configuration selector for stacked or obscured components. A Rust exit after
startup leaves the development UI available for recovery.

## Service selection (14 November 2026)
The user requested an Apple application-style service picker before the VPC
editor. Use the Apple TV reference for the sidebar and shelves. VPC is the
available service. Keep both existing workspace choices and provide shortcuts
to them from the library.

The user requested simpler VPC artwork. Replace the dark rendered cover with
a light panel and a single network icon.

## Release candidate

The user requested the backlog fixes before recording and pushing a version.
Keep the existing pastel canvas and give the cards depth within the CSS scene.
Represent AZs explicitly and warn when the modeled zonal NAT is in a different
AZ. Keep the subnet probe conditional on its stated addressing assumptions.
Preserve legacy draft topology and use the example reset to load the updated
reference. The user owns versioning and the GitHub push.
