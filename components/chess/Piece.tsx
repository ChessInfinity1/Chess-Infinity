"use client";
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
