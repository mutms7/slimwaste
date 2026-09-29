"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { api } from "@/lib/client";
import { Notice, PageIntro } from "@/components/shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("reset_error"))
      Promise.resolve().then(() =>
        setError("That recovery link has expired. Request a new one."),
      );
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/recovery", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The recovery email couldn't be sent. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow-page">
      <Link href="/sign-in" className="back-link">
        <ArrowLeft size={18} /> Back to sign in
      </Link>
      <PageIntro eyebrow="ACCOUNT RECOVERY" title="Reset your password">
        Enter the email you used for SlimWaste. If it has an account, we’ll send
        a private reset link.
      </PageIntro>
      <form className="form-stack signin-form" onSubmit={submit}>
        <label htmlFor="recovery-email">Email address</label>
        <input
          id="recovery-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={busy || sent}
          placeholder="you@school.edu"
        />
        {sent && (
          <Notice>
            Check your email for a reset link. You can close this page after it
            arrives.
          </Notice>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {!sent && (
          <button
            className="button button-lemon button-large"
            disabled={busy}
            type="submit"
          >
            <Mail size={19} aria-hidden="true" />
            {busy ? "Sending…" : "Send reset link"}
          </button>
        )}
      </form>
    </div>
  );
}
