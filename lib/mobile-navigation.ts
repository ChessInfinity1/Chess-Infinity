export const mobileRoutes = ["dashboard","learn","puzzles","openings","play"] as const;
export function dockPosition(clientX:number,left:number,width:number) {
  if (!Number.isFinite(clientX)||!Number.isFinite(left)||!Number.isFinite(width)||width<=0) return 0;
  return Math.max(0,Math.min(mobileRoutes.length-1,(clientX-left)/width*mobileRoutes.length-.5));
}
export function dockIndex(clientX:number,left:number,width:number) { return Math.round(dockPosition(clientX,left,width)); }
