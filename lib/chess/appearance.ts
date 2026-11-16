export const colorThemes = [
  { id: "violet", name: "Infinity", description: "The original violet", accent: "#7964ce", light: "#f7f8fa", dark: "#181820" },
  { id: "ocean", name: "Ocean", description: "Deep blue & sea glass", accent: "#287b9b", light: "#f0f7fb", dark: "#101e2a" },
  { id: "forest", name: "Forest", description: "Quiet green & moss", accent: "#357b57", light: "#f2f7f2", dark: "#141f19" },
  { id: "rose", name: "Rose", description: "Dusty pink & plum", accent: "#ae537b", light: "#fcf3f6", dark: "#261a23" },
  { id: "amber", name: "Amber", description: "Warm gold & parchment", accent: "#96651e", light: "#fbf6ec", dark: "#231d14" },
  { id: "slate", name: "Slate", description: "Clean stone & graphite", accent: "#586b85", light: "#f2f5f8", dark: "#171d27" },
] as const;
export const boardPalettes = [
  { id: "violet", name: "Infinity violet", light: "#eae3f3", dark: "#a594c0" },
  { id: "sage", name: "Garden sage", light: "#e5eddf", dark: "#83a390" },
  { id: "wood", name: "Classic walnut", light: "#eee0c9", dark: "#b48d6d" },
  { id: "ocean", name: "Ocean blue", light: "#dbeaf2", dark: "#729bb6" },
  { id: "rose", name: "Rose quartz", light: "#f4e1e5", dark: "#b98597" },
  { id: "slate", name: "Slate stone", light: "#e0e5eb", dark: "#8793a5" },
  { id: "sand", name: "Golden sand", light: "#f5eacb", dark: "#baa16d" },
  { id: "cocoa", name: "Cocoa cream", light: "#e9dbce", dark: "#9d7d6c" },
  { id: "ice", name: "Arctic ice", light: "#e6f1f0", dark: "#80aeae" },
] as const;
export const pieceStyles = [
  { id: "classic", name: "Classic", description: "Familiar sculpted silhouettes" },
  { id: "modern", name: "Modern", description: "Bold shapes & rounded lines" },
  { id: "minimal", name: "Minimal", description: "Clean geometric silhouettes" },
  { id: "pixel", name: "Pixel", description: "An original retro chess set" },
] as const;
export type ColorTheme = typeof colorThemes[number]["id"];
export type BoardPalette = typeof boardPalettes[number]["id"];
export type PieceStyle = typeof pieceStyles[number]["id"];
export type Appearance = { theme: "light" | "dark"; colorTheme: ColorTheme; boardTheme: BoardPalette; pieceStyle: PieceStyle };
export const APPEARANCE_KEY = "chess-infinity-appearance-v1";
export function boardPalette(value?: string) { return boardPalettes.find(item => item.id === value) || boardPalettes[0]; }
export function colorTheme(value?: string) { return colorThemes.find(item => item.id === value) || colorThemes[0]; }
export function pieceStyle(value?: string): PieceStyle { return pieceStyles.find(item => item.id === value)?.id || "classic"; }
export function normalizeAppearance(value?: { theme?: string; colorTheme?: string; boardTheme?: string; pieceStyle?: string } | null): Appearance {
  return { theme: value?.theme === "dark" ? "dark" : "light", colorTheme: colorTheme(value?.colorTheme).id, boardTheme: boardPalette(value?.boardTheme).id, pieceStyle: pieceStyle(value?.pieceStyle) };
}
export function readAppearance(): Appearance {
  try { return normalizeAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "null")); } catch { return normalizeAppearance(); }
}
