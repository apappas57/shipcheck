"use client";

import { useState } from "react";

type Status = "pass" | "warn" | "fail";
interface CheckResult {
  id: string;
  label: string;
  status: Status;
  category: string;
  detail: string;
  fix?: string;
}
interface Report {
  url: string;
  finalUrl: string;
  checkedAt: string;
  summary: { fails: number; warns: number; passes: number; grade: string };
  results: CheckResult[];
}

const STATUS_META: Record<Status, { color: string; word: string }> = {
  pass: { color: "text-[var(--color-pass)]", word: "PASS" },
  warn: { color: "text-[var(--color-warn)]", word: "WARN" },
  fail: { color: "text-[var(--color-fail)]", word: "FAIL" },
};
const DOT: Record<Status, string> = {
  pass: "bg-[var(--color-pass)]",
  warn: "bg-[var(--color-warn)]",
  fail: "bg-[var(--color-fail)] led-fail",
};
const CATEGORY_ORDER = ["indexing", "social", "metadata", "structure"];
const CATEGORY_LABEL: Record<string, string> = {
  indexing: "Indexing",
  social: "Social",
  metadata: "Metadata",
  structure: "Structure",
};
const SCAN_STEPS = ["fetching page", "reading robots.txt", "parsing sitemap", "checking canonical", "auditing metadata"];

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setReport(null);
    setOpen({});
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setReport(data as Report);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyFix(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1400);
    } catch {}
  }

  const grade = report?.summary.grade ?? "";
  const gradeColor =
    report && report.summary.fails > 0
      ? "text-[var(--color-fail)]"
      : report && report.summary.warns > 2
        ? "text-[var(--color-warn)]"
        : "text-[var(--color-pass)]";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 pb-20 pt-8 sm:pt-14">
      {/* header */}
      <header className="flex items-center justify-between font-mono text-[13px]">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-[var(--color-brand)]">◢</span> shipcheck
        </span>
        <a
          href="https://twitter.com/apappasdev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-faint)] transition-colors hover:text-[var(--color-text)]"
        >
          @apappasdev
        </a>
      </header>

      {/* hero */}
      <section className="mt-16 sm:mt-24">
        <p className="font-mono text-[12px] uppercase tracking-[0.25em] text-[var(--color-brand-dim)]">
          pre-flight SEO check
        </p>
        <h1 className="mt-4 max-w-xl font-sans text-[2rem] font-extrabold leading-[1.08] tracking-tight text-[var(--color-text)] sm:text-[2.75rem]">
          Catch the bugs that keep your pages{" "}
          <span className="text-[var(--color-brand)]">out of Google</span>.
        </h1>
        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--color-muted)]">
          Paste a URL. ShipCheck runs the indexing and metadata checks that actually matter, the
          canonical cascades, the silent <code className="text-[var(--color-text)]">noindex</code>,
          the broken OG image, and hands you the exact Next.js fix. No login.
        </p>
      </section>

      {/* console input */}
      <form onSubmit={run} className="mt-9">
        <div
          className={`relative overflow-hidden rounded-lg border bg-[var(--color-panel)] transition-colors ${
            loading ? "border-[var(--color-brand-dim)]" : "border-[var(--color-line)] focus-within:border-[var(--color-line-bright)]"
          }`}
        >
          {loading && <div className="scanline" />}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="font-mono text-[var(--color-brand)]">{loading ? "↯" : ">"}</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              placeholder="yoursite.com/a-page-thats-not-ranking"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-faint)] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="shrink-0 rounded-md bg-[var(--color-brand)] px-3.5 py-1.5 font-mono text-[12px] font-semibold tracking-wide text-[#04201f] transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              {loading ? "SCANNING" : "RUN CHECK"}
            </button>
          </div>
        </div>
      </form>

      {/* scanning state */}
      {loading && (
        <div className="mt-5 space-y-1.5 font-mono text-[12px] text-[var(--color-faint)]">
          {SCAN_STEPS.map((s, i) => (
            <div key={s} className="print-in flex items-center gap-2" style={{ animationDelay: `${i * 0.12}s` }}>
              <span className="text-[var(--color-brand-dim)]">▸</span> {s}
              <span className="caret text-[var(--color-brand)]">_</span>
            </div>
          ))}
        </div>
      )}

      {/* error */}
      {error && !loading && (
        <div className="mt-5 rounded-lg border border-[var(--color-fail)]/40 bg-[var(--color-fail)]/[0.06] px-4 py-3 font-mono text-[13px] text-[var(--color-fail)]">
          ✕ {error}
        </div>
      )}

      {/* results */}
      {report && !loading && (
        <section className="mt-8">
          {/* grade banner */}
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-faint)]">verdict</p>
              <p className={`mt-1 font-mono text-2xl font-bold uppercase tracking-tight ${gradeColor}`}>{grade}</p>
            </div>
            <div className="flex gap-5 font-mono text-[13px]">
              <span className="text-[var(--color-fail)]">{report.summary.fails} fail</span>
              <span className="text-[var(--color-warn)]">{report.summary.warns} warn</span>
              <span className="text-[var(--color-pass)]">{report.summary.passes} pass</span>
            </div>
          </div>
          <p className="mt-2 break-all font-mono text-[11px] text-[var(--color-faint)]">{report.finalUrl}</p>

          {/* grouped checks */}
          <div className="mt-6 space-y-6">
            {CATEGORY_ORDER.filter((c) => report.results.some((r) => r.category === c)).map((cat) => {
              const rows = report.results.filter((r) => r.category === cat);
              return (
                <div key={cat}>
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-faint)]">
                    {CATEGORY_LABEL[cat]}
                  </p>
                  <div className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)]">
                    {rows.map((r, i) => {
                      const isOpen = !!open[r.id];
                      return (
                        <div key={r.id} className={i > 0 ? "border-t border-[var(--color-line)]" : ""}>
                          <button
                            onClick={() => r.fix && setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                            className={`flex w-full items-start gap-3 px-4 py-3 text-left ${r.fix ? "hover:bg-[var(--color-panel-2)]" : "cursor-default"}`}
                          >
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[r.status]}`} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2.5">
                                <span className="text-[14px] font-medium text-[var(--color-text)]">{r.label}</span>
                                <span className={`font-mono text-[10px] font-bold tracking-wider ${STATUS_META[r.status].color}`}>
                                  {STATUS_META[r.status].word}
                                </span>
                              </span>
                              <span className="mt-1 block text-[13px] leading-relaxed text-[var(--color-muted)]">{r.detail}</span>
                            </span>
                            {r.fix && (
                              <span className="mt-0.5 shrink-0 font-mono text-[var(--color-faint)] transition-transform" style={{ transform: isOpen ? "rotate(90deg)" : "none" }}>
                                ›
                              </span>
                            )}
                          </button>
                          {r.fix && isOpen && (
                            <div className="px-4 pb-4 pl-9">
                              <div className="relative rounded-md border border-[var(--color-line)] bg-[var(--color-bg)]">
                                <button
                                  onClick={() => copyFix(r.id, r.fix!)}
                                  className="absolute right-2 top-2 rounded bg-[var(--color-panel-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-brand)]"
                                >
                                  {copied === r.id ? "copied" : "copy"}
                                </button>
                                <pre className="overflow-x-auto whitespace-pre-wrap break-words px-3.5 py-3 pr-14 text-[12px] leading-relaxed text-[var(--color-text)]">
                                  {r.fix}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* footer / the receipt */}
      <footer className="mt-auto pt-16">
        <p className="max-w-md font-mono text-[11px] leading-relaxed text-[var(--color-faint)]">
          built after finding only <span className="text-[var(--color-warn)]">5 of my own 98 pages</span> were
          indexed by Google. one root-layout canonical, cascading to every page. now it&apos;s a 2-second check.
        </p>
      </footer>
    </main>
  );
}
