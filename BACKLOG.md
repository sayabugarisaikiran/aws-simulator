# Issue status

1. Validation wording — implemented: bare VPC reports only its CIDR check.
2. Rotation — horizontal confirmed by user. Vertical subsequently inverted;
   awaiting user confirmation. Keep horizontal unchanged.
3. Icon alignment — centred configuration-panel icon; implemented.
4. NACL layers — optional explicit creation/association, layer on associated
   subnet, no duplicate associated tile; implemented, latest visual QA pending.
   Do not add custom NACLs by default. Saved existing NACLs are preserved.
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
