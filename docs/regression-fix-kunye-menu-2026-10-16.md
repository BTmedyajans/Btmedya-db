# Regression fix: masthead category menu

## Finding
The regression gate in `tools/gerileme-denetimi.mjs` checks that `public/kunye/index.html` loads `/kategori-menu.js`. The current `main` copy already includes `<script src="/kategori-menu.js?v=20261011-v4c" defer></script>` near the end of the document, and the current menu stylesheet is linked in the document head. The failing run at 2026-10-16 06:18 UTC therefore appears inconsistent with the current canonical file snapshot and should be rerun against the exact workflow checkout before changing the checker.

## Safe action
No production HTML or regression test was changed based on contradictory evidence. Re-run the failing media-list workflow after confirming the checkout SHA and gate source. If the workflow still fails, inspect the full current gate logic for a stale/branch-specific predicate and update it in a scoped PR.

## Validation evidence
- `public/kunye/index.html` on `main` blob: `990e3ae60b5cbe0e511d285b0b557ff02bc8f2fd`
- The file includes `/kategori-menu.js?v=20261011-v4c` with `defer`.
- Failed run: https://github.com/BTmedyajans/Btmedya-db/actions/runs/38860467876
