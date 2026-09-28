"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Camera, Trash2 } from "lucide-react";
import { api, getScans, session } from "@/lib/client";
import { Notice, PageIntro } from "@/components/shell";
import type { Scan } from "@/lib/schema";

export default function HistoryPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");
  useEffect(() => {
    session()
      .then(async (s) => {
        if (!s.user) {
          setSignedOut(true);
          return;
        }
        const data = await getScans();
        setScans(data.scans);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function remove(scan: Scan) {
    if (
      !window.confirm(
        "Delete this scan, its private photo, corrections, and conversation? This can’t be undone.",
      )
    )
      return;
    setDeleting(scan.id);
    setError("");
    try {
      await api(`/api/scans/${encodeURIComponent(scan.id)}`, {
        method: "DELETE",
      });
      setScans((current) => current.filter((x) => x.id !== scan.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t delete the scan.");
    } finally {
      setDeleting("");
    }
  }
  return (
    <div className="content-width history-page">
      <PageIntro eyebrow="YOUR RECORD" title="What keeps showing up?">
        Your reviewed scans live here. A photo gives a rough estimate, not a
        measured weight.
      </PageIntro>
      {error && <Notice tone="error">{error}</Notice>}
      {loading ? (
        <p className="muted">Loading your scans…</p>
      ) : signedOut ? (
        <div className="empty-state">
          <Camera size={38} />
          <h2>History starts after sign-in.</h2>
          <p>Sign in to keep your scans private and see patterns over time.</p>
          <Link className="button button-orange" href="/sign-in">
            Sign in <ArrowRight size={18} />
          </Link>
        </div>
      ) : scans.length === 0 ? (
        <div className="empty-state">
          <Camera size={38} />
          <h2>No scans yet.</h2>
          <p>
            Next time food’s going into the bin, take a photo and check the
            list.
          </p>
          <Link className="button button-orange" href="/scan">
            Start a scan <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="history-list">
          {scans.map((scan) => (
            <article className="history-row" key={scan.id}>
              <div className="history-thumb">
                {scan.image_url ? (
                  <Image
                    unoptimized
                    width={100}
                    height={85}
                    src={scan.image_url}
                    alt="Scanned food"
                  />
                ) : (
                  <Camera size={24} aria-hidden="true" />
                )}
              </div>
              <div className="history-info">
                <span className="mini-label">
                  {new Date(scan.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · {scan.status === "review" ? "Needs review" : "Reviewed"}
                </span>
                <h2>
                  {scan.items
                    .slice(0, 3)
                    .map((x) => x.name)
                    .join(", ") || "Food scan"}
                </h2>
                <p>
                  {scan.items.length}{" "}
                  {scan.items.length === 1 ? "item" : "items"} · estimated
                  amounts
                </p>
              </div>
              <div className="history-actions">
                <Link
                  href={`/scan/${encodeURIComponent(scan.id)}/${scan.status === "review" ? "review" : "coach"}`}
                  aria-label={`Open scan from ${new Date(scan.created_at).toLocaleDateString()}`}
                >
                  <ArrowRight size={22} />
                </Link>
                <button
                  type="button"
                  aria-label="Delete scan"
                  disabled={deleting === scan.id}
                  onClick={() => void remove(scan)}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
