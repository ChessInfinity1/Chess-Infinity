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
export function Piece({ type, color }: { type: string; color: string }) {
  const fill = color === "w" ? "#fffaf1" : "#33313f",
    stroke = color === "w" ? "#55505e" : "#171520";
  return (
    <svg className="piece" viewBox="0 0 80 80" aria-hidden="true">
      <g
        fill={fill}
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {type === "p" ? (
          <>
            <circle cx="40" cy="25" r="10" />
            <path d="M34 35h12l3 17 7 7H24l7-7z" />
          </>
        ) : type === "r" ? (
          <>
            <path d="M22 16h9v9h6v-9h7v9h6v-9h9v17l-7 5v17H29V38l-7-5z" />
            <path d="M28 34h25M29 52h23" />
          </>
        ) : type === "n" ? (
          <>
            <path d="M25 57l3-13 14-11-11-3-9 8-6-8 12-17 10-1 7-8 2 12c17 6 21 24 15 41z" />
            <circle cx="35" cy="23" r="2" fill={stroke} />
            <path d="M44 24c12 9 12 19 7 29" fill="none" />
          </>
        ) : type === "b" ? (
          <>
            <path d="M39 10c-3 9-15 13-15 24 0 8 7 13 13 15l-9 9h26l-10-9c10-5 14-9 13-16-1-10-13-15-18-23z" />
            <path d="M43 22l-9 13" fill="none" />
            <circle cx="39" cy="8" r="3" />
          </>
        ) : type === "q" ? (
          <>
            <path d="M20 25l9 28h25l8-28-14 13-7-20-8 20z" />
            <circle cx="19" cy="23" r="4" />
            <circle cx="41" cy="15" r="4" />
            <circle cx="63" cy="23" r="4" />
            <path d="M29 49h25" />
          </>
        ) : (
          <>
            <path d="M35 8h11v6h7v7h-7v10H35V21h-7v-7h7z" />
            <path d="M26 30c-12 1-11 16 3 21l-2 8h28l-3-8c15-7 14-21 2-21-6 0-11 4-14 8-3-4-9-8-14-8z" />
          </>
        )}
        <path d="M24 59h33l4 9H20z" />
        <path d="M20 68h41v5H20z" />
      </g>
    </svg>
  );
}
export default function Board({
  fen,
  onMove,
  flipped = false,
  disabled = false,
  theme = "violet",
  blind = false,
  movableColor,
}: {
  fen: string;
  onMove: (from: string, to: string, promotion?: string) => void;
  flipped?: boolean;
  disabled?: boolean;
  theme?: string;
  blind?: boolean;
  movableColor?: "w" | "b";
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
  const promotionRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  function select(square: string | null) {
    selectedRef.current = square;
    setSelected(square);
  }
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [marks, setMarks] = useState<string[]>([]);
  const [arrows, setArrows] = useState<[string, string][]>([]);
  const [arrowStart, setArrowStart] = useState<string | null>(null);
  const g = useMemo(() => new Chess(fen), [fen]);
  const files = flipped ? "hgfedcba" : "abcdefgh",
    ranks = flipped ? "12345678" : "87654321";
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
  function attempt(from: string, to: string) {
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return;
    if (disabled || promo) return;
    const m = legalBoardMove(fen, from, to, movableColor);
    if (!m) {
      select(g.get(to as Square)?.color === g.turn() ? to : null);
      return;
    }
    if (m.promotion) {
      setPromo({ from, to });
      return;
    }
    onMove(from, to);
    select(null);
    setMarks([]);
    setArrows([]);
  }
  function click(s: string) {
    if (suppressClick.current) {
      suppressClick.current = false;
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
    if (e.button !== 0 || !e.isPrimary || disabled || promo || gesture.current)
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
      over: squareAtPoint(e.clientX, e.clientY, rect, flipped),
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
    const to = rect ? squareAtPoint(e.clientX, e.clientY, rect, flipped) : null;
    if (to && d.fen === fen && !disabled) attempt(d.from, to);
  }
  function pointerCancel() {
    gesture.current = null;
    setDrag(null);
  }

  useEffect(() => {
    if (!promo) return;
    const previous = document.activeElement as HTMLElement;
    promotionRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function keys(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setPromo(null);
      }
      if (e.key === "Tab") {
        const buttons = Array.from(
          promotionRef.current?.querySelectorAll<HTMLButtonElement>("button") ||
            [],
        );
        if (e.shiftKey && document.activeElement === buttons[0]) {
          e.preventDefault();
          buttons[buttons.length - 1]?.focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === buttons[buttons.length - 1]
        ) {
          e.preventDefault();
          buttons[0]?.focus();
        }
      }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [promo]);
  useLayoutEffect(() => {
    gesture.current = null;
    setDrag(null);
    select(null);
    setPromo(null);
    setMarks([]);
    setArrows([]);
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
  }, [fen]);
  const SquareElement = disabled ? "div" : "button";
  return (
    <div className={"board-wrap " + theme}>
      <div
        ref={boardRef}
        className="chessboard"
        role="group"
        aria-label={(g.turn() === "w" ? "White" : "Black") + " to move"}
      >
        {squares.map((s, i) => {
          const p = g.get(s as Square);
          return (
            <SquareElement
              key={s}
              data-square={s}
              tabIndex={
                disabled
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
                (king === s ? " in-check" : "") +
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
                  : " empty")
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
              {i % 8 === 0 && <small className="rank">{s[1]}</small>}
              {i >= 56 && <small className="file">{s[0]}</small>}
              {p && !blind && <Piece type={p.type} color={p.color} />}{" "}
              {legal.includes(s as Square) && (
                <span className={p ? "legal capture" : "legal"} />
              )}
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
      </div>
      {promo && (
        <div
          className="promotion"
          ref={promotionRef}
          role="dialog"
          aria-modal="true"
          aria-label="Choose your promotion"
        >
          <strong>Choose your promotion</strong>
          <div>
            {["q", "r", "b", "n"].map((p) => (
              <button
                key={p}
                onClick={() => {
                  onMove(promo.from, promo.to, p);
                  setPromo(null);
                  select(null);
                }}
                aria-label={
                  "Promote to " +
                  { q: "queen", r: "rook", b: "bishop", n: "knight" }[p]
                }
              >
                <Piece type={p} color={g.turn()} />
              </button>
            ))}
            <button onClick={() => setPromo(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
