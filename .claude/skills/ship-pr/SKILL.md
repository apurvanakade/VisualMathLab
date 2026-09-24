---
name: ship-pr
description: Take a finished Visual Math Lab change all the way to the live site -- commit it on a branch, open a pull request into develop, triage Copilot's review, wait for pr-check.yml, merge, fast-forward main (which deploys), and clean up the worktree. Use when asked to commit, push, open a PR, ship, land, merge or release a change in this repository.
argument-hint: "[PR number]  (default: open a PR for the current worktree's changes)"
---

# Ship a change

A change reaches `develop` through a pull request, and `main` only by
fast-forwarding `develop`. Carry it through every step below without stopping
between them. Never pass `--auto` or `--admin` to `gh pr merge`, and never
merge a red PR.

## 0. Does it need a PR at all?

Run `git status` and `git diff` (staged and unstaged) and look at what is
actually there. Another session may already have committed and pushed it:
check `git log origin/develop -3` before doing anything.

A **trivial** change may be committed straight onto `develop` and pushed:
a typo or wording fix in prose, a comment, or an edit to repo-only docs
(`CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `.claude/**`). Stop after the
push.

Anything that touches an OJS cell, CSS, `_includes/`, `_theme/`, `js/`,
`_mathviz/`, `_extensions/`, `_quarto.yml` or `.github/` is **not** trivial,
however small. Carry on.

If a PR number was given, skip to step 2.

## 1. Branch, commit, open the PR

Work happens in a worktree, never by switching branches in the `develop`
folder (a checkout there makes its `quarto preview` re-render the whole site;
see CLAUDE.md's "Branches and preview"). `git worktree list` shows which
folder holds which branch.

- **Already in a feature worktree**: use it.
- **Uncommitted changes sitting in the `develop` folder**: move them to a new
  worktree, then clean `develop`:

  ```sh
  git stash push -u -m ship-pr
  git worktree add -b <prefix>/<slug> ../VisualMath-<slug> develop
  git -C ../VisualMath-<slug> stash pop
  ```

  Prefixes in use: `app/` for a page, `ci/` for workflows, `fix/`, `docs/`.

Before committing:

- If anything under `_mathviz/` changed, run `npm test` and
  `npm run build:mathviz`, and commit the rebuilt `_extensions/mathviz/` with
  it (`pr-check.yml` fails on a stale build).
- Don't run the full `npm run verify` crawl locally. `pr-check.yml` runs it.

Commit with a message that says what changed and why, then:

```sh
git push -u origin <branch>
gh pr create --base develop --title "..." --body "..."
```

The body says what changed and why, in a few sentences, and ends with the
attribution line from the system reminder.

## 2. Wait for Copilot's review

Copilot reviews a few minutes after a PR opens or a push lands. Poll
`gh pr view <N> --json reviews,reviewRequests` every minute or two, for up
to ~10 minutes. If nothing arrives, go on and say so in the final report.

## 3. Triage every comment

```sh
gh pr view <N> --comments
gh api repos/apurvanakade/VisualMathLab/pulls/<N>/comments   # inline
```

Copilot doesn't know CLAUDE.md. For each unresolved thread:

- **Valid**: fix it. If it points at `_extensions/mathviz/**`, fix the source
  in `_mathviz/src/**` and rebuild. Never edit the generated copy.
- **Contradicts a convention** (e.g. "use `.map()`", "remove the `text/plain`
  script type", "use `:first-child`", "add `toc: false`"): decline it.
- **Wrong or already handled**: decline it.

Reply to every thread with one line saying what was done or why not:

```sh
gh api repos/apurvanakade/VisualMathLab/pulls/<N>/comments/<id>/replies -f body="..."
```

Then resolve it (`resolveReviewThread` GraphQL mutation; get thread ids from
`pullRequest.reviewThreads`).

## 4. Push the fixes

Commit the fixes on the same branch and `git push`. The PR picks them up and
`pr-check.yml` re-runs. If the push brings a new Copilot review, go back to
step 2. Stop after two rounds and report whatever is still open.

## 5. Wait for CI

```sh
gh pr checks <N> --watch
```

If it fails, read the log (`gh run view <run-id> --log-failed`), fix, push,
and wait again. Don't duplicate the crawl locally.

## 6. Merge into develop

Only when every check is green and every thread has a reply:

```sh
gh pr merge <N> --merge
git -C <develop folder> pull
```

`--merge`, not `--squash`: it keeps the branch's history on `develop`.

## 7. Release: fast-forward main

Pushing `main` deploys the site (`publish.yml` → `gh-pages` → `deploy.yml`).

**If the PR changed `_mathviz/`**, bump the library first, or returning
visitors keep a cached stale bundle under the old version's path. Ask the
user for the new version (patch bump unless they say otherwise; the current
one is `version` in `_mathviz/package.json`), then:

```sh
gh workflow run release-mathviz.yml -f version=<x.y.z>
gh run watch <run-id>
git -C <develop folder> pull
```

Then, in the `develop` folder with its preview stopped:

```sh
git checkout main && git merge --ff-only develop && git push origin main && git checkout develop
```

Never squash-merge into `main`. If `--ff-only` is refused, the histories
have diverged: reconcile once with `git merge -s ours main` on `develop`,
push, and retry. Never force-push `main`.

## 8. Clean up

Stop the worktree's preview if one is running, then:

```sh
git worktree remove ../VisualMath-<slug>
git branch -d <branch>
git push origin --delete <branch>
```

## Report

Say what shipped: the PR link, the review comments fixed or declined (with
the reason), anything left open, the mathviz version if it was bumped, and
that `main` was pushed.
