"use client";
import React, {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useMemo,
  useId,
} from "react";
import { Chess, Square } from "chess.js";
import {
  squareAtPoint,
  legalBoardMove,
  adjacentSquare,
} from "../../lib/chess/board-interaction";
import { Piece } from "./Piece";
export { Piece } from "./Piece";
import PromotionDialog from "./PromotionDialog";
import { CircleDot, Eraser, FlipVertical2, Grid2X2, PencilLine } from "lucide-react";
export default function Board({
  fen,
  onMove,
  flipped = false,
  disabled = false,
  theme = "violet",
  blind = false,
  movableColor,
  showTools = false,
  lastMove,
}: {
  fen: string;
  onMove: (from: string, to: string, promotion?: string) => void;
  flipped?: boolean;
  disabled?: boolean;
  theme?: string;
  blind?: boolean;
  movableColor?: "w" | "b";
  showTools?: boolean;
  lastMove?: { from: string; to: string } | null;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const previous = useRef(fen);
  const markerId = "arrow-" + useId().replace(/:/g, "");
  const gesture = useRef<{
    id: number;
    from: string;
    startX: number;
    startY: number;
    fen: string;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{
    from: string;
    x: number;
    y: number;
    over: string | null;
    size: number;
    type: string;
    color: string;
  } | null>(null);
  const [rotated, setRotated] = useState(false);
  const [coordinates, setCoordinates] = useState(true);
  const [hints, setHints] = useState(true);
  const [annotating, setAnnotating] = useState(false);
  const [annotationFrom, setAnnotationFrom] = useState<string | null>(null);
  const viewFlipped = flipped !== rotated;
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  function select(square: string | null) {
    selectedRef.current = square;
    setSelected(square);
  }
  const [promo, setPromo] = useState<{ from: string; to: string; fen: string } | null>(null);
  const [marks, setMarks] = useState<string[]>([]);
  const [arrows, setArrows] = useState<[string, string][]>([]);
  const [arrowStart, setArrowStart] = useState<string | null>(null);
  const g = useMemo(() => new Chess(fen), [fen]);
  const files = viewFlipped ? "hgfedcba" : "abcdefgh",
    ranks = viewFlipped ? "12345678" : "87654321";
  const squares = [...ranks].flatMap((r) => [...files].map((f) => f + r));
  const legal = selected
    ? g.moves({ square: selected as Square, verbose: true }).map((m) => m.to)
    : [];
  const king = g.inCheck()
    ? squares.find((s) => {
        const p = g.get(s as Square);
        return p?.type === "k" && p.color === g.turn();
      })
    : null;
  const checkmate = g.isCheckmate();
  const winner = g.turn() === "w" ? "Black" : "White";
  const kingIndex = king ? squares.indexOf(king) : -1;
  const promotionChoices = promo?.fen === fen
    ? g.moves({ verbose: true }).filter(move => move.from === promo.from && move.to === promo.to && move.promotion).map(move => move.promotion!)
    : [];
  function clearAnnotations() { setMarks([]); setArrows([]); setAnnotationFrom(null); }
  function choosePromotion(piece: string) {
    if (!promo || disabled || promo.fen !== fen || !promotionChoices.includes(piece as "q" | "r" | "b" | "n")) return;
    onMove(promo.from, promo.to, piece);
    setPromo(null); select(null); clearAnnotations();
  }
  function attempt(from: string, to: string) {
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return;
    if (disabled || promo) return;
    const m = legalBoardMove(fen, from, to, movableColor);
    if (!m) {
      select(g.get(to as Square)?.color === g.turn() ? to : null);
      return;
    }
    if (m.promotion) {
      setPromo({ from, to, fen });
      return;
    }
    onMove(from, to);
    select(null);
    clearAnnotations();
  }
  function click(s: string) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (annotating) {
      if (!annotationFrom) setAnnotationFrom(s);
      else {
        if (annotationFrom === s) setMarks(marks => marks.includes(s) ? marks.filter(mark => mark !== s) : [...marks, s]);
        else setArrows(arrows => arrows.some(([a,b]) => a === annotationFrom && b === s) ? arrows.filter(([a,b]) => a !== annotationFrom || b !== s) : [...arrows, [annotationFrom, s]]);
        setAnnotationFrom(null);
      }
      return;
    }
    if (disabled || promo || (movableColor && g.turn() !== movableColor))
      return;
    const currentSelection = selectedRef.current;
    if (currentSelection === s) select(null);
    else if (currentSelection) attempt(currentSelection, s);
    else if (g.get(s as Square)?.color === g.turn()) select(s);
  }
  function xy(s: string) {
    const i = squares.indexOf(s);
    return [(i % 8) * 100 + 50, Math.floor(i / 8) * 100 + 50];
  }
  useEffect(() => {
    if (disabled) {
      gesture.current = null;
      setDrag(null);
      setPromo(null);
    }
  }, [disabled]);
  function pointerDown(e: React.PointerEvent<HTMLElement>, square: string) {
    if (e.button !== 0 || !e.isPrimary || disabled || promo || annotating || gesture.current)
      return;
    const piece = g.get(square as Square);
    if (
      !piece ||
      piece.color !== g.turn() ||
      (movableColor && piece.color !== movableColor)
    )
      return;
    gesture.current = {
      id: e.pointerId,
      from: square,
      startX: e.clientX,
      startY: e.clientY,
      fen,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: React.PointerEvent<HTMLElement>) {
    const d = gesture.current;
    if (!d || d.id !== e.pointerId || disabled || d.fen !== fen) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6)
      return;
    d.moved = true;
    e.preventDefault();
    select(d.from);
    const rect = boardRef.current?.getBoundingClientRect();
    const piece = g.get(d.from as Square);
    if (!rect || !piece) return;
    setDrag({
      from: d.from,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      over: squareAtPoint(e.clientX, e.clientY, rect, viewFlipped),
      size: rect.width / 8,
      type: piece.type,
      color: piece.color,
    });
  }
  function pointerUp(e: React.PointerEvent<HTMLElement>) {
    const d = gesture.current;
    if (!d || d.id !== e.pointerId) return;
    gesture.current = null;
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d.moved) return;
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 250);
    const rect = boardRef.current?.getBoundingClientRect();
    const to = rect ? squareAtPoint(e.clientX, e.clientY, rect, viewFlipped) : null;
    if (to && d.fen === fen && !disabled) attempt(d.from, to);
  }
  function pointerCancel() {
    gesture.current = null;
    setDrag(null);
  }

  useEffect(() => { setRotated(false); }, [flipped]);
  useLayoutEffect(() => {
    gesture.current = null;
    setDrag(null);
    select(null);
    setPromo(null);
    if (previous.current !== fen) { setMarks([]); setArrows([]); }
    setAnnotationFrom(null);
    const before = new Chess(previous.current);
    previous.current = fen;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const origins = squares.filter((s) => {
      const a = before.get(s as Square),
        b = g.get(s as Square);
      return a && (!b || a.type !== b.type || a.color !== b.color);
    });
    for (const s of squares) {
      const piece = g.get(s as Square),
        old = before.get(s as Square);
      if (
        !piece ||
        (old && old.type === piece.type && old.color === piece.color)
      )
        continue;
      const origin = origins.find((o) => {
        const p = before.get(o as Square);
        return p?.type === piece.type && p.color === piece.color;
      });
      const el = boardRef.current?.querySelector(
        '[data-square="' + s + '"] .piece',
      );
      if (!el || typeof el.animate !== "function") continue;
      if (origin) {
        const a = squares.indexOf(origin),
          b = squares.indexOf(s),
          size = (boardRef.current?.clientWidth || 0) / 8;
        el.animate(
          [
            {
              transform: `translate(${((a % 8) - (b % 8)) * size}px,${(Math.floor(a / 8) - Math.floor(b / 8)) * size}px)`,
            },
            { transform: "translate(0,0)" },
          ],
          { duration: 180, easing: "ease-out" },
        );
        origins.splice(origins.indexOf(origin), 1);
      } else el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    }
  }, [fen, viewFlipped]);
  const SquareElement = disabled && !annotating ? "div" : "button";
  return (
    <div className={"board-wrap " + theme}>
      <div
        ref={boardRef}
        className="chessboard"
        role="group"
        aria-label={checkmate ? `Checkmate. ${winner} wins.` : (g.turn() === "w" ? "White" : "Black") + " to move"}
      >
        {squares.map((s, i) => {
          const p = g.get(s as Square);
          return (
            <SquareElement
              key={s}
              data-square={s}
              tabIndex={
                disabled && !annotating
                  ? -1
                  : selected === s || (!selected && i === 56)
                    ? 0
                    : -1
              }
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  e.stopPropagation();
                  const target = adjacentSquare(i, e.key);
                  const next = target === null ? null : squares[target];
                  if (next)
                    (
                      boardRef.current?.querySelector(
                        '[data-square="' + next + '"]',
                      ) as HTMLElement
                    )?.focus();
                }
              }}
              className={
                "square " +
                ((+s[1] + s.charCodeAt(0)) % 2 === 0
                  ? "dark-square"
                  : "light-square") +
                (selected === s ? " selected" : "") +
                (lastMove?.from === s || lastMove?.to === s ? " last-move" : "") +
                (annotationFrom === s ? " annotation-anchor" : "") +
                (king === s ? " in-check" : "") +
                (king === s && checkmate ? " checkmated-king" : "") +
                (marks.includes(s) ? " marked" : "") +
                (!disabled &&
                p?.color === g.turn() &&
                (!movableColor || p.color === movableColor)
                  ? " can-drag"
                  : "") +
                (drag?.from === s ? " drag-origin" : "") +
                (drag?.over === s && legal.includes(s as Square)
                  ? " drag-target"
                  : "")
              }
              aria-label={
                s +
                (p
                  ? " " +
                    (p.color === "w" ? "white " : "black ") +
                    {
                      p: "pawn",
                      n: "knight",
                      b: "bishop",
                      r: "rook",
                      q: "queen",
                      k: "king",
                    }[p.type]
                  : " empty") + (king === s && checkmate ? " · checkmated" : "")
              }
              aria-pressed={selected === s}
              onClick={() => click(s)}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => {
                if (e.button === 2) setArrowStart(s);
              }}
              onMouseUp={(e) => {
                if (e.button === 2 && arrowStart) {
                  if (arrowStart === s)
                    setMarks((a) =>
                      a.includes(s) ? a.filter((x) => x !== s) : [...a, s],
                    );
                  else setArrows((a) => [...a, [arrowStart, s]]);
                  setArrowStart(null);
                }
              }}
              onPointerDown={(e) => pointerDown(e, s)}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerCancel}
              onLostPointerCapture={() => {
                if (gesture.current) pointerCancel();
              }}
              onDragStart={(e) => e.preventDefault()}
            >
              {coordinates && i % 8 === 0 && <small className="rank">{s[1]}</small>}
              {coordinates && i >= 56 && <small className="file">{s[0]}</small>}
              {p && !blind && <Piece type={p.type} color={p.color} />}{" "}
              {hints && !annotating && legal.includes(s as Square) && (
                <span className={p ? "legal capture" : "legal"} />
              )}
              {king === s && checkmate && <span className="king-mate-symbol" aria-hidden="true">#</span>}
            </SquareElement>
          );
        })}
        <svg className="arrows" viewBox="0 0 800 800" aria-hidden="true">
          <defs>
            <marker
              id={markerId}
              markerWidth="4"
              markerHeight="4"
              refX="2"
              refY="2"
              orient="auto"
            >
              <path d="M0 0L4 2L0 4z" fill="#e7ac43" />
            </marker>
          </defs>
          {arrows.map(([a, b], i) => {
            const [x1, y1] = xy(a),
              [x2, y2] = xy(b);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#e7ac43"
                strokeWidth="15"
                opacity=".85"
                markerEnd={`url(#${markerId})`}
              />
            );
          })}
        </svg>
        {drag && (
          <div
            className="board-drag-ghost"
            aria-hidden="true"
            style={{
              left: drag.x,
              top: drag.y,
              width: drag.size,
              height: drag.size,
            }}
          >
            <Piece type={drag.type} color={drag.color} />
          </div>
        )}
        {checkmate && kingIndex >= 0 && <div key={fen} className={"king-mate-callout " + (kingIndex < 8 ? "below" : "above")} role="status"
          style={{ left: `clamp(57px,${(kingIndex % 8 + .5) * 12.5}%,calc(100% - 57px))`, top: `${(Math.floor(kingIndex / 8) + (kingIndex < 8 ? 1 : 0)) * 12.5}%` }}>
          <span aria-hidden="true">Checkmate</span><span className="sr-only">Checkmate. {winner} wins.</span>
        </div>}
      </div>
      {showTools && <>
        <div className="board-control-strip" role="group" aria-label="Practice board controls">
          <button type="button" onClick={() => { pointerCancel(); select(null); setRotated(value => !value); }} aria-label="Flip board view"><FlipVertical2 size={16}/><span>Flip</span></button>
          <button type="button" onClick={() => setHints(value => !value)} aria-pressed={hints} aria-label="Show legal move hints"><CircleDot size={16}/><span>Hints</span></button>
          <button type="button" onClick={() => setCoordinates(value => !value)} aria-pressed={coordinates} aria-label="Show board coordinates"><Grid2X2 size={16}/><span>Coords</span></button>
          <button type="button" onClick={() => { pointerCancel(); select(null); setAnnotationFrom(null); setAnnotating(value => !value); }} aria-pressed={annotating} aria-label="Annotate board"><PencilLine size={16}/><span>Mark</span></button>
          <button type="button" onClick={clearAnnotations} disabled={!marks.length && !arrows.length && !annotationFrom} aria-label="Clear board annotations"><Eraser size={16}/><span>Clear</span></button>
        </div>
        {annotating && <p className="board-annotation-help" role="status">{annotationFrom ? `Tap a destination for an arrow, or tap ${annotationFrom} again to circle it.` : "Tap two squares to draw an arrow. Tap one square twice to circle it."} <button type="button" onClick={() => { setAnnotating(false); setAnnotationFrom(null); }}>Done</button></p>}
      </>}
      {promo && promo.fen === fen && !!promotionChoices.length && <PromotionDialog color={g.turn()} square={promo.to} choices={promotionChoices} onChoose={choosePromotion} onCancel={() => { setPromo(null); select(null); }}/>}
    </div>
  );
}
