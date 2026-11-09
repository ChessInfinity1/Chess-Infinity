import { Chess, type Move } from "chess.js";
import type { Evaluation, EngineLine } from "./engine";
export type BotStyle = "curious" | "learner" | "balanced" | "attacking" | "defensive" | "positional" | "tactical";
export type TrainingBot = { id: string; name: string; tier: "Learning" | "Club" | "Challenge"; style: BotStyle; skill: number; ms: number; piece: string; color: string; tagline: string; description: string };
export const trainingBots: TrainingBot[] = [
  {id:"pip",name:"Pip",tier:"Learning",style:"curious",skill:0,ms:220,piece:"p",color:"mint",tagline:"Your first sparring partner",description:"Explores legal moves, often misses threats, and gives you room to practice."},
  {id:"moss",name:"Moss",tier:"Learning",style:"learner",skill:0,ms:260,piece:"n",color:"mint",tagline:"One idea at a time",description:"Uses simple development, capture, and piece-safety rules. Still overlooks deeper tactics."},
  {id:"luna",name:"Luna",tier:"Learning",style:"balanced",skill:2,ms:380,piece:"b",color:"violet",tagline:"A step up in calculation",description:"Lower-strength Stockfish play. A tougher next step after the gentle beginners."},
  {id:"ember",name:"Ember",tier:"Club",style:"attacking",skill:5,ms:550,piece:"n",color:"coral",tagline:"Meet the attacking spirit",description:"Favors checks, captures, and pressure when the engine's candidate moves are close."},
  {id:"atlas",name:"Atlas",tier:"Club",style:"defensive",skill:7,ms:650,piece:"r",color:"blue",tagline:"Break through the defenses",description:"Favors castling and escaping attacks among similarly evaluated engine moves."},
  {id:"iris",name:"Iris",tier:"Club",style:"positional",skill:9,ms:750,piece:"b",color:"mint",tagline:"Win the little battles",description:"Prefers central squares and active minor pieces when engine evaluations are close."},
  {id:"tempo",name:"Tempo",tier:"Club",style:"tactical",skill:11,ms:850,piece:"q",color:"gold",tagline:"Every threat matters",description:"Favors forcing moves among engine candidates. Practice checking threats on every turn."},
  {id:"orion",name:"Orion",tier:"Challenge",style:"balanced",skill:14,ms:1000,piece:"r",color:"blue",tagline:"A demanding practice partner",description:"Higher-strength Stockfish with a longer search. Make your plans count."},
  {id:"vega",name:"Vega",tier:"Challenge",style:"balanced",skill:18,ms:1200,piece:"q",color:"violet",tagline:"Keep your calculation sharp",description:"Near-full skill with a longer thinking budget for a tough local challenge."},
  {id:"stockfish",name:"Stockfish",tier:"Challenge",style:"balanced",skill:20,ms:1800,piece:"k",color:"gold",tagline:"Full skill. No favors.",description:"Full Stockfish skill within this device's 1.8-second search budget."},
  {id:"custom",name:"Custom Stockfish",tier:"Challenge",style:"balanced",skill:5,ms:650,piece:"k",color:"violet",tagline:"Set your own challenge",description:"Use the full 0–20 skill slider to tune the engine to your practice."},
];
export function botById(id: string) { return trainingBots.find(b=>b.id===id) || trainingBots[trainingBots.length-1]; }
export function uci(move: Move) { return move.from+move.to+(move.promotion||""); }
const values: Record<string,number> = {p:1,n:3,b:3.2,r:5,q:9,k:0};
function details(g: Chess, move: Move) {
  const attackedBefore = g.isAttacked(move.from, move.color === "w" ? "b" : "w");
  g.move({from:move.from,to:move.to,promotion:move.promotion});
  const mate = g.isCheckmate();
  const check = g.inCheck();
  const exposed = g.isAttacked(move.to, g.turn());
  const center = 3.5 - (Math.abs(move.to.charCodeAt(0)-100.5)+Math.abs(Number(move.to[1])-4.5))/2;
  const development = ["n","b"].includes(move.piece) && move.from[1] === (move.color === "w" ? "1" : "8") ? 1 : 0;
  const castle = move.isKingsideCastle() || move.isQueensideCastle();
  g.undo();
  return {mate,check,exposed,center,development,castle,escape:attackedBefore && !exposed};
}
export function stylePreference(fen: string, move: Move, style: BotStyle) {
  const d=details(new Chess(fen),move);
  const capture=values[move.captured||""]||0;
  if(d.mate) return 10000;
  if(style==="attacking") return Number(d.check)*1.8+capture*.3+d.center*.12;
  if(style==="tactical") return Number(d.check)*1.3+capture*.65+Number(!!move.promotion)*2;
  if(style==="defensive") return Number(d.castle)*2+Number(d.escape)*1.6-Number(d.exposed)*.5;
  if(style==="positional") return d.center*.6+d.development*1.3+Number(d.castle)*.7;
  return capture*2+d.center*.25+d.development+Number(d.castle)*1.5+Number(d.check)*.3-(d.exposed ? values[move.piece]*1.4 : 0)+Number(!!move.promotion)*7;
}
export function beginnerMove(fen: string, style: "curious" | "learner", random = Math.random): string | null {
  const g=new Chess(fen); if(g.isGameOver()) return null;
  const moves=g.moves({verbose:true});
  const scored=moves.map(m=>({m,score:stylePreference(fen,m,"learner")}));
  const mate=scored.find(x=>x.score>=10000); if(mate) return uci(mate.m);
  const pick = (items: typeof scored) => items[Math.min(items.length-1,Math.max(0,Math.floor(random()*items.length)))];
  if(style==="curious" || random()<.15) return uci(pick(scored).m);
  scored.sort((a,b)=>b.score-a.score);
  return uci(pick(scored.filter(x=>x.score>=scored[0].score-1.5)).m);
}
function quality(line: EngineLine, side: number) {
  const mate=line.mate===null ? null : line.mate*side;
  return mate===null ? line.score*side : Math.sign(mate)*(10000-Math.min(999,Math.abs(mate)));
}
export function styledEngineMove(fen: string, bot: TrainingBot, evaluation: Evaluation): string {
  const g=new Chess(fen); const legal=g.moves({verbose:true});
  const base=legal.find(m=>uci(m)===evaluation.best);
  if(!base) throw new Error("The engine did not return a legal move. Resume practice to retry.");
  if(bot.style==="balanced") return uci(base);
  const side=g.turn()==="w"?1:-1;
  const lines=(evaluation.lines||[]).filter(l=>l.depth===evaluation.depth && l.pv[0] && legal.some(m=>uci(m)===l.pv[0]));
  if(!lines.length) return uci(base);
  const best=Math.max(...lines.map(l=>quality(l,side)));
  const options=lines.filter(l=>best-quality(l,side)<=.8).map(l=>({line:l,move:legal.find(m=>uci(m)===l.pv[0])!}));
  options.sort((a,b)=>(quality(b.line,side)+.22*stylePreference(fen,b.move,bot.style))-(quality(a.line,side)+.22*stylePreference(fen,a.move,bot.style)));
  return options.length ? uci(options[0].move) : uci(base);
}
export async function botReply(fen: string, bot: TrainingBot, analyze: (fen:string,ms:number,skill:number,multiPV:number)=>Promise<Evaluation>, customSkill = bot.skill) {
  if(new Chess(fen).isGameOver()) return null;
  if(bot.style==="curious" || bot.style==="learner") {
    await new Promise(resolve=>setTimeout(resolve,bot.ms));
    return beginnerMove(fen,bot.style);
  }
  const count=bot.style==="balanced"?1:4;
  const result=await analyze(fen,bot.ms,bot.id==="custom"?customSkill:bot.skill,count);
  return styledEngineMove(fen,bot,result);
}
