# ShipCheck launch kit

Live: https://shipcheck-five.vercel.app
Voice: @apappasdev, builder, plain, no hype, no em dashes.

## Main tweet (X)

I ran my own client sites through Google.

5 of 98 pages were indexed.

the cause: one canonical tag in a root layout, cascading to every page, telling Google "the homepage is the real version of this" 98 times over.

so I built ShipCheck. paste a URL, it catches that (and 14 other indexing/meta bugs) before you deploy, and gives you the exact Next.js fix.

free, no login:
shipcheck-five.vercel.app

## Thread

2/ the checks that actually keep pages out of Google:
- canonical cascades + relative canonicals
- silent noindex (meta or header)
- robots.txt quietly blocking the page
- the URL missing from your sitemap
- og:image that's relative, so the link preview is blank
- mixed content, heading order, alt coverage, invalid JSON-LD

every one tells you the fix, not just the problem.

3/ it's Next.js App Router specific on purpose. that's where these bugs hide: metadataBase, alternates.canonical, the root-layout trap.

and yeah, it scores 100/100 on itself.

go run a page you think is fine. you might be surprised:
shipcheck-five.vercel.app

## r/nextjs + IndieHackers "Show" variant

Show: ShipCheck, a free pre-deploy SEO checker for Next.js

I found only 5 of my 98 client pages were indexed by Google. Traced it to a root-layout canonical cascading to every page (every inner page was telling Google the homepage was its canonical).

Built a free tool that catches that plus 14 other indexing/metadata bugs before you ship, each with the exact Next.js fix. No login, paste a URL, get a 0-100 score.

Would genuinely love feedback on the check set: https://shipcheck-five.vercel.app

## The real distribution move (per the twitter-content-quality rule)

The cold post is fine, but the higher-leverage play is REPLIES. Search X / r/nextjs for live threads where someone is debugging "why isn't my Next.js page showing in Google / indexed / in search results" and reply up-chain with "built a thing for exactly this" + the URL + the one-line canonical-cascade insight. You are answering a question someone is actively asking, which converts far better than a broadcast.

## Positioning (if anyone compares it to SEMrush/Ahrefs)

"SEMrush gives marketers a score and a subscription. ShipCheck gives developers the exact line of code to fix, free, before they deploy." Different tool, different moment. Not trying to be a platform.
