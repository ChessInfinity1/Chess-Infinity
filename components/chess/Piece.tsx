"use client";
import { createContext, useContext } from "react";
import { pieceStyle, type PieceStyle } from "../../lib/chess/appearance";
export const PieceStyleContext = createContext<PieceStyle>("classic");
export const PieceStyleProvider = PieceStyleContext.Provider;
export function Piece({ type, color, style }: { type: string; color: string; style?: PieceStyle }) {
  const current = useContext(PieceStyleContext);
  const selected = pieceStyle(style || current);
  if (selected !== "classic") return <StyledPiece type={type} color={color} style={selected}/>;
  const fill = color === "w" ? "#fffaf1" : "#33313f",
    stroke = color === "w" ? "#55505e" : "#171520";
  return (
    <svg className="piece" data-piece-style="classic" viewBox="0 0 80 80" aria-hidden="true">
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

function StyledPiece({ type, color, style }: { type: string; color: string; style: PieceStyle }) {
  const white = color === "w", fill = white ? "#fffaf0" : "#2c3442", stroke = white ? "#4b5363" : "#111b29", detail = white ? "#c7bda9" : "#6f839c";
  if (style === "pixel") {
    const shapes: Record<string,string> = {
      p: "M32 12h16v4h4v16h-4v8h4v12h4v8H24v-8h4V40h4v-8h-4V16h4z",
      r: "M16 12h12v12h8V12h8v12h8V12h12v24h-8v8h-4v16H28V44h-4v-8h-8z",
      n: "M40 8h12v8h8v8h4v36H24V48h8v-8h8v-8H24v8H12V28h8v-8h8v-4h12z",
      b: "M36 8h8v8h8v8h4v16h-8v8h4v12H28V48h4v-8h-8V24h4v-8h8z",
      q: "M12 16h12v8h8V12h16v12h8v-8h12v20h-8v12h-4v12H24V48h-4V36h-8z",
      k: "M36 4h8v8h8v8h-8v12h12v8h8v12h-8v8H24v-8h-8V40h8v-8h12V20h-8v-8h8z",
    };
    return <svg className="piece piece-pixel" data-piece-style="pixel" viewBox="0 0 80 80" aria-hidden="true" shapeRendering="crispEdges"><g fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="miter"><path d={shapes[type] || shapes.k}/><path d="M20 60h40v8h4v8H16v-8h4z"/></g><g fill={detail}>{type === "n" ? <path d="M40 20h6v6h-6z"/> : type === "b" ? <path d="M40 20h4v8h-4v8h-4v-8h4z"/> : <path d="M28 48h24v4H28z"/>}<path d="M24 64h32v4H24z"/></g></svg>;
  }
  const minimal = style === "minimal";
  return <svg className={"piece piece-" + style} data-piece-style={style} viewBox="0 0 80 80" aria-hidden="true"><g fill={fill} stroke={stroke} strokeWidth={minimal ? 2.8 : 2.4} strokeLinecap="round" strokeLinejoin="round">
    {type === "p" ? <><circle cx="40" cy={minimal ? 23 : 24} r={minimal ? 11 : 12}/><path d={minimal ? "M34 35h12l9 25H25z" : "M32 37h16l-1 8 10 15H23l10-15z"}/></>
      : type === "r" ? <><path d={minimal ? "M22 14h9v10h18V14h9v22H22z" : "M17 14h12v11h7V14h8v11h7V14h12v22H17z"}/><path d="M28 36h24v24H28z"/></>
      : type === "n" ? <><path d={minimal ? "M25 60l10-24-12 5-8-10 20-17 14 1 4-7 5 18 6 34z" : "M24 60c0-13 4-20 15-26l-14 7-10-9 14-15 11-3 9-8 3 15c14 7 17 23 11 39z"}/><circle cx="39" cy="25" r="2.6" fill={stroke}/>{!minimal&&<path d="M49 31c8 8 9 16 5 24" fill="none" stroke={detail}/>}</>
      : type === "b" ? <><path d={minimal ? "M40 10L23 35l17 13 17-13z" : "M40 9c-7 10-19 17-19 28 0 8 9 13 19 13s19-5 19-13C59 26 47 19 40 9z"}/><path d="M35 48h10l9 12H26z"/><path d="M44 22l-9 15" fill="none" stroke={stroke} strokeWidth="3.5"/></>
      : type === "q" ? <><path d={minimal ? "M16 22l12 37h24l12-37-16 14-8-23-8 23z" : "M15 25l12 34h26l12-34-17 13-8-24-8 24z"}/>{!minimal&&<><circle cx="15" cy="23" r="4"/><circle cx="40" cy="12" r="4"/><circle cx="65" cy="23" r="4"/></>}</>
      : <><path d="M36 6h8v9h9v8h-9v12h-8V23h-9v-8h9z"/><path d={minimal ? "M23 35h34l-5 25H28z" : "M25 33c-13 0-12 15 5 21l-3 6h26l-3-6c17-6 18-21 5-21-6 0-12 4-15 8-3-4-9-8-15-8z"}/></>}
    <path d={minimal ? "M24 60h32l5 12H19z" : "M24 59h32l6 9v5H18v-5z"}/>
    {!minimal&&<path d="M27 63h26M23 69h34" fill="none" stroke={detail} strokeWidth="2"/>}
  </g></svg>;
}
