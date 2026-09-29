"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, UserPlus } from "lucide-react";
import { api } from "@/lib/client";
import { Notice, PageIntro } from "@/components/shell";

type Mode = "sign-in" | "sign-up";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password, mode }),
      });
      router.push("/scan");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn't sign you in. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const creating = mode === "sign-up";
  return (
    <div className="narrow-page">
      <Link href="/scan" className="back-link">
        <ArrowLeft size={18} /> Back to scan
      </Link>
      <PageIntro
        eyebrow="YOUR PRIVATE SPACE"
        title={creating ? "Make your account" : "Welcome back"}
      >
        {creating
          ? "Create an email and password once. Your scans and corrections stay in your private account."
          : "Sign in with your email and password to pick up where you left off."}
      </PageIntro>
      <form className="form-stack signin-form" onSubmit={submit}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={busy}
          placeholder="you@school.edu"
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete={creating ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={12}
          maxLength={128}
          disabled={busy}
          aria-describedby={creating ? "password-help" : undefined}
          placeholder={creating ? "At least 12 characters" : "Your password"}
        />
        {creating && (
          <p id="password-help" className="field-help">
            Use at least 12 characters. A password manager can make one for you.
          </p>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <button
          className="button button-lemon button-large"
          disabled={busy}
          type="submit"
        >
          {busy ? "Please wait…" : creating ? "Create account" : "Sign in"}{" "}
          {creating ? <UserPlus size={19} /> : <KeyRound size={19} />}
        </button>
        <button
          className="plain-button auth-mode-toggle"
          type="button"
          disabled={busy}
          onClick={() => {
            setMode(creating ? "sign-in" : "sign-up");
            setError("");
          }}
        >
          {creating
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </form>
      <p className="privacy-line">
        Your email is used for your account. You can delete a scan and its
        private photo from History.
      </p>
    </div>
  );
}
