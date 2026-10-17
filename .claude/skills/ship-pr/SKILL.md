---
name: ship-pr
description: Take a finished Visual Math Lab change all the way to the live site -- commit it on a branch, open a pull request into develop, triage Copilot's review (or a local maintainer agent's, when Copilot is out of credits), wait for pr-check.yml, merge, fast-forward main (which deploys), and clean up the worktree. Use when asked to commit, push, open a PR, ship, land, merge or release a change in this repository.
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

Anything that touches an OJS cell, CSS, `_includes/`,
`_extensions/`, `_quarto.yml` or `.github/` is **not** trivial,
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

- `_extensions/apurvanakade/mathviz/` is the installed mathviz release. If
  it changed, it must be a release (`scripts/update-mathviz.sh`), never a
  local build or a hand edit; library changes are pull requests to
  apurvanakade/mathviz.
- Don't run the full `npm run verify` crawl locally. `pr-check.yml` runs it.

Commit with a message that says what changed and why, then:

```sh
git push -u origin <branch>
gh pr create --base develop --title "..." --body "..."
```

The body says what changed and why, in a few sentences, and ends with the
attribution line from the system reminder.

## 2. Wait for Copilot's review

Copilot reviews once, a few minutes after the PR opens. It does not
re-review later pushes. Poll `gh pr view <N> --json reviews,reviewRequests`
every minute or two. Its first review is a gate for the merge: if it hasn't
arrived after ~30 minutes, ask the user rather than merging without it.
GitHub ignores a review request on a merged PR, so a missed review can't be
had afterwards.

### 2b. Copilot out of credits: a local maintainer review instead

When Copilot's quota runs out it still posts a review, with no findings and
this body: *"Copilot was unable to review this pull request because the user
who requested the review has reached their quota limit."* Check for it:

```sh
gh pr view <N> --json reviews \
  -q '.reviews[] | select(.author.login | startswith("copilot")) | .body' \
  | grep -i "unable to review"
```

If it matches, Copilot's review isn't coming. Don't wait out the 30 minutes
and don't ask the user: run a local review in its place, which then stands in
as the merge gate.

1. Spawn a fresh `general-purpose` agent (the Agent tool, not a fork, so it
   starts without this session's context) with the prompt in
   [maintainer-review.md](maintainer-review.md), filling in the PR number and
   the PR's worktree path. Add nothing about the change: the point is a
   reviewer who knows the codebase but not the reasoning behind this work, the
   way a maintainer reading the PR cold would. Run it in the foreground; the
   next step needs its answer.
2. Post its findings on the PR as one review, so they become threads the same
   as Copilot's would. Write the payload to the scratchpad and send it:

   ```sh
   gh api repos/apurvanakade/VisualMathLab/pulls/<N>/reviews --input review.json
   ```

   with `{"event": "COMMENT", "body": "Local maintainer review (Copilot out of credits).\n\n<VERDICT line>", "comments": [{"path": ..., "line": ..., "side": "RIGHT", "body": "**<severity>**: <comment>"}, ...]}`.
   A finding whose line isn't part of the diff can't be an inline comment
   (the API rejects the whole review); put it in `body` instead, as
   `` `path:line` -- comment ``. With no findings, post the verdict alone.
   A body finding has no thread to reply to or resolve, so step 3 must still
   fix or decline it and answer it with one PR comment
   (`gh pr comment <N> --body ...`) covering every body finding.
3. Go on to step 3 and triage these threads exactly like Copilot's. The agent
   read CLAUDE.md, so a finding that contradicts it is rarer than with Copilot,
   but it can still be wrong: check each one against the code.

## 3. Triage every comment

```sh
gh pr view <N> --comments
gh api repos/apurvanakade/VisualMathLab/pulls/<N>/comments   # inline
```

Copilot doesn't know CLAUDE.md. For each unresolved thread:

- **Valid**: fix it. If it points at `_extensions/apurvanakade/mathviz/**`,
  it belongs in apurvanakade/mathviz: tell the user rather than editing the
  installed copy.
- **Contradicts a convention** (e.g. "move the examples back into the `.qmd`", "remove the `text/plain`
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
`pr-check.yml` re-runs. Don't wait for Copilot to review the fixes; it
won't. Go on to CI.

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

Pushing `main` deploys the site (`publish.yml` → `gh-pages` → GitHub's built-in Pages build).

In the `develop` folder with its preview stopped:

```sh
git checkout main && git merge --ff-only develop && git push origin main && git checkout develop
```

Never squash-merge into `main`. If `--ff-only` is refused, the histories
have diverged: reconcile once with `git merge -s ours main` on `develop`,
push, and retry. Never force-push `main`.

## 8. Clean up

Stop the worktree's preview if one is running, then:

```sh
git worktree remove --force ../VisualMath-<slug>
git branch -d <branch>
git push origin --delete <branch>
```

`--force` is the default here: by this point the branch is merged, so the
only things left in the folder are untracked build output (`docs/`,
`.quarto/`) and a `node_modules` install or symlink, which a plain `remove`
refuses to delete. Check `git -C ../VisualMath-<slug> status --short` first
and stop if it lists a modified tracked file -- that is unmerged work.

## Report

Say what shipped: the PR link, who reviewed it (Copilot or the local
maintainer agent), the review comments fixed or declined (with the reason),
anything left open, and
that `main` was pushed.
