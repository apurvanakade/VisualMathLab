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
-- and tunes it, optionally, with a `mathviz:` block in _quarto.yml:
--
--   mathviz:
--     plotly: false            # don't load Plotly (pages draw with D3/canvas)
--     mathjs: "https://..."    # a different math.js build/version
--     css: false               # bring your own stylesheet
--     referrer: same-origin    # emit <meta name="referrer"> ahead of the CDN tags
--     fonts: true              # self-host Inter + JetBrains Mono (off by default)
--
-- and, each off by default, the site chrome a Quarto website or book built
-- on mathviz pages can take instead of writing its own:
--
--     sidebar-search: true         # a search box atop Quarto's sidebar that
--                                  # narrows the menu to matching titles
--     category-cloud: true         # a listing's category cloud above its
--                                  # cards, with an "All" entry (script
--                                  # only: the site styles the cloud)
--     embed: true                  # ?embed=1 shows a page's .vm-app alone,
--                                  # for another site's <iframe>
--     share:                       # "Share" button on every .vm-app; turns
--       site-url: https://...      #   embed on too. Links point here -- else
--       embed-docs: embed.html     #   at the site root as served, which is
--                                  #   wrong from a preview. embed-docs is an
--                                  #   optional page, relative to the root.
--                                  #   (A filter can't see website.site-url:
--                                  #   Quarto keeps project config out of a
--                                  #   page's metadata, so it is repeated.)
--     report-bug:                  # "Report bug" popup on text selection,
--       repo: owner/name           #   filing a GitHub issue that links the
--       branch: main               #   page's .qmd source (branch: main)
--
-- One page changes options with `mathviz-page:` in its front matter, never
-- with `mathviz:` there. Quarto merges a page's front matter over the
-- project's only for keys it knows; for any other key the page's value
-- replaces the project's whole map, so a page that sets
-- `mathviz: {category-cloud: true}` silently loses every option in
-- _quarto.yml (its referrer meta, fonts, sidebar search...). `mathviz-page:`
-- is a separate key, so both reach the filter, which lays the page's keys
-- over the project's one by one (a page key replaces the project's value
-- for that key, a map such as share: included):
--
--   ---
--   mathviz-page:
--     category-cloud: true     # this page also gets the cloud
--     plotly: false            # and no Plotly
--   ---
--
-- The optional Quarto theme is not an option here: a site opts in by listing
-- theme/mathviz-light.scss / mathviz-dark.scss under format.html.theme (see
-- the header comment in either file). fonts: true is its natural companion,
-- since the theme names those two faces, but either works without the other.
--
-- Keep VERSION in step with _extension.yml and package.json --
-- scripts/build.mjs refuses to build when the three disagree.
local VERSION    = "0.13.0"
local PLOTLY_URL = "https://cdn.plot.ly/plotly-2.35.2.min.js"
local MATHJS_URL = "https://cdn.jsdelivr.net/npm/mathjs@15.2.0/lib/browser/math.js"

-- The options in force on this page: the project's `mathviz:` map with the
-- page's `mathviz-page:` keys laid over it (see the header for why a page
-- can't use `mathviz:` itself). Either may be absent.
local function mergedOptions(meta)
  local opts = {}
  for _, source in ipairs({ meta.mathviz, meta["mathviz-page"] }) do
    if type(source) == "table" then
      for key, value in pairs(source) do opts[key] = value end
    end
  end
  return opts
end

-- Reads <key> from the options: false stays false, a string is
-- stringified, anything absent yields `default`.
local function option(opts, key, default)
  local value = opts[key]
  if value == nil then return default end
  if type(value) == "boolean" then return value end
  return pandoc.utils.stringify(value)
end

-- Reads <key>.<sub>, stringified, when <key> is a map
-- (`share: {site-url: ...}`); nil otherwise.
local function subOption(opts, key, sub)
  local value = opts[key]
  if value == nil or pandoc.utils.type(value) ~= "table" then return nil end
  if value[sub] == nil then return nil end
  return pandoc.utils.stringify(value[sub])
