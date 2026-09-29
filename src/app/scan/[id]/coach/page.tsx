"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { api, getScan } from "@/lib/client";
import { sampleAdvice, sampleItems, sampleStoreKey } from "@/lib/sample";
import { Notice } from "@/components/shell";
import { AiConsent } from "@/components/ai-consent";
import { LoadingSortGame } from "@/components/loading-sort-game";
import type { CoachReply, Message, ScanItem } from "@/lib/schema";

export default function CoachPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isSample = id === "sample";
  const [reply, setReply] = useState<CoachReply | null>(
    isSample ? sampleAdvice(sampleItems) : null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [question, setQuestion] = useState("");
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(!isSample);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isSample) {
      Promise.resolve().then(() => {
        try {
          const stored = JSON.parse(
            localStorage.getItem(sampleStoreKey) || "{}",
          );
          const reviewed = Array.isArray(stored.items)
            ? (stored.items as ScanItem[])
            : sampleItems;
          setItems(reviewed);
          setReply(sampleAdvice(reviewed));
        } catch {
          setItems(sampleItems);
        }
      });
      return;
    }
    let active = true;
    getScan(id)
      .then(async (data) => {
        if (!active) return;
        if (data.scan.status === "review") {
          router.replace(`/scan/${encodeURIComponent(id)}/review`);
          return;
        }
        setItems(data.scan.items);
        setMessages(data.messages);
        setReply(data.advice);
        setLoading(false);
        if (!data.advice && data.scan.status === "corrected") await ask("");
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
    // Initial coaching is intentionally requested after loading the corrected scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isSample, router]);
  async function ask(text: string) {
    if (isSample) {
      if (text.trim()) {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "user",
            content: text.trim(),
            created_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "This is an example conversation. Sign in and scan your own photo for advice about your food.",
            created_at: new Date().toISOString(),
          },
        ]);
      }
      setQuestion("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<{ reply: CoachReply; messages: Message[] }>(
        `/api/scans/${encodeURIComponent(id)}/coach`,
        { method: "POST", body: JSON.stringify({ question: text }) },
      );
      setReply(data.reply);
      setMessages(data.messages);
      setQuestion("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Advice is taking too long. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (question.trim()) void ask(question.trim());
  }
  async function sendFeedback(helpful: boolean) {
    setFeedback(helpful);
    if (!isSample) {
      try {
        await api(`/api/scans/${encodeURIComponent(id)}/feedback`, {
          method: "POST",
          body: JSON.stringify({ helpful, note: "" }),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn’t save feedback.");
        setFeedback(null);
      }
    }
  }
  return (
    <div className="content-width coach-page">
      <Link
        href={`/scan/${encodeURIComponent(id)}/review`}
        className="back-link"
      >
        <ArrowLeft size={18} /> Back to review
      </Link>
      <div className="eyebrow">
        {isSample ? "SAMPLE ADVICE" : "STEP 2 OF 2 · YOUR NEXT MOVE"}
      </div>
      <h1>One useful thing to try.</h1>
      <p className="page-lead">
        Based on the food you reviewed, plus any context you’ve added in
        Settings.
      </p>
      {isSample && (
        <Notice>
          This is a sample conversation, not live AI advice. Your own scans need
          a signed-in account.
        </Notice>
      )}
      {loading && <LoadingSortGame title="Reading your corrected list…" />}
      {!isSample && <AiConsent />}
      {error && (
        <Notice tone="error">
          {error}{" "}
          <button
            type="button"
            className="inline-button"
            onClick={() => void ask(question.trim())}
          >
            Try again
          </button>
        </Notice>
      )}
      {busy && <LoadingSortGame title="Building your next suggestion…" />}
      {reply && (
        <>
          <section className="coach-main">
            <div className="coach-label">WHAT I NOTICED</div>
            <p className="breakdown">{reply.breakdown}</p>
            <div className="coach-rule" />
            <div className="coach-label">TRY THIS NEXT</div>
            <ol className="actions-list">
              {reply.actions.map((action, i) => (
                <li key={`${action.title}-${i}`}>
                  <span className="action-count">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2>{action.title}</h2>
                    <p>{action.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <div className="coach-meta">
            <span>
              From {items.length} reviewed{" "}
              {items.length === 1 ? "item" : "items"}. Amounts remain estimates.
            </span>
            <Link href={`/scan/${encodeURIComponent(id)}/review`}>
              Edit the list <ArrowRight size={16} />
            </Link>
          </div>
          <div className="feedback-row">
            <span>Was this useful?</span>
            <button
              type="button"
              className={feedback === true ? "feedback active" : "feedback"}
              onClick={() => void sendFeedback(true)}
              aria-pressed={feedback === true}
            >
              <ThumbsUp size={17} /> Yes
            </button>
            <button
              type="button"
              className={feedback === false ? "feedback active" : "feedback"}
              onClick={() => void sendFeedback(false)}
              aria-pressed={feedback === false}
            >
              <ThumbsDown size={17} /> Not yet
            </button>
          </div>
          <section className="conversation">
            <div className="section-heading">
              <div className="eyebrow">KEEP TALKING</div>
              <h2>Ask about your situation.</h2>
            </div>
            <p>
              Shared fridge? Meal plan? No freezer? Ask for a version that fits.
            </p>
            {messages
              .filter((m) => m.content.trim())
              .map((message) => (
                <div
                  className={`message message-${message.role}`}
                  key={message.id}
                >
                  <span>{message.role === "user" ? "YOU" : "SLIMWASTE"}</span>
                  <p>{message.content}</p>
                </div>
              ))}
            <form onSubmit={submit} className="question-form">
              <label htmlFor="question">Your question</label>
              <div>
                <input
                  id="question"
                  value={question}
                  maxLength={1000}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What if I only have a mini fridge?"
                  disabled={busy}
                />
                <button
                  type="submit"
                  className="button button-lemon"
                  disabled={busy || !question.trim()}
                  aria-label="Send question"
                >
                  <Send size={19} />
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
