"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { api, getProfile, session } from "@/lib/client";
import { Notice, PageIntro } from "@/components/shell";
import type { Profile } from "@/lib/schema";

const blank: Profile = {
  household: "",
  cooking_access: "",
  grocery_cadence: "",
  budget_preference: "",
  dietary_restrictions: "",
  evaluation_consent: false,
};
export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(blank);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    session()
      .then(async (s) => {
        if (!s.user) return;
        setEmail(s.user.email);
        setProfile((await getProfile()).profile);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const result = await api<{ profile: Profile }>("/api/profile", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      setProfile(result.profile);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save your settings.");
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await api("/api/auth", { method: "DELETE" });
      router.push("/sign-in");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t sign out.");
      setBusy(false);
    }
  }
  function field(
    key: keyof Omit<Profile, "evaluation_consent">,
    label: string,
    hint: string,
    placeholder: string,
  ) {
    return (
      <div className="field-group">
        <label htmlFor={key}>{label}</label>
        <p>{hint}</p>
        <input
          id={key}
          value={profile[key]}
          maxLength={key === "dietary_restrictions" ? 500 : 200}
          onChange={(e) =>
            setProfile((current) => ({ ...current, [key]: e.target.value }))
          }
          placeholder={placeholder}
        />
      </div>
    );
  }
  return (
    <div className="content-width settings-page">
      <PageIntro eyebrow="MAKE IT FIT YOUR LIFE" title="Your context matters.">
        Tell the coach what your kitchen and routine are actually like. Leave
        anything blank that doesn’t help.
      </PageIntro>
      {loading ? (
        <p className="muted">Loading settings…</p>
      ) : !email ? (
        <div className="empty-state">
          <ShieldCheck size={38} />
          <h2>Settings are private to your account.</h2>
          <p>Sign in to save context for your advice.</p>
          <Link className="button button-lemon" href="/sign-in">
            Sign in <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <>
          <div className="account-bar">
            <div>
              <span className="mini-label">SIGNED IN AS</span>
              <strong>{email}</strong>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={busy}
              className="button button-outline"
            >
              <LogOut size={18} /> Sign out
            </button>
          </div>
          <form onSubmit={submit} className="settings-form">
            <div className="section-heading">
              <div className="eyebrow">YOUR ROUTINE</div>
              <h2>Help me make useful suggestions.</h2>
            </div>
            {field(
              "household",
              "Who shares your food?",
              "For example, roommates, family, or just you.",
              "Three roommates, shared fridge",
            )}
            {field(
              "cooking_access",
              "What cooking setup do you have?",
              "A microwave counts. So does a dining hall.",
              "Microwave and one stove burner",
            )}
            {field(
              "grocery_cadence",
              "How often do you get groceries?",
              "A rough pattern is enough.",
              "Once a week, sometimes longer",
            )}
            {field(
              "budget_preference",
              "What matters for your budget?",
              "Tell us if smaller packs cost too much, or if you use a meal plan.",
              "Trying to keep weekly groceries low",
            )}
            {field(
              "dietary_restrictions",
              "Any food restrictions to work around?",
              "Only include what you want the coach to consider.",
              "No dairy",
            )}
            <div className="consent-row">
              <input
                id="evaluation_consent"
                type="checkbox"
                checked={profile.evaluation_consent}
                onChange={(e) =>
                  setProfile((current) => ({
                    ...current,
                    evaluation_consent: e.target.checked,
                  }))
                }
              />
              <label htmlFor="evaluation_consent">
                <strong>
                  Allow reviewed corrections to help evaluate SlimWaste
                </strong>
                <span>
                  This is optional. It doesn’t switch on model training, and you
                  can turn it off here.
                </span>
              </label>
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            {saved && (
              <Notice>
                Settings saved. Future advice can use this context.
              </Notice>
            )}
            <button
              className="button button-lemon button-large"
              disabled={busy}
              type="submit"
            >
              {busy ? "Saving…" : "Save settings"}
            </button>
          </form>
          <section className="privacy-section">
            <div className="eyebrow">YOUR DATA</div>
            <h2>Your records and AI processing.</h2>
            <p>
              Your scanned photos are stored privately for your account, and a
              configured AI provider processes a reduced copy to identify food
              and give advice. You can delete an individual scan and its photo
              from History. The app keeps corrected records so your advice uses
              what you confirmed.
            </p>
            <p>
              On Gemini’s free tier, Google may use submitted content to improve
              its models and human reviewers may see it. The scan screen asks
              for your agreement before processing. Don’t include private or
              sensitive information in photos, notes, kitchen settings, or
              questions.
            </p>
            <p>
              One photo can’t measure exact mass. Quantity ranges and detection
              confidence are estimates.
            </p>
            <Link href="/history" className="text-link">
              Manage scans <ArrowRight size={17} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
