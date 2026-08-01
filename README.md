# ShipCheck

ShipCheck is a web tool that takes a single URL and reports the indexing and metadata problems that stop a page appearing in Google search results. It is aimed at developers who want a quick pre-deploy sanity check on a page, particularly on Next.js App Router sites, where the suggested fixes are most directly useful.

Live: https://shipcheck-five.vercel.app

Paste a URL, get a 0 to 100 score and a list of checks. Each failing or warning check explains what was found and gives a suggested fix, usually as a snippet you can copy. There is no login and nothing to configure.

It was built after finding that only 5 of 98 pages across a set of sites were indexed, caused by a canonical tag set once in a root layout and inherited by every page below it. That specific case is the `canonical-cascade` check.

## What it checks

Fifteen checks run on every page. A sixteenth, hreflang, only appears when the page declares hreflang tags. Each check returns pass, warn or fail.

Indexing:

- Canonical tag. Reports it missing, relative rather than absolute, pointing at the homepage from an inner page (the cascade case), or not self-referential.
- `noindex` directives, read from both the robots meta tag and the `X-Robots-Tag` response header.
- robots.txt. Whether it is reachable, whether a `Disallow` rule in the `User-agent: *` group blocks this page, and whether it references a sitemap.
- sitemap.xml. Whether it is reachable and whether this URL is listed in it.
- HTTPS and mixed content. Whether the page is served over HTTPS, and whether any images, scripts, stylesheets, iframes or sources load over plain `http://`.

Metadata:

- Title tag. Missing, shorter than 10 characters, longer than 60, or repeating the brand name.
- Meta description. Missing, or outside the 50 to 160 character range.

Social:

- Open Graph. Whether `og:title`, `og:description` and `og:image` are present, and whether `og:image` is an absolute URL, since social crawlers cannot resolve relative ones.
- Twitter card. Whether `twitter:card` is declared.

Structure:

- H1. Missing, or more than one on the page.
- Heading order. Whether heading levels run sequentially or skip a level.
- Structured data. Whether JSON-LD blocks are present, parse as valid JSON, and declare an `@type`.
- Viewport meta tag and `<html lang>`.
- Image alt attributes, reported as coverage across the images on the page.
- Favicon link.

Conditional:

- hreflang. Only when hreflang tags are present. Checks the cluster includes an `x-default` and a self-reference.

## Scoring

Checks are weighted by category, because not all of them cost the same. Indexing counts 3, metadata and social count 2 each, structure counts 1. A pass earns the full weight, a warn earns half, a fail earns none. The score is the percentage of available weight earned, rounded.

The grade on top of the score is deliberately blunt. Any single fail forces "needs work" regardless of the number, since one real blocker is enough to keep a page out of the index. Otherwise 90 and above is "ship it" and 75 and above is "almost there".

## Running it locally

Requires Node and npm. No environment variables, API keys or accounts are needed.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

The other scripts are the Next.js defaults:

```bash
npm run build    # production build
npm start        # serve the production build
npm run lint     # eslint
```

There is no test suite.

## How it works

The browser posts a URL to `/api/check`. The server normalises it, adding `https://` if no scheme is given, then fetches the page following redirects, plus `/robots.txt` and `/sitemap.xml` from the same origin. If the sitemap is an index rather than a list of URLs, up to three sub-sitemaps are fetched to look for the page. The HTML is parsed with cheerio and run through the check functions in `src/lib/checks.ts`, which are pure functions over the fetched input. Results and the score come back as JSON and are rendered grouped by category, worst first.

Fetches time out after 12 seconds. Nothing is stored and there is no database.

## Limitations

Worth being clear about the scope. This is a small, single-purpose tool.

- It checks one page per run. It is not a crawler and will not walk a site.
- It reads the HTML as served. There is no headless browser and no JavaScript execution, so metadata injected on the client will not be seen. For most server-rendered and statically generated sites this is not an issue.
- It cannot tell you whether a page is actually indexed. It has no Search Console access, so it checks for the known causes rather than the outcome.
- It does not measure performance or Core Web Vitals, and the accessibility coverage is limited to alt attributes and heading order.
- The robots.txt matcher is a simple prefix match against the `User-agent: *` group. It does not implement wildcards, `$` anchors, `Allow` precedence, or user-agent specific rules.
- Sitemap index resolution stops after three sub-sitemaps, so a URL in a large sharded sitemap may be reported as missing when it is not.
- The URL must be publicly reachable. Pages behind auth, a VPN or preview protection cannot be fetched.
- The checks themselves are framework agnostic, but the suggested fixes are written as Next.js App Router code. On other stacks the diagnosis still holds, the snippet will not.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, cheerio for HTML parsing. Deployed on Vercel.
