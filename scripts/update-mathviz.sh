#!/usr/bin/env bash
# Pulls the latest tagged release of the mathviz Quarto extension
# (https://github.com/apurvanakade/mathviz) into _extensions/.
#
# Runs as a pre-render hook (see _quarto.yml), so every `quarto render` and
# `quarto preview` builds against the newest mathviz. Offline, it keeps the
# copy already in _extensions/ and lets the build continue.
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

before="$(version)"
if [ -d "$DIR" ]; then
  log="$(quarto update extension "$EXT" --no-prompt 2>&1)"
else
  log="$(quarto add "$EXT" --no-prompt 2>&1)"
fi
status=$?
[ $status -ne 0 ] && printf '%s\n' "$log" >&2
[ $status -eq 0 ] && mkdir -p .quarto && touch "$STAMP"
after="$(version)"

if [ $status -ne 0 ]; then
  if [ -d "$DIR" ]; then
    echo "mathviz: update failed (offline?); building with v${before}." >&2
    exit 0
  fi
  echo "mathviz: could not install $EXT and no local copy exists." >&2
  exit 1
fi

if [ "$before" != "$after" ]; then
  echo "mathviz: v${before:-none} -> v${after}"
else
  echo "mathviz: v${after} (latest)"
fi
