#!/usr/bin/env bash
# Copyright (c) 2026 Apurva Nakade. All rights reserved.
# Released under Apache 2.0 license as described in the file LICENSE.
# Authors: Apurva Nakade

# Installs the latest tagged release of the mathviz Quarto extension
# (https://github.com/apurvanakade/mathviz) into _extensions/.
#
# Runs as a pre-render hook (see _quarto.yml), so every `quarto render` and
# `quarto preview` builds against the newest mathviz release. Offline, it
# keeps the copy already in _extensions/ and lets the build continue.
#
# The newest v* tag is looked up explicitly and passed as EXT@tag: a bare
# `quarto add owner/repo` installs whatever the default branch holds, which
# can be ahead of the last release.
set -u

EXT="apurvanakade/mathviz"
DIR="_extensions/apurvanakade/mathviz"

version() { sed -n 's/^version: *//p' "$DIR/_extension.yml" 2>/dev/null; }

# Full renders (`quarto render`) always check. Preview re-renders on every
# save, so there check at most once an hour.
STAMP=".quarto/mathviz-updated"
if [ -d "$DIR" ] && [ -z "${QUARTO_PROJECT_RENDER_ALL:-}" ] \
   && [ -n "$(find "$STAMP" -mmin -60 2>/dev/null)" ]; then
  exit 0
fi

if [ -d "_extensions/mathviz" ]; then
  echo "mathviz: _extensions/mathviz/ is a second copy (the starter's). Delete it; this hook manages $DIR." >&2
fi

before="$(version)"

tag="$(git ls-remote --tags --refs --sort=-v:refname "https://github.com/$EXT" 'v*' 2>/dev/null \
  | sed -n '1s|.*refs/tags/||p')"
if [ -z "$tag" ]; then
  if [ -d "$DIR" ]; then
    echo "mathviz: could not look up the latest release (offline?); building with v${before}." >&2
    exit 0
  fi
  echo "mathviz: could not look up the latest release of $EXT and no local copy exists." >&2
  exit 1
fi

if [ "v$before" = "$tag" ]; then
  mkdir -p .quarto && touch "$STAMP"
  echo "mathviz: v${before} (latest)"
  exit 0
fi

if [ -d "$DIR" ]; then
  log="$(quarto update extension "$EXT@$tag" --no-prompt 2>&1)"
else
  log="$(quarto add "$EXT@$tag" --no-prompt 2>&1)"
fi
status=$?
if [ $status -ne 0 ]; then
  printf '%s\n' "$log" >&2
  if [ -d "$DIR" ]; then
    echo "mathviz: update to $tag failed; building with v${before}." >&2
    exit 0
  fi
  echo "mathviz: could not install $EXT@$tag and no local copy exists." >&2
  exit 1
fi

mkdir -p .quarto && touch "$STAMP"
echo "mathviz: v${before:-none} -> v$(version)"