end

-- Whether <key> is set to anything but false: true, a string, or a map of
-- sub-options all switch a piece of chrome on.
local function enabled(opts, key)
  local value = opts[key]
  if value == nil or value == false then return false end
  return true
end

local function escapeAttr(text)
  return (text:gsub("&", "&amp;"):gsub('"', "&quot;"):gsub("<", "&lt;"))
end

local function scriptTag(value, defaultUrl)
  if value == false then return nil end
  local url = defaultUrl
  if type(value) == "string" and value ~= "" then url = value end
  return '<script src="' .. url .. '"></script>'
end

function Meta(meta)
  if not quarto.doc.is_format("html:js") then return nil end
  local opts = mergedOptions(meta)

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
  local referrer = option(opts, "referrer", nil)
  if referrer then
    headTag("mathviz-referrer", '<meta name="referrer" content="' .. referrer .. '">')
  end
  local mathjs = scriptTag(option(opts, "mathjs", true), MATHJS_URL)
  if mathjs then headTag("mathviz-mathjs", mathjs) end
  local plotly = scriptTag(option(opts, "plotly", true), PLOTLY_URL)
  if plotly then headTag("mathviz-plotly", plotly) end

  local dep = {
    name = "mathviz",
    version = VERSION,
    scripts = { "dist/mathviz.js" }
  }
  if option(opts, "css", true) ~= false then
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
  -- Opt-in site chrome (see the header). Each piece is a dependency of its
  -- own, so a site pays only for what it turns on, and passes its settings
  -- to its script as <meta name="mathviz:..."> tags -- one tag per
  -- dependency, for the injector bug described above -- so the scripts need
  -- no build-time templating. Their stylesheets land after Bootstrap's and
  -- Quarto's CSS and before a site's own css: files, the place these rules
  -- held when they lived in Visual Math Lab's styles.css.
  -- `scriptOnly` is for a piece the site styles itself (category-cloud),
  -- which ships no stylesheet.
  local function chrome(name, meta_tags, scriptOnly)
    local chromeDep = {
      name = "mathviz-" .. name,
      version = VERSION,
      scripts = { "chrome/" .. name .. ".js" }
    }
    if not scriptOnly then chromeDep.stylesheets = { "chrome/" .. name .. ".css" } end
    quarto.doc.add_html_dependency(chromeDep)
    for meta_name, content in pairs(meta_tags or {}) do
      if content ~= nil and content ~= "" then
        headTag("mathviz-" .. meta_name, '<meta name="mathviz:' .. meta_name .. '" content="' .. escapeAttr(content) .. '">')
      end
    end
  end

  if enabled(opts, "sidebar-search") then
    chrome("sidebar-search")
  end
  if enabled(opts, "category-cloud") then
    chrome("category-cloud", nil, true)
  end
  -- The Share dialog's snippet is an ?embed= URL, so share implies embed.
  if enabled(opts, "embed") or enabled(opts, "share") then
    chrome("embed")
  end
  if enabled(opts, "share") or enabled(opts, "report-bug") then
    quarto.doc.add_html_dependency({ name = "mathviz-chrome-site", version = VERSION, scripts = { "chrome/site.js" } })
  end
  if enabled(opts, "share") then
    chrome("share", {
      ["share-site-url"] = subOption(opts, "share", "site-url"),
      ["share-embed-docs"] = subOption(opts, "share", "embed-docs")
    })
  end
  if enabled(opts, "report-bug") then
    local repo = subOption(opts, "report-bug", "repo")
    if repo == nil then
      quarto.log.warning("mathviz: report-bug needs report-bug.repo (owner/name); skipping it")
    else
      chrome("report-bug", {
        ["report-bug-repo"] = repo,
        ["report-bug-branch"] = subOption(opts, "report-bug", "branch")
      })
    end
  end

  if option(opts, "fonts", false) == true then
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
