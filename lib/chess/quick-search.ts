import { lessons, puzzles, openings } from "./content.ts";
export type SearchResult = { id: string; kind: "tool" | "lesson" | "puzzle" | "opening"; title: string; detail: string; target: string; text: string };
const routes = [
  ["studio:openings","Opening rehearsal","Recall opening sample lines with either color"],
  ["studio:endgames","Endgame lab","Queen and rook mates, pawn promotion and knight underpromotion drills"],
  ["studio:journal","Study journal","Write, search, edit and export your chess notes"],
  ["studio:insights","Practice insights","Activity calendar and tactical pattern accuracy"],
  ["studio:milestones","Milestones","Achievements earned through practice"],
  ["studio","Training Studio","Opening rehearsal, endgame lab, study journal, insights, milestones"],
  ["focus","Focus session","A short guided practice queue"],
  ["learn","Learning path","Lessons from your first move"],
  ["puzzles","Puzzles","Tactics and puzzle trail"],
  ["play","Play a bot","Practice arena"],
  ["review","Game review","Import and analyze a completed game"],
  ["openings","Opening library","Ideas and your repertoire"],
  ["saved","Saved practice","Bookmarked lessons and puzzles"],
  ["arcade","Training arcade","Sprint, survival and board vision"],
  ["revenge","Mistake Revenge","Practice positions from your reviewed games"],
  ["weekly","Weekly report","Your improvement summary"],
  ["settings","Preferences","Theme, board and account settings"],
  ["reminders","Practice reminders","Build a practice habit"],
  ["connections","Connected accounts","Chess.com and Lichess"],
  ["install","Install & offline","Practice away from your connection"],
];
const normalize = (value:string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const index:SearchResult[] = [
  ...routes.map(([target,title,detail])=>({id:"tool-"+target,kind:"tool" as const,title,detail,target,text:normalize(title+" "+detail)})),
  ...lessons.map(item=>({id:"lesson-"+item.id,kind:"lesson" as const,title:item.title,detail:`Lesson · ${item.theme}`,target:item.id,text:normalize(item.title+" "+item.theme+" "+item.intro)})),
  ...puzzles.map(item=>({id:"puzzle-"+item.id,kind:"puzzle" as const,title:item.title,detail:`Puzzle · ${item.theme} · ${item.rating}`,target:item.id,text:normalize(item.title+" "+item.theme+" "+item.rating)})),
  ...openings.map(item=>({id:"opening-"+item.id,kind:"opening" as const,title:item.name,detail:`Opening · ${item.eco} · ${item.side}`,target:item.id,text:normalize(item.name+" "+item.eco+" "+item.idea)})),
];
export function searchAcademy(query:string,kind="all"):SearchResult[]{
  const terms=normalize(query.trim()).split(/\s+/).filter(Boolean);
  if(!terms.length)return index.filter(item=>kind==="all"?item.kind==="tool":item.kind===kind).slice(0,12);
  return index.filter(item=>(kind==="all"||item.kind===kind)&&terms.every(term=>item.text.includes(term)))
    .map((item,order)=>({item,order,score:terms.reduce((score,term)=>score+(normalize(item.title).startsWith(term)?6:normalize(item.title).includes(term)?3:0),item.kind==="tool"?1:0)}))
    .sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,24).map(row=>row.item);
}
