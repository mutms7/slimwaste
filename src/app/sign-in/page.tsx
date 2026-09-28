"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { api } from "@/lib/client";
import { Notice, PageIntro } from "@/components/shell";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (step === "email") {
        await api("/api/auth", {
          method: "POST",
          body: JSON.stringify({ email: email.trim() }),
        });
        setStep("code");
        setInfo("Check your email for a sign-in code.");
      } else {
        await api("/api/auth/verify", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), token: token.trim() }),
        });
        router.push("/scan");
        router.refresh();
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "We couldn’t sign you in. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="narrow-page">
      <Link href="/scan" className="back-link">
        <ArrowLeft size={18} /> Back to scan
      </Link>
      <PageIntro eyebrow="YOUR PRIVATE SPACE" title="Sign in to start">
        Your scans and corrections belong to your account. We’ll email you a
        code, so there’s no password to remember.
      </PageIntro>
      <form className="form-stack signin-form" onSubmit={submit}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={step === "code" || busy}
          placeholder="you@school.edu"
        />
        {step === "code" && (
          <>
            <label htmlFor="token">Email code</label>
            <input
              id="token"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              disabled={busy}
              placeholder="Enter your code"
            />
            <button
              className="plain-button"
              type="button"
              onClick={() => {
                setStep("email");
                setToken("");
              }}
            >
              Use another email
            </button>
          </>
        )}
        {info && <Notice>{info}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <button
          className="button button-orange button-large"
          disabled={busy}
          type="submit"
        >
          {busy
            ? "Please wait…"
            : step === "email"
              ? "Send my code"
              : "Verify and continue"}{" "}
          {step === "email" ? <Mail size={19} /> : <ArrowRight size={19} />}
        </button>
      </form>
      <p className="privacy-line">
        We only use your email for your account and sign-in. You can delete a
        scan and its private photo from History.
      </p>
    </div>
  );
}
