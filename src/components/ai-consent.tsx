"use client";

import { useEffect, useId, useState } from "react";
import { session } from "@/lib/client";
import { consentStorageKey, freeTierConsent } from "@/lib/ai-policy";

export function AiConsent() {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    session()
      .then((data) => {
        setVisible(data.aiDataUse === "gemini-free-tier");
        setAccepted(
          sessionStorage.getItem(consentStorageKey) === freeTierConsent,
        );
      })
      .catch(() => {});
  }, []);
  if (!visible) return null;
  return (
    <div className="ai-consent">
      <strong>About free AI processing</strong>
      <p>
        Google may use your photos and text to improve its models. Human
        reviewers may see them. Don’t include private information.
      </p>
      <details>
        <summary>What gets sent?</summary>
        <p>
          Photos, corrected food lists, kitchen settings, and questions go to
          Google’s free Gemini service. Don’t include faces, names, health
          details, or confidential information.
        </p>
        <a
          href="https://ai.google.dev/gemini-api/terms#unpaid-services"
          target="_blank"
          rel="noreferrer"
        >
          Read Google’s data terms
        </a>
      </details>
      <label htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={accepted}
          onChange={(event) => {
            const next = event.target.checked;
            setAccepted(next);
            if (next)
              sessionStorage.setItem(consentStorageKey, freeTierConsent);
            else sessionStorage.removeItem(consentStorageKey);
          }}
        />
        <span>I agree to this processing in this tab.</span>
      </label>
    </div>
  );
}
