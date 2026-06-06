import { NextRequest, NextResponse } from "next/server";
import { runChecks, score, type CheckInput } from "@/lib/checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 ShipCheck/1.0";
const TIMEOUT_MS = 12000;

function normalizeUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchText(
  url: string,
): Promise<{ text: string; status: number; finalUrl: string; headers: Record<string, string> } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
    });
    const text = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));
    return { text, status: res.status, finalUrl: res.url || url, headers };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function parseSitemapLocs(xml: string): { locs: string[]; subSitemaps: string[] } {
  const all = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
  const isIndex = /<sitemapindex/i.test(xml);
  if (isIndex) return { locs: [], subSitemaps: all };
  return { locs: all, subSitemaps: [] };
}

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = normalizeUrl(body.url ?? "");
  if (!url) {
    return NextResponse.json(
      { error: "Enter a valid http(s) URL (e.g. yoursite.com/page)." },
      { status: 400 },
    );
  }

  const page = await fetchText(url);
  if (!page) {
    return NextResponse.json(
      { error: "Couldn't reach that URL. Check it's public and try again." },
      { status: 502 },
    );
  }
  if (page.status >= 400) {
    return NextResponse.json(
      { error: `That URL returned HTTP ${page.status}. Check the address.` },
      { status: 502 },
    );
  }
  if (!/<html|<!doctype html/i.test(page.text)) {
    return NextResponse.json(
      { error: "That URL didn't return an HTML page (got something else)." },
      { status: 502 },
    );
  }

  const origin = new URL(page.finalUrl).origin;

  // robots.txt + sitemap.xml in parallel
  const [robots, sitemap] = await Promise.all([
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/sitemap.xml`),
  ]);

  let sitemapUrls: string[] = [];
  let sitemapXml: string | null = null;
  let sitemapStatus: number | null = null;
  if (sitemap && sitemap.status < 400) {
    sitemapXml = sitemap.text;
    sitemapStatus = sitemap.status;
    const { locs, subSitemaps } = parseSitemapLocs(sitemap.text);
    sitemapUrls = locs;
    // shallow-resolve a sitemap index: fetch up to 3 sub-sitemaps to find the page
    if (locs.length === 0 && subSitemaps.length > 0) {
      const subs = await Promise.all(subSitemaps.slice(0, 3).map((s) => fetchText(s)));
      for (const sub of subs) {
        if (sub && sub.status < 400) sitemapUrls.push(...parseSitemapLocs(sub.text).locs);
      }
    }
  } else if (sitemap) {
    sitemapStatus = sitemap.status;
  }

  const input: CheckInput = {
    url,
    finalUrl: page.finalUrl,
    html: page.text,
    pageStatus: page.status,
    headers: page.headers,
    robotsTxt: robots && robots.status < 400 ? robots.text : null,
    robotsStatus: robots ? robots.status : null,
    sitemapXml,
    sitemapStatus,
    sitemapUrls,
  };

  const results = runChecks(input);
  return NextResponse.json({
    url,
    finalUrl: page.finalUrl,
    checkedAt: new Date().toISOString(),
    summary: score(results),
    results,
  });
}
