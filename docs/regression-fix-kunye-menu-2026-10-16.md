# Regression fix: masthead category menu

## Finding
The regression was real in the exact commit tested by the failed workflow. Run 38860467876 used commit `e195846eeafb31d84d38b30cfabca02e3627e9cb`; at that commit, `public/kunye/index.html` did not load `/kategori-menu.js`, and the regression gate correctly failed. The later canonical `main` snapshot includes `<script src="/kategori-menu.js?v=20261011-v4c" defer></script>` and the matching stylesheet, so the production source has since been corrected.

## Safe action
Do not weaken the regression checker. The missing script is fixed in the current canonical source; no additional production change is warranted from this historic failure alone. The workflow's failure remains historical and should not be mistaken for a current failure after the source fix.

## Validation evidence
- Failed run checked SHA: `e195846eeafb31d84d38b30cfabca02e3627e9cb`.
- `public/kunye/index.html` at that SHA did not include `/kategori-menu.js`.
- Current `main` page blob: `990e3ae60b5cbe0e511d285b0b557ff02bc8f2fd`, which includes the deferred menu script.
- Regression workflow run: https://github.com/BTmedyajans/Btmedya-db/actions/runs/38860467876
- Documentation PR validation passed before this correction; the updated branch validation is linked from PR #459.
