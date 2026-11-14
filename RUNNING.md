# Running AWS Simulator locally

This prototype runs on your computer. No AWS account or remote lab is required.

## Requirements

Use a standalone Node.js installation, version 22.13 or newer, with npm, and
a stable Rust toolchain (cargo/rustc). Rust was installed via official rustup at
~/.cargo/bin. The dev launcher finds that installation automatically. To use
cargo manually in a new terminal, run `source "$HOME/.cargo/env"`.
The runtime bundled inside the ChatGPT app cannot load this project's native
build dependencies on macOS. A temporary standalone runtime was downloaded to
`/private/tmp/node-v22.16.0-darwin-arm64` for the initial preview; this is not a
permanent Node installation.

## Start

```sh
cd /Users/saikiran/aws-simulator
npm ci
npm run dev
```

If dependencies are already present, skip `npm ci`. Open the Local URL printed
by the server, normally http://127.0.0.1:5173/. The launcher compiles/starts the Rust engine on
127.0.0.1:5180, waits for health, then starts the UI. First compilation needs
network access for Cargo dependencies. Use Ctrl+C to stop both processes.
If either port is already occupied by an older preview, stop that preview first.

For the temporary runtime used during setup:

```sh
cd /Users/saikiran/aws-simulator
export PATH="/private/tmp/node-v22.16.0-darwin-arm64/bin:$PATH"
npm run dev
```

## Checks

```sh
node --test app/model.test.mjs app/workspace-controls.test.mjs app/backlog.test.mjs app/workspace-drafts.test.mjs
npx tsc --noEmit
cargo test --manifest-path engine/Cargo.toml
cargo build --manifest-path engine/Cargo.toml
npm run test:parity
```

## Scope

Single-VPC IPv4/TCP learning prototype, with a CSS 3D workspace, editable
components, and optional outbound/return-path traffic simulation. No real
packets are sent and no AWS resources are created. Workspaces are saved in
browser local storage and can be exported as JSON. The current preview does
not model EC2, security groups, DNS, IPv6, or every AWS networking behavior.

The `.openai/hosting.json` file retains the existing private Sites project
identity. Local development does not require publishing to that service.

## Remote machine

The same source can run on a reachable SSH host with Node.js and npm installed.
Install dependencies on that host; do not copy macOS `node_modules` to Linux.
Use an SSH tunnel to access a preview bound to the remote loopback interface.

## Rust architecture
The UI calls /api/engine through the Vite development proxy. Rust performs all
live configuration validation and traffic simulation. There is no silent JS
fallback; an unavailable Rust engine is reported in the UI. For engine-only
operation use `npm run engine` (requires cargo on PATH). Health endpoint:
http://127.0.0.1:5180/health. The native executable also accepts JSON lines on
stdin with --stdio, used by parity tests. This is a local development setup;
production hosting and desktop packaging require additional integration.

Example network and My workspace now keep separate browser-saved drafts. Use
Actions → Restore example layout to apply the latest reference; use Actions →
Clear my workspace only
when you intend to empty your custom draft (undo is available).

Additional explicit Rust corner-case checks (build engine first):

```sh
node scripts/test-vpc-corner-cases.mjs
```

Results are printed to stdout and written to the OS temporary directory as
`vpc-corner-results.json`. Recorded QA: docs/testing/VPC_TEST_REPORT_2026-11-08.md.

The UI's assess action performs subnet-only route/NACL checks and reports
workload access as not assessed. Its synthetic IGW probe assumes public IPv4 for
a future workload without assigning it. The legacy simulate action still models
explicit endpoint publicIp for compatibility and historical parity tests. Rust
changes require rebuilding/restarting the engine; frontend hot reload alone does
not update a running Rust binary.

## Adversarial regression checks and recovery
```sh
cargo build --locked --manifest-path engine/Cargo.toml
npm run test:adversarial
```

If the Rust process exits after startup, the development UI stays up. Run
`npm run engine` in another terminal, then click **Retry engine** in the
workspace. The browser bounds individual engine calls to ten seconds.
If a save pauses, **Export my edits** preserves both current drafts. **Load
saved version** replaces the tab's working copy with the saved drafts.
Use **Retry save** after resolving a storage quota problem.

The local root URL opens the Service Library. Select **VPC** to resume the last
active draft, or use **Example network** or **My workspace** to open that draft
directly. The VPC editor is also available at `/vpc`.

Use the selector in a subnet's settings to assign AZ A or B. Existing drafts
without an assignment display **AZ unassigned**. **Actions → Restore example
layout** loads the updated example with a same-AZ NAT path.
