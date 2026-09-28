-- Copyright (c) 2026 Apurva Nakade. All rights reserved.
-- Released under Apache 2.0 license as described in the file LICENSE.
-- Authors: Apurva Nakade

-- Quarto filter that puts the mathviz bundle (dist/mathviz.js + .css) and its
-- two vendor scripts (math.js, Plotly) into every HTML page's <head>. A
-- project enables it with
--
--   filters:
--     - mathviz
--
-- and tunes it, optionally, with a `mathviz:` block in _quarto.yml or a
-- page's front matter:
--
--   mathviz:
--     plotly: false            # don't load Plotly (pages draw with D3/canvas)
--     mathjs: "https://..."    # a different math.js build/version
--     css: false               # bring your own stylesheet
--     referrer: same-origin    # emit <meta name="referrer"> ahead of the CDN tags
--     fonts: true              # self-host Inter + JetBrains Mono (off by default)
--     sidebar-rail: my-site-pin  # collapsible sidebar rail (off by default); a
--                                # string names the pin's localStorage key, true
--                                # uses "vm-sidebar-pinned"
--
-- The optional Quarto theme is not an option here: a site opts in by listing
-- theme/mathviz-light.scss / mathviz-dark.scss under format.html.theme (see
-- the header comment in either file). fonts: true is its natural companion,
-- since the theme names those two faces, but either works without the other.
--
-- Keep VERSION in step with _extension.yml and package.json --
-- scripts/build.mjs refuses to build when the three disagree.
local VERSION    = "0.1.7"
local PLOTLY_URL = "https://cdn.plot.ly/plotly-2.35.2.min.js"
local MATHJS_URL = "https://cdn.jsdelivr.net/npm/mathjs@15.2.0/lib/browser/math.js"

-- Reads mathviz.<key> from the metadata: false stays false, a string is
-- stringified, anything absent yields `default`.
local function option(meta, key, default)
  local opts = meta.mathviz
  if type(opts) ~= "table" then return default end
  local value = opts[key]
  if value == nil then return default end
  if type(value) == "boolean" then return value end
  return pandoc.utils.stringify(value)
end

local function scriptTag(value, defaultUrl)
  if value == false then return nil end
  local url = defaultUrl
  if type(value) == "string" and value ~= "" then url = value end
  return '<script src="' .. url .. '"></script>'
end

function Meta(meta)
  if not quarto.doc.is_format("html:js") then return nil end

  -- The vendor tags go in dependencies of their OWN, added before the bundle.
  -- Two things about Quarto's dependency handling force this: within one
  -- dependency the `scripts` entries are emitted before the `head` string,
  -- and quarto.doc.include_text("in-header", ...) lands in header-includes,
  -- which sits below the whole dependency block. Either route would load
  -- Plotly *after* mathviz.js, and plotly-fullscreen-button.js patches
  -- Plotly.newPlot the moment it runs. `scripts` can't hold a URL (Quarto
  -- copies each entry into site_libs), hence the raw <script> tags.
  --
  -- One tag per dependency, not one dependency holding all three: Quarto's
  -- injector (Quarto 1.7, domDependencyInjector.injectHtml) walks the parsed
  -- `head` string's live `children` collection while moving each node into
  -- <head>, so every second element is skipped -- with three tags in one
  -- string the middle one silently vanished from the page.
  local function headTag(name, html)
    quarto.doc.add_html_dependency({ name = name, version = VERSION, head = html })
  end
  local referrer = option(meta, "referrer", nil)
  if referrer then
    headTag("mathviz-referrer", '<meta name="referrer" content="' .. referrer .. '">')
  end
  local mathjs = scriptTag(option(meta, "mathjs", true), MATHJS_URL)
  if mathjs then headTag("mathviz-mathjs", mathjs) end
  local plotly = scriptTag(option(meta, "plotly", true), PLOTLY_URL)
  if plotly then headTag("mathviz-plotly", plotly) end

  local dep = {
    name = "mathviz",
    version = VERSION,
    scripts = { "dist/mathviz.js" }
  }
  if option(meta, "css", true) ~= false then
    dep.stylesheets = { "dist/mathviz.css" }
  end
  quarto.doc.add_html_dependency(dep)

  -- Opt-in, because a site with its own typography shouldn't carry ~400kB of
  -- font files it never loads. Self-hosted rather than a Google Fonts link:
  -- that request hands Google every visitor's IP address before any consent
  -- is asked for (see the header comment in fonts/fonts.css). fonts.css
  -- names each woff2 by bare file name, so the files have to land in the
  -- same folder as the stylesheet: Quarto copies a dependency's stylesheets
  -- and resources flat into site_libs/quarto-contrib/mathviz-fonts-<v>/,
  -- dropping the fonts/ prefix from each, which puts them side by side.
  -- Opt-in site chrome, for a Quarto website or book whose sidebar is
  -- `style: floating`: keeps it off-canvas at every width behind a slim
  -- always-visible rail (see chrome/sidebar-rail.js). The pin's storage key
  -- travels as a meta tag so the script needs no build-time templating.
  local rail = option(meta, "sidebar-rail", false)
  if rail ~= false then
    local dep = {
      name = "mathviz-sidebar-rail",
      version = VERSION,
      scripts = { "chrome/sidebar-rail.js" },
      stylesheets = { "chrome/sidebar-rail.css" }
    }
    if type(rail) == "string" and rail ~= "" then
      dep.head = '<meta name="mathviz:sidebar-pin-key" content="' .. rail .. '">'
    end
    quarto.doc.add_html_dependency(dep)
  end

  if option(meta, "fonts", false) == true then
    local resources = {}
    for _, name in ipairs(pandoc.system.list_directory(quarto.utils.resolve_path("fonts"))) do
      if name:match("%.woff2$") or name:match("^LICENSE") then
        table.insert(resources, "fonts/" .. name)
      end
    end
    table.sort(resources)
    quarto.doc.add_html_dependency({
      name = "mathviz-fonts",
      version = VERSION,
      stylesheets = { "fonts/fonts.css" },
      resources = resources
    })
  end
  return nil
end
