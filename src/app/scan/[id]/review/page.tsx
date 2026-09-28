"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { api, getScan } from "@/lib/client";
import { sampleItems, sampleScan, sampleStoreKey } from "@/lib/sample";
import { Notice } from "@/components/shell";
import type { Scan, ScanItem } from "@/lib/schema";

const unitLimits: Record<
  ScanItem["unit"],
  { min: number; max: number; default: [number, number]; step: number }
> = {
  g: { min: 0, max: 1000, default: [100, 200], step: 10 },
  pieces: { min: 0, max: 20, default: [1, 2], step: 0.5 },
  bowls: { min: 0, max: 5, default: [0.5, 1], step: 0.25 },
  cups: { min: 0, max: 10, default: [0.5, 1], step: 0.25 },
  slices: { min: 0, max: 20, default: [1, 2], step: 0.5 },
};
const unitNames: Record<ScanItem["unit"], string> = {
  g: "g",
  pieces: "pieces",
  bowls: "bowls",
  cups: "cups",
  slices: "slices",
};
const reasonNames: Record<ScanItem["reason"], string> = {
  spoiled: "Spoiled",
  leftover: "Leftover",
  "over-portioned": "Too much served",
  disliked: "Didn’t like it",
  unavoidable: "Unavoidable",
  unsure: "Not sure",
};

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isSample = id === "sample";
  const [scan, setScan] = useState<Scan | null>(isSample ? sampleScan : null);
  const [items, setItems] = useState<ScanItem[]>(isSample ? sampleItems : []);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(!isSample);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isSample) {
      Promise.resolve().then(() => {
        try {
          const stored = localStorage.getItem(sampleStoreKey);
          if (stored) {
            const data = JSON.parse(stored);
            setItems(data.items || sampleItems);
            setReference(data.reference || "");
          }
        } catch {}
      });
      return;
    }
    getScan(id)
      .then(({ scan }) => {
        setScan(scan);
        setItems(scan.items);
        setReference(scan.reference);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isSample]);
  function update(index: number, patch: Partial<ScanItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }
  function changeUnit(index: number, unit: ScanItem["unit"]) {
    const [quantity_min, quantity_max] = unitLimits[unit].default;
    update(index, {
      unit,
      quantity_min,
      quantity_max,
      uncertainty: "Unit changed. Confirm this new visual range.",
    });
  }
  function changeSlider(index: number, value: number) {
    const item = items[index];
    const limits = unitLimits[item.unit];
    const width = Math.max(limits.step, item.quantity_max - item.quantity_min);
    const ceiling = Math.max(limits.max, item.quantity_max, value + width / 2);
    const min = Math.max(
      0,
      Math.min(value - width / 2, ceiling - width, 10000 - width),
    );
    update(index, {
      quantity_min: Number(min.toFixed(2)),
      quantity_max: Number((min + width).toFixed(2)),
    });
  }
  function addItem() {
    const [quantity_min, quantity_max] = unitLimits.pieces.default;
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        category: "other",
        edible: "uncertain",
        quantity_min,
        quantity_max,
        unit: "pieces",
        confidence: "low",
        uncertainty: "Added by you. Confirm the amount and details.",
        reason: "unsure",
        note: "",
      },
    ]);
  }
  async function save() {
    setError("");
    if (
      items.some(
        (x) =>
          !x.name.trim() ||
          x.quantity_min < 0 ||
          x.quantity_max <= x.quantity_min,
      )
    ) {
      setError("Each item needs a name and a range with a higher maximum.");
      return;
    }
    setBusy(true);
    try {
      if (isSample)
        localStorage.setItem(
          sampleStoreKey,
          JSON.stringify({ items, reference }),
        );
      else
        await api(`/api/scans/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify({ items, reference }),
        });
      router.push(`/scan/${encodeURIComponent(id)}/coach`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn’t save your review. Try again.",
      );
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="content-width loading-page">
        <p>Opening your scan…</p>
      </div>
    );
  if (!scan)
    return (
      <div className="content-width narrow-page">
        <Notice tone="error">{error || "This scan wasn’t found."}</Notice>
        <Link href="/history" className="text-link">
          Back to history
        </Link>
      </div>
    );
  const lowCount = items.filter((x) => x.confidence === "low").length;
  return (
    <div className="content-width review-page">
      <Link href={isSample ? "/scan" : "/history"} className="back-link">
        <ArrowLeft size={18} /> {isSample ? "Back to scan" : "Back to history"}
      </Link>
      <div className="review-heading">
        <div>
          <div className="eyebrow">
            {isSample ? "SAMPLE SCAN · ILLUSTRATION" : "STEP 1 OF 2 · REVIEW"}
          </div>
          <h1>Sort the receipt.</h1>
          <p>
            We made a first pass. Fix anything we missed before we suggest what
            to try next.
          </p>
        </div>
        <span className="receipt-count">
          {items.length.toString().padStart(2, "0")} ITEMS
        </span>
      </div>
      {isSample && (
        <Notice>
          This is a sample illustration and example result. No photo was
          analyzed, and these edits stay in this browser.
        </Notice>
      )}
      <div className="review-grid">
        <aside className="review-photo-column">
          <div className="photo-frame">
            {scan.image_url ? (
              <Image
                unoptimized
                width={800}
                height={680}
                src={scan.image_url}
                alt="Your scanned food"
              />
            ) : isSample ? (
              <Image
                width={800}
                height={680}
                src="/sample-food.svg"
                alt="Illustration of a sample plate with spinach, bread, and pasta"
              />
            ) : (
              <div className="photo-unavailable">
                Photo unavailable. It may have reached its retention date.
              </div>
            )}
            <span className="photo-label">
              {isSample
                ? "ILLUSTRATED SAMPLE"
                : scan.image_url
                  ? "YOUR PHOTO"
                  : "PHOTO UNAVAILABLE"}
            </span>
          </div>
          <p className="photo-caption">
            One photo can suggest a range, but it can’t measure exact weight.
            Your corrections lead the advice.
          </p>
          {lowCount > 0 && (
            <Notice tone="warning">
              <TriangleAlert size={18} aria-hidden="true" /> {lowCount}{" "}
              {lowCount === 1 ? "item has" : "items have"} low detection
              confidence. Please check {lowCount === 1 ? "it" : "them"} closely.
            </Notice>
          )}
        </aside>
        <section className="receipt" aria-label="Review detected foods">
          <div className="receipt-top">
            <span>SLIMWASTE / REVIEW</span>
            <span>{new Date(scan.created_at).toLocaleDateString()}</span>
          </div>
          <div className="receipt-title">What’s in the frame?</div>
          <div className="receipt-subtitle">
            Edit names, amounts, and reasons. Nothing is final yet.
          </div>
          {items.map((item, index) => (
            <article className="receipt-item" key={item.id}>
              <div className="item-line">
                <span className="item-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="item-main">
                  <label htmlFor={`name-${item.id}`} className="small-label">
                    FOOD NAME
                  </label>
                  <input
                    id={`name-${item.id}`}
                    value={item.name}
                    onChange={(e) => update(index, { name: e.target.value })}
                    maxLength={80}
                    placeholder="Food name"
                  />
                  <div className="item-meta">
                    {item.confidence} detection confidence ·{" "}
                    {item.category.replaceAll("-", " ")}
                  </div>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Remove ${item.name || "item"}`}
                  onClick={() =>
                    setItems((current) => current.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 size={19} />
                </button>
              </div>
              <div className="quantity-line">
                <span className="small-label">VISIBLE AMOUNT</span>
                <strong>
                  {item.quantity_min} to {item.quantity_max}{" "}
                  {unitNames[item.unit]}
                </strong>
              </div>
              <label className="small-label" htmlFor={`slider-${item.id}`}>
                Adjust the rough amount
              </label>
              <input
                className="amount-slider"
                id={`slider-${item.id}`}
                type="range"
                min={unitLimits[item.unit].min}
                max={Math.min(
                  10000,
                  Math.max(
                    unitLimits[item.unit].max,
                    item.quantity_max + (item.quantity_max - item.quantity_min),
                  ),
                )}
                step={unitLimits[item.unit].step}
                value={(item.quantity_min + item.quantity_max) / 2}
                onChange={(e) => changeSlider(index, Number(e.target.value))}
              />
              <div className="range-fields">
                <label>
                  Minimum
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="any"
                    value={item.quantity_min}
                    onChange={(e) =>
                      update(index, { quantity_min: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Maximum
                  <input
                    type="number"
                    min="0.01"
                    max="10000"
                    step="any"
                    value={item.quantity_max}
                    onChange={(e) =>
                      update(index, { quantity_max: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Unit
                  <select
                    value={item.unit}
                    onChange={(e) =>
                      changeUnit(index, e.target.value as ScanItem["unit"])
                    }
                  >
                    {Object.keys(unitLimits).map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="uncertainty">{item.uncertainty}</p>
              <div className="item-more">
                <label>
                  Why is it going?
                  <select
                    value={item.reason}
                    onChange={(e) =>
                      update(index, {
                        reason: e.target.value as ScanItem["reason"],
                      })
                    }
                  >
                    {Object.entries(reasonNames).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Edible?
                  <select
                    value={item.edible}
                    onChange={(e) =>
                      update(index, {
                        edible: e.target.value as ScanItem["edible"],
                      })
                    }
                  >
                    <option value="edible">Yes</option>
                    <option value="inedible">No</option>
                    <option value="uncertain">Not sure</option>
                  </select>
                </label>
                <label>
                  Category
                  <select
                    value={item.category}
                    onChange={(e) =>
                      update(index, {
                        category: e.target.value as ScanItem["category"],
                      })
                    }
                  >
                    <option value="produce">Produce</option>
                    <option value="bread-and-grains">Bread and grains</option>
                    <option value="protein">Protein</option>
                    <option value="dairy">Dairy</option>
                    <option value="prepared-food">Prepared food</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>
              <label className="note-label">
                A note, if useful
                <textarea
                  maxLength={500}
                  rows={2}
                  value={item.note}
                  onChange={(e) => update(index, { note: e.target.value })}
                  placeholder="For example, half a bag from the shared fridge"
                />
              </label>
            </article>
          ))}
          <button
            className="add-item"
            type="button"
            onClick={addItem}
            disabled={items.length >= 20}
          >
            <Plus size={19} />{" "}
            {items.length >= 20 ? "Maximum of 20 items" : "Add a missed item"}
          </button>
          <div className="reference-block">
            <label htmlFor="reference">
              {scan.reference_question || "Any useful size reference?"}
            </label>
            <p>
              A plate size or container type can make the range more useful.
            </p>
            <input
              id="reference"
              value={reference}
              maxLength={300}
              onChange={(e) => setReference(e.target.value)}
              placeholder="For example, a standard dinner plate"
            />
          </div>
          <div className="receipt-bottom">
            <span>ESTIMATE ONLY</span>
            <span>YOU HAVE THE FINAL SAY</span>
          </div>
        </section>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="review-footer">
        <span>
          {items.length} {items.length === 1 ? "item" : "items"} ready to review
        </span>
        <button
          type="button"
          className="button button-orange button-large"
          disabled={busy}
          onClick={save}
        >
          {busy ? "Saving…" : "Save and see suggestions"}{" "}
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
