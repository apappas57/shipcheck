import * as cheerio from "cheerio";

export type Status = "pass" | "warn" | "fail";
export type Category = "indexing" | "metadata" | "social" | "structure";

export interface CheckResult {
  id: string;
  label: string;
  status: Status;
  category: Category;
  detail: string; // what we found, human-readable
  fix?: string; // the exact fix (may include a code snippet)
}

export interface CheckInput {
  url: string; // normalized URL the user asked for
  finalUrl: string; // after redirects
  html: string;
  pageStatus: number;
  headers: Record<string, string>;
  robotsTxt: string | null;
  robotsStatus: number | null;
  sitemapXml: string | null;
  sitemapStatus: number | null;
  sitemapUrls: string[]; // <loc> entries parsed from sitemap
}

// ---------- helpers ----------
function norm(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    // drop trailing slash (except root) for comparison
    let p = x.pathname;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return (x.origin + p + x.search).toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}
function isAbsolute(u: string): boolean {
  return /^https?:\/\//i.test(u);
}
function isHomepage(u: string): boolean {
  try {
    const x = new URL(u);
    return x.pathname === "/" || x.pathname === "";
  } catch {
    return false;
  }
}

// ---------- the engine ----------
export function runChecks(input: CheckInput): CheckResult[] {
  const $ = cheerio.load(input.html);
  const results: CheckResult[] = [];
  const pageIsInner = !isHomepage(input.finalUrl);
  const origin = (() => {
    try {
      return new URL(input.finalUrl).origin;
    } catch {
      return "";
    }
  })();

  // ---- INDEXING: canonical (the cascade catcher) ----
  const canonical = $('link[rel="canonical"]').attr("href")?.trim();
  if (!canonical) {
    results.push({
      id: "canonical-present",
      label: "Canonical tag",
      status: "warn",
      category: "indexing",
      detail: "No <link rel=\"canonical\"> found. Google will guess the canonical, which can split ranking signals or index the wrong URL.",
      fix: 'In Next.js App Router, set it per-page:\n\nexport const metadata = {\n  alternates: { canonical: "https://yoursite.com/this-page" },\n};',
    });
  } else if (!isAbsolute(canonical)) {
    results.push({
      id: "canonical-absolute",
      label: "Canonical is absolute",
      status: "fail",
      category: "indexing",
      detail: `Canonical is relative ("${canonical}"). Relative canonicals are fragile and frequently ignored by crawlers.`,
      fix: `Use a full absolute URL: <link rel="canonical" href="${origin}${canonical.startsWith("/") ? canonical : "/" + canonical}" />`,
    });
  } else if (pageIsInner && isHomepage(canonical)) {
    // THE cascade bug: an inner page whose canonical points at the homepage
    results.push({
      id: "canonical-cascade",
      label: "Canonical cascade",
      status: "fail",
      category: "indexing",
      detail: `This inner page's canonical points at the homepage (${canonical}). Google will drop this page from the index and only keep the homepage. This is the #1 silent reason pages don't get indexed.`,
      fix: 'A root-layout metadata.alternates.canonical (or metadataBase without per-page overrides) cascades to every page. Set a self-referential canonical PER page:\n\n// app/some-page/page.tsx\nexport const metadata = {\n  alternates: { canonical: "/some-page" },\n};\n// with metadataBase set in app/layout.tsx:\n// export const metadata = { metadataBase: new URL("https://yoursite.com") }',
    });
  } else if (norm(canonical) !== norm(input.finalUrl)) {
    results.push({
      id: "canonical-self",
      label: "Self-referential canonical",
      status: "warn",
      category: "indexing",
      detail: `Canonical (${canonical}) does not match this page's URL (${input.finalUrl}). Intentional only if this page is a deliberate duplicate.`,
      fix: "Unless this page is intentionally a duplicate of another, the canonical should point to itself.",
    });
  } else {
    results.push({
      id: "canonical-ok",
      label: "Canonical",
      status: "pass",
      category: "indexing",
      detail: `Self-referential absolute canonical: ${canonical}`,
    });
  }

  // ---- INDEXING: robots noindex (meta + header) ----
  const robotsMeta = $('meta[name="robots"]').attr("content")?.toLowerCase() ?? "";
  const xRobots = (input.headers["x-robots-tag"] ?? "").toLowerCase();
  if (robotsMeta.includes("noindex") || xRobots.includes("noindex")) {
    results.push({
      id: "noindex",
      label: "noindex directive",
      status: "fail",
      category: "indexing",
      detail: `This page tells search engines NOT to index it (${robotsMeta.includes("noindex") ? '<meta name="robots" content="noindex">' : "X-Robots-Tag header"}). If that's unintentional, the page can never rank.`,
      fix: 'Remove the noindex. In Next.js: export const metadata = { robots: { index: true, follow: true } };',
    });
  } else {
    results.push({
      id: "noindex-ok",
      label: "Indexable",
      status: "pass",
      category: "indexing",
      detail: "No noindex directive. Page is indexable.",
    });
  }

  // ---- INDEXING: robots.txt ----
  if (input.robotsStatus === null || input.robotsStatus >= 400 || input.robotsTxt === null) {
    results.push({
      id: "robots-missing",
      label: "robots.txt",
      status: "warn",
      category: "indexing",
      detail: "No reachable /robots.txt. Not fatal, but you lose control over crawling and can't point crawlers at your sitemap.",
      fix: "Add app/robots.ts:\n\nexport default function robots() {\n  return { rules: { userAgent: '*', allow: '/' }, sitemap: 'https://yoursite.com/sitemap.xml' };\n}",
    });
  } else {
    const blocked = isPathBlocked(input.robotsTxt, input.finalUrl);
    if (blocked) {
      results.push({
        id: "robots-block",
        label: "robots.txt blocks this page",
        status: "fail",
        category: "indexing",
        detail: `robots.txt has a Disallow rule that blocks this page. Crawlers won't fetch it, so it won't be indexed.`,
        fix: "Remove or narrow the Disallow rule in app/robots.ts that matches this path.",
      });
    } else {
      const hasSitemap = /sitemap:/i.test(input.robotsTxt);
      results.push({
        id: "robots-ok",
        label: "robots.txt",
        status: hasSitemap ? "pass" : "warn",
        category: "indexing",
        detail: hasSitemap
          ? "robots.txt is present, allows this page, and references a sitemap."
          : "robots.txt allows this page but doesn't reference a sitemap.",
        fix: hasSitemap ? undefined : "Add a Sitemap: line to robots.txt so crawlers discover all your URLs.",
      });
    }
  }

  // ---- INDEXING: sitemap ----
  if (input.sitemapStatus === null || input.sitemapStatus >= 400 || input.sitemapXml === null) {
    results.push({
      id: "sitemap-missing",
      label: "sitemap.xml",
      status: "warn",
      category: "indexing",
      detail: "No reachable /sitemap.xml. Google can still crawl via links, but a sitemap speeds up discovery of new/deep pages.",
      fix: "Add app/sitemap.ts returning every public URL. Keep it in sync whenever you add a page.",
    });
  } else {
    const inSitemap = input.sitemapUrls.some((u) => norm(u) === norm(input.finalUrl));
    results.push({
      id: "sitemap-url",
      label: "URL in sitemap",
      status: inSitemap ? "pass" : "warn",
      category: "indexing",
      detail: inSitemap
        ? `This URL is listed in sitemap.xml (${input.sitemapUrls.length} URLs total).`
        : `This URL is NOT in sitemap.xml (${input.sitemapUrls.length} URLs listed). New pages often get missed here.`,
      fix: inSitemap ? undefined : "Add this route to app/sitemap.ts so Google discovers it.",
    });
  }

  // ---- METADATA: title ----
  const title = $("head > title").first().text().trim();
  if (!title) {
    results.push({ id: "title-missing", label: "Title tag", status: "fail", category: "metadata", detail: "No <title>. This is the single most important on-page SEO element.", fix: 'export const metadata = { title: "Clear, specific page title" };' });
  } else {
    const len = title.length;
    const brandParts = title.split(/[|\-–—·]/).map((s) => s.trim());
    const doubleBrand = brandParts.length >= 3 && new Set(brandParts).size < brandParts.length;
    if (len < 10 || len > 60 || doubleBrand) {
      results.push({
        id: "title-quality",
        label: "Title quality",
        status: "warn",
        category: "metadata",
        detail: `Title is ${len} chars${doubleBrand ? " and repeats the brand name" : len < 10 ? " (too short)" : " (too long, will truncate in search results)"}: "${title}"`,
        fix: "Aim for 10–60 chars, lead with the page's specific topic, brand once at the end. Set the brand template once in app/layout.tsx: title: { template: '%s | Brand', default: 'Brand' }.",
      });
    } else {
      results.push({ id: "title-ok", label: "Title", status: "pass", category: "metadata", detail: `"${title}" (${len} chars)` });
    }
  }

  // ---- METADATA: meta description ----
  const desc = $('meta[name="description"]').attr("content")?.trim();
  if (!desc) {
    results.push({ id: "desc-missing", label: "Meta description", status: "warn", category: "metadata", detail: "No meta description. Google will auto-generate a snippet, often poorly.", fix: 'export const metadata = { description: "A compelling 1–2 sentence summary (50–160 chars)." };' });
  } else if (desc.length < 50 || desc.length > 160) {
    results.push({ id: "desc-len", label: "Meta description length", status: "warn", category: "metadata", detail: `Description is ${desc.length} chars (ideal 50–160). ${desc.length < 50 ? "Too short to be useful." : "Will be truncated in search results."}`, fix: "Tighten to 50–160 chars." });
  } else {
    results.push({ id: "desc-ok", label: "Meta description", status: "pass", category: "metadata", detail: `${desc.length} chars` });
  }

  // ---- STRUCTURE: single h1 ----
  const h1s = $("h1");
  if (h1s.length === 0) {
    results.push({ id: "h1-missing", label: "H1 heading", status: "warn", category: "structure", detail: "No <h1> on the page. Search engines use it as a strong topic signal.", fix: "Add exactly one <h1> describing the page's main topic." });
  } else if (h1s.length > 1) {
    results.push({ id: "h1-multi", label: "Multiple H1s", status: "warn", category: "structure", detail: `${h1s.length} <h1> tags found. Use one primary H1 and <h2>/<h3> for subsections.`, fix: "Demote the extra H1s to H2/H3." });
  } else {
    results.push({ id: "h1-ok", label: "H1 heading", status: "pass", category: "structure", detail: `One H1: "${h1s.first().text().trim().slice(0, 80)}"` });
  }

  // ---- SOCIAL: Open Graph ----
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  const ogDesc = $('meta[property="og:description"]').attr("content")?.trim();
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim();
  if (!ogTitle || !ogDesc || !ogImage) {
    const missing = [!ogTitle && "og:title", !ogDesc && "og:description", !ogImage && "og:image"].filter(Boolean).join(", ");
    results.push({
      id: "og-missing",
      label: "Open Graph tags",
      status: "warn",
      category: "social",
      detail: `Missing ${missing}. Links to this page will look bare when shared on social/Slack/iMessage.`,
      fix: 'export const metadata = {\n  openGraph: { title: "...", description: "...", images: ["https://yoursite.com/og.png"] },\n};',
    });
  } else if (!isAbsolute(ogImage)) {
    results.push({
      id: "og-image-rel",
      label: "og:image is absolute",
      status: "fail",
      category: "social",
      detail: `og:image is a relative URL ("${ogImage}"). Social crawlers can't resolve relative image URLs, so the preview image will be blank.`,
      fix: `Use an absolute URL. With metadataBase set in app/layout.tsx, Next.js makes og images absolute automatically: metadataBase: new URL("${origin}")`,
    });
  } else {
    results.push({ id: "og-ok", label: "Open Graph", status: "pass", category: "social", detail: "og:title, og:description and an absolute og:image are all present." });
  }

  // ---- SOCIAL: Twitter card parity ----
  const twCard = $('meta[name="twitter:card"]').attr("content")?.trim();
  if (!twCard) {
    results.push({ id: "tw-missing", label: "Twitter card", status: "warn", category: "social", detail: "No twitter:card. X/Twitter will fall back to OG but a card type gives you control over the preview layout.", fix: 'openGraph plus: metadata.twitter = { card: "summary_large_image", title, description, images }' });
  } else {
    results.push({ id: "tw-ok", label: "Twitter card", status: "pass", category: "social", detail: `twitter:card = "${twCard}"` });
  }

  // ---- STRUCTURE: JSON-LD ----
  const jsonld = $('script[type="application/ld+json"]');
  results.push({
    id: "jsonld",
    label: "Structured data (JSON-LD)",
    status: jsonld.length > 0 ? "pass" : "warn",
    category: "structure",
    detail: jsonld.length > 0 ? `${jsonld.length} JSON-LD block(s) found (rich-result eligible).` : "No JSON-LD structured data. Adding it unlocks rich results (ratings, breadcrumbs, FAQ, etc).",
    fix: jsonld.length > 0 ? undefined : 'Add a <script type="application/ld+json"> with the appropriate schema.org type (Organization, Article, Product, LocalBusiness...).',
  });

  // ---- STRUCTURE: viewport + lang (quick mobile/i18n sanity) ----
  const viewport = $('meta[name="viewport"]').attr("content");
  const lang = $("html").attr("lang");
  if (!viewport || !lang) {
    const missing = [!viewport && "viewport meta", !lang && "<html lang>"].filter(Boolean).join(" and ");
    results.push({ id: "basics", label: "Mobile / lang basics", status: "warn", category: "structure", detail: `Missing ${missing}.`, fix: !lang ? "Set <html lang=\"en\"> in app/layout.tsx." : "Next.js adds a viewport by default; ensure it wasn't removed." });
  } else {
    results.push({ id: "basics-ok", label: "Mobile / lang basics", status: "pass", category: "structure", detail: `viewport set, lang="${lang}".` });
  }

  return results;
}

// crude-but-effective robots.txt Disallow matcher for the global user-agent
function isPathBlocked(robotsTxt: string, pageUrl: string): boolean {
  let path = "/";
  try {
    path = new URL(pageUrl).pathname || "/";
  } catch {
    return false;
  }
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  let appliesToAll = false;
  const disallows: string[] = [];
  for (const line of lines) {
    const ua = line.match(/^user-agent:\s*(.*)$/i);
    if (ua) {
      appliesToAll = ua[1].trim() === "*";
      continue;
    }
    if (!appliesToAll) continue;
    const dis = line.match(/^disallow:\s*(.*)$/i);
    if (dis) {
      const rule = dis[1].trim();
      if (rule) disallows.push(rule);
    }
  }
  return disallows.some((rule) => path.startsWith(rule));
}

export function score(results: CheckResult[]): { fails: number; warns: number; passes: number; grade: string } {
  const fails = results.filter((r) => r.status === "fail").length;
  const warns = results.filter((r) => r.status === "warn").length;
  const passes = results.filter((r) => r.status === "pass").length;
  const grade = fails > 0 ? "needs work" : warns > 2 ? "almost there" : "ship it";
  return { fails, warns, passes, grade };
}
