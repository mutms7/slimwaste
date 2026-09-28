"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChartNoAxesColumnIncreasing } from "lucide-react";
import { getScans, session } from "@/lib/client";
import { Notice, PageIntro } from "@/components/shell";
import type { Scan } from "@/lib/schema";

export default function InsightsPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    session()
      .then(async (s) => {
        if (!s.user) {
          setSignedOut(true);
          return;
        }
        setScans(
          (await getScans()).scans.filter((x) => x.status === "corrected"),
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const patterns = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const scan of scans) {
      const seen = new Set<string>();
      for (const item of scan.items) {
        const key = item.name.trim().toLocaleLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const current = counts.get(key) || { name: item.name, count: 0 };
        current.count++;
        counts.set(key, current);
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [scans]);
  return (
    <div className="content-width insights-page">
      <PageIntro eyebrow="YOUR PATTERNS" title="A little more context.">
        This counts reviewed items across your scans. It doesn’t turn photo
        estimates into exact weights or impact numbers.
      </PageIntro>
      {error && <Notice tone="error">{error}</Notice>}
      {loading ? (
        <p className="muted">Looking through your reviewed scans…</p>
      ) : signedOut ? (
        <div className="empty-state">
          <ChartNoAxesColumnIncreasing size={38} />
          <h2>Your patterns are private.</h2>
          <p>Sign in to see what repeats in your own scans.</p>
          <Link className="button button-orange" href="/sign-in">
            Sign in <ArrowRight size={18} />
          </Link>
        </div>
      ) : !scans.length ? (
        <div className="empty-state">
          <ChartNoAxesColumnIncreasing size={38} />
          <h2>Nothing to compare yet.</h2>
          <p>
            Review a scan first. Patterns get more useful after a few entries.
          </p>
          <Link className="button button-orange" href="/scan">
            Start a scan <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <>
          <div className="insight-summary">
            <strong>{scans.length}</strong>
            <span>reviewed {scans.length === 1 ? "scan" : "scans"}</span>
            <p>
              Each entry is one occasion, even when the visible amount varies.
            </p>
          </div>
          <section className="patterns">
            <div className="section-heading">
              <div className="eyebrow">REPEAT APPEARANCES</div>
              <h2>Foods you’ve noticed.</h2>
            </div>
            {patterns.map((item, i) => (
              <div className="pattern-row" key={item.name}>
                <span className="pattern-rank">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <strong>{item.name}</strong>
                <span>
                  {item.count} {item.count === 1 ? "scan" : "scans"}
                </span>
              </div>
            ))}
            <p className="muted">
              A repeated item can point to a habit worth checking. It doesn’t
              say why it happened.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
