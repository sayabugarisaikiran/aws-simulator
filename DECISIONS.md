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
