"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, ImagePlus, LockKeyhole } from "lucide-react";
import { api, session } from "@/lib/client";
import { Notice } from "@/components/shell";
import { PlateIllustration } from "@/components/brand";
import { AiConsent } from "@/components/ai-consent";

const accepted = ["image/jpeg", "image/png", "image/webp"];
export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    session()
      .then((x) => setUser(x.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }
  useEffect(() => () => stopCamera(), []);
  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play();
  }, [cameraOpen]);
  async function openCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera access isn't available in this browser. Upload a photo instead.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setError(
        "We couldn't open your camera. Check its browser permission and try again.",
      );
    }
  }
  function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setError("Your camera is still starting. Try capture again in a moment.");
      return;
    }
    const longestSide = Math.max(video.videoWidth, video.videoHeight);
    const scale = Math.min(1, 1600 / longestSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setError("We couldn't prepare that camera photo. Try again.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        stopCamera();
        if (!blob) {
          setError("We couldn't capture that photo. Try again.");
          return;
        }
        void selected(
          new File([blob], `slimwaste-camera-${Date.now()}.jpg`, {
            type: "image/jpeg",
          }),
        );
      },
      "image/jpeg",
      0.86,
    );
  }
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
        <div className="eyebrow">
          <span className="eyebrow-seed" /> Worth a second look
        </div>
        <h1>
          A little less
          <br />
          <em>left behind.</em>
        </h1>
        <p>
          Start with what’s on your plate. Snap the food you’re throwing away,
          check the estimate, and find one small thing to try next time.
        </p>
      </div>
      <div className="camera-panel">
        <div className="camera-art" aria-hidden="true">
          <div className="art-heading">
            <span>A FRESH LOOK AT LEFTOVERS</span>
            <span>↗</span>
          </div>
          <PlateIllustration />
          <span className="plate-sticker">
            Small steps.
            <br />
            Good change.
          </span>
          <span className="illustration-label">ILLUSTRATION</span>
          <div className="scan-steps">
            <span>
              <b>01</b> Snap
            </span>
            <span>
              <b>02</b> Check
            </span>
            <span>
              <b>03</b> Try
            </span>
          </div>
        </div>
        <div className="camera-actions">
          {checking ? (
            <p className="muted">Checking your account…</p>
          ) : !user ? (
            <div className="account-callout">
              <LockKeyhole size={18} aria-hidden="true" />
              <div>
                <strong>Start with a private account</strong>
                <span>Your photos and history stay tied to you.</span>
              </div>
              <Link href="/sign-in" className="button button-lemon">
                Sign in <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <p className="signed-in-as">Signed in as {user.email}</p>
              <AiConsent />
              <button
                className="button button-lemon button-large"
                type="button"
                onClick={() => void openCamera()}
                disabled={busy}
              >
                <Camera size={21} aria-hidden="true" />
                {busy ? "Reading your photo…" : "Open camera"}
              </button>
              <button
                className="button button-outline button-large"
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                <ImagePlus size={21} aria-hidden="true" />
                Upload from device
              </button>
            </>
          )}
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
      {cameraOpen && (
        <div
          className="camera-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) stopCamera();
          }}
        >
          <section
            className="camera-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-dialog-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") stopCamera();
            }}
          >
            <div className="camera-dialog-heading">
              <div>
                <p className="mini-label">LIVE CAMERA</p>
                <h2 id="camera-dialog-title">Frame what&apos;s left.</h2>
              </div>
              <button
                className="plain-button"
                type="button"
                onClick={stopCamera}
              >
                Cancel
              </button>
            </div>
            <video
              ref={videoRef}
              className="camera-preview"
              autoPlay
              muted
              playsInline
              aria-label="Live camera preview"
            />
            <button
              className="button button-lemon button-large"
              type="button"
              onClick={capturePhoto}
              autoFocus
            >
              <Camera size={21} aria-hidden="true" /> Capture photo
            </button>
          </section>
        </div>
      )}
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
