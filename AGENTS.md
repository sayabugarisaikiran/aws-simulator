# AWS Simulator — persistent project instructions

Read `PROJECT_CONTEXT.md` and `BACKLOG.md` before planning or editing. Treat them
as the project handoff across chats, models, and context compactions. Verify
implementation status against source; do not treat old test results as current.

- Work in this repository: `/Users/saikiran/aws-simulator`. The copy under
  `/Users/saikiran/Documents/ChatGPT/AWS simulator/vpc-lab` is historical.
- The user chose Rust. The local validation/simulation engine is now native Rust.
  Preserve working behavior and saved workspaces when implementing it. The current integration is a local HTTP backend; Tauri and WebAssembly remain
  future options.
- Preserve the currently accepted pastel card UI. Do not replace it with towers,
  floating-label WebGL scenes, or a new layout while fixing functional issues.
- The long-term reel reference was successfully viewed. Use its recorded visual
  description; do not ask the user to resend it just because models changed.
  Request additional reference material only for specific details not recorded.
- Collect tickets when the user is reporting issues; implement when requested.
- Keep context and ticket status current after meaningful changes. State what
  was actually tested; do not mark visual issues verified based on unit tests.
- No subagent delegation unless the user asks for it.

## Required continuity updates

Read `DECISIONS.md` as well as the context and backlog before project work.
Before ending a meaningful work turn:
1. Update PROJECT_CONTEXT.md with the current architecture and implementation.
2. Record new or superseded user decisions in DECISIONS.md. Preserve useful
   history but make the current decision unambiguous.
3. Update BACKLOG.md with issue status, remaining work and actual verification.
4. Update RUNNING.md if startup, tooling, test commands or deployment changes.
Do this in the same turn as the work, including after a model switch or recovery
from an interruption. Do not depend on chat history or temporary files as the
sole record. Use repository code as the authority for implementation facts.
Never claim a check was run when only a historical result was read. Do not mark
an issue verified solely because the implementation was changed.
If a turn is only collecting a ticket or making a decision, record it without
implementing unrelated changes. This is the user's explicit ongoing preference.

- VPC-stage subnet settings must not ask for workload public-IP configuration.
  Use Rust's assess action for explicit route/NACL probe results, and state that
  actual workload access is not assessed until EC2/network interfaces are added.
  Never silently persist a probe's assumed public IP into the user's subnet.
