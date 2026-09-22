`src/`, `scripts/build.mjs`, `scripts/load-vm.mjs`, `package.json` and
`_extensions/mathviz/{_extension.yml,mathviz.lua}` on this branch are
**mirrored** from [VisualMathLab](https://github.com/apurvanakade/VisualMathLab)'s
`_mathviz/` folder, which is where they are authored. Edits to them here will be
overwritten by the next sync.

`docs/`, `starter/` and this repository's own chrome are still authored here —
and this branch is where they get written.

**If CI is failing on `docs-coverage`,** a new `VM.*` member has landed without an
entry in `docs/reference/`. Add its `### VM.<category>.<name>` heading (with the
prose, parameter table and demo the other entries carry) on this branch, and
auto-merge will take it from there.

Updated automatically on every push to VisualMathLab's `develop`.
