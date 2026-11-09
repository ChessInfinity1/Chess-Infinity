"use client";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Crown, X } from "lucide-react";
import { Piece } from "./Piece";

const pieces = [
  { type: "q", name: "Queen" },
  { type: "r", name: "Rook" },
  { type: "b", name: "Bishop" },
  { type: "n", name: "Knight" },
];

export default function PromotionDialog({ color, square, choices, onChoose, onCancel }: {
  color: "w" | "b"; square: string; choices: string[];
  onChoose: (piece: string) => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>("[data-promotion]")?.focus({ preventScroll: true });
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  // A native modal stays above navigation and traps focus for keyboard users.
  if (typeof document === "undefined") return null;
  return createPortal(<dialog ref={dialog} className="promotion-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); onCancel(); }}
    onClick={event => { if (event.target === event.currentTarget) onCancel(); }}
    onKeyDown={event => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      if (choices.includes(key)) { event.preventDefault(); onChoose(key); }
    }}>
    <div className="promotion-card">
      <header><span className="promotion-emblem"><Crown size={20}/></span><span className="promotion-eyebrow">A NEW POSSIBILITY</span><button type="button" className="promotion-close" aria-label="Cancel promotion" onClick={onCancel}><X size={18}/></button></header>
      <h2 id={titleId}>Your pawn. A new piece.</h2>
      <p id={descriptionId}>Choose what your {color === "w" ? "white" : "black"} pawn becomes on <strong>{square}</strong>.</p>
      <div className="promotion-options">
        {pieces.filter(piece => choices.includes(piece.type)).map(piece => <button type="button" key={piece.type} className="promotion-option" data-promotion={piece.type} onClick={() => onChoose(piece.type)} aria-label={`Promote to ${piece.name.toLowerCase()}`}>
          <span className="promotion-piece"><Piece type={piece.type} color={color}/></span><strong>{piece.name}</strong><kbd aria-hidden="true">{piece.type.toUpperCase()}</kbd>
        </button>)}
      </div>
      <footer><span><ArrowRight size={13}/>Your move continues after you choose.</span><button type="button" onClick={onCancel}>Cancel move</button></footer>
    </div>
  </dialog>, document.body);
}
