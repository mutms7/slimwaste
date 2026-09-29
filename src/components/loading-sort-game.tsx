"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  Apple,
  Leaf,
  PackageOpen,
  Recycle,
  Trash2,
  type LucideIcon,
} from "lucide-react";

type Bin = "landfill" | "recycling" | "compost";
type Piece = {
  label: string;
  bin: Bin;
  Icon: LucideIcon;
};

const pieces: Piece[] = [
  { label: "banana peel", bin: "compost", Icon: Apple },
  { label: "empty carton", bin: "recycling", Icon: PackageOpen },
  { label: "tied trash bag", bin: "landfill", Icon: Trash2 },
];

const bins: { id: Bin; label: string; Icon: LucideIcon }[] = [
  { id: "landfill", label: "Landfill", Icon: Trash2 },
  { id: "recycling", label: "Recycling", Icon: Recycle },
  { id: "compost", label: "Compost", Icon: Leaf },
];

export function LoadingSortGame({ title }: { title: string }) {
  const titleId = useId();
  const [pieceIndex, setPieceIndex] = useState(0);
  const [launch, setLaunch] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("Choose a bin for each item.");
  const piece = pieces[pieceIndex];

  const nextPiece = useCallback(() => {
    setPieceIndex((current) => {
      const choices = pieces
        .map((_, index) => index)
        .filter((index) => index !== current);
      return choices[Math.floor(Math.random() * choices.length)];
    });
    setLaunch((current) => current + 1);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(nextPiece, 2200);
    return () => window.clearInterval(timer);
  }, [nextPiece]);

  function sortInto(bin: Bin) {
    const correct = bin === piece.bin;
    setScore((current) => Math.max(0, current + (correct ? 1 : -1)));
    setFeedback(
      correct
        ? `Nice. The ${piece.label} belongs in ${bin}.`
        : `Try the ${piece.bin} bin for the ${piece.label}.`,
    );
    nextPiece();
  }

  const PieceIcon = piece.Icon;

  return (
    <section className="sort-game" aria-labelledby={titleId}>
      <div className="sort-game-topline">
        <div>
          <p className="mini-label">SORT WHILE WE THINK</p>
          <h2 id={titleId}>{title}</h2>
        </div>
        <span className="sort-score" aria-label={`Score ${score}`}>
          Score {score}
        </span>
      </div>
      <div className="sort-stage" aria-label={`Sort the ${piece.label}`}>
        <div className="sort-launcher" aria-hidden="true">
          <span />
        </div>
        <div className="sort-flight-path" aria-hidden="true" />
        <div className="sort-piece" key={`${pieceIndex}-${launch}`}>
          <PieceIcon size={30} aria-hidden="true" />
          <span>{piece.label}</span>
        </div>
      </div>
      <div className="sort-bins">
        {bins.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => sortInto(id)}>
            <Icon size={23} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="sort-feedback" aria-live="polite">
        {feedback}
      </p>
    </section>
  );
}
