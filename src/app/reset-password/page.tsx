"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { api } from "@/lib/client";
import { Notice, PageIntro } from "@/components/shell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({ password }),
      });
      router.push("/scan");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "That password couldn't be saved. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow-page">
      <Link href="/forgot-password" className="back-link">
        <ArrowLeft size={18} /> Request another link
      </Link>
      <PageIntro eyebrow="ACCOUNT RECOVERY" title="Choose a new password">
        Use at least 12 characters. A password manager can create and remember
        one for you.
      </PageIntro>
      <form className="form-stack signin-form" onSubmit={submit}>
        <label htmlFor="new-password">New password</label>
        <div className="password-field">
          <input
            id="new-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={12}
            maxLength={128}
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => setShow((current) => !current)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <label htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          minLength={12}
          maxLength={128}
          disabled={busy}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <button
          className="button button-lemon button-large"
          disabled={busy}
          type="submit"
        >
          <KeyRound size={19} aria-hidden="true" />
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
