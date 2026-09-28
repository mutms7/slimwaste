"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Camera,
  ImagePlus,
  LockKeyhole,
  ScanLine,
} from "lucide-react";
import { api, session } from "@/lib/client";
import { Notice } from "@/components/shell";

const accepted = ["image/jpeg", "image/png", "image/webp"];
export default function ScanPage() {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    session()
      .then((x) => setUser(x.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  async function selected(file?: File) {
    if (!file) return;
    setError("");
    if (!accepted.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("That image is over 4 MB. Choose a smaller photo.");
      return;
    }
    if (!user) {
      setError("Sign in first to keep your scan and photo private.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const result = await api<{ id: string }>("/api/scans", {
        method: "POST",
        body,
      });
      router.push(`/scan/${encodeURIComponent(result.id)}/review`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The scan couldn’t start. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="scan-page content-width">
      <div className="scan-copy">
        <div className="eyebrow">YOUR NEXT SCAN</div>
        <h1>
          See what’s left.
          <br />
          <em>Find what helps.</em>
        </h1>
        <p>
          Take a photo of food you’re about to throw away. We’ll make a rough
          list, you’ll fix it, then we’ll find one useful next move.
        </p>
      </div>
      <div className="camera-panel">
        <div className="camera-art" aria-hidden="true">
          <div className="camera-frame">
            <ScanLine size={76} strokeWidth={1} />
            <span>FOOD IN FRAME</span>
          </div>
          <div className="art-orbit art-orbit-one" />
          <div className="art-orbit art-orbit-two" />
        </div>
        <div className="camera-actions">
          {checking ? (
            <p className="muted">Checking your account…</p>
          ) : !user ? (
            <div className="account-callout">
              <LockKeyhole size={20} aria-hidden="true" />
              <div>
                <strong>Start with a private account</strong>
                <span>Your photos and history stay tied to you.</span>
              </div>
              <Link href="/sign-in" className="button button-orange">
                Sign in <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <p className="signed-in-as">Signed in as {user.email}</p>
              <button
                className="button button-orange button-large"
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={busy}
              >
                <Camera size={21} aria-hidden="true" />
                {busy ? "Reading your photo…" : "Take a photo"}
              </button>
              <button
                className="button button-outline button-large"
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                <ImagePlus size={21} aria-hidden="true" />
                Choose a photo
              </button>
            </>
          )}
          <input
            className="visually-hidden"
            ref={cameraRef}
            tabIndex={-1}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(e) => {
              void selected(e.target.files?.[0]);
              e.target.value = "";
            }}
            aria-label="Take a food photo"
          />
          <input
            className="visually-hidden"
            ref={fileRef}
            tabIndex={-1}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              void selected(e.target.files?.[0]);
              e.target.value = "";
            }}
            aria-label="Choose a food photo"
          />
          {error && (
            <Notice tone="error">
              {error} {!user && <Link href="/sign-in">Sign in</Link>}
            </Notice>
          )}
          <p className="camera-fineprint">
            JPEG, PNG, or WebP, up to 4 MB. The amounts are estimates from one
            photo.
          </p>
        </div>
      </div>
      <div className="sample-strip">
        <div>
          <span className="mini-label">WANT TO LOOK AROUND?</span>
          <strong>Try a sample scan</strong>
          <p>
            An illustration and example results, clearly separate from your own
            scans.
          </p>
        </div>
        <Link className="text-link" href="/scan/sample/review">
          Open sample <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
