import { test } from "node:test";
import assert from "node:assert/strict";
import { initialProgress } from "../lib/chess/content.ts";
import { applyChessComPage, chessComGames, parseChessComPage, syncChessComArchives } from "../lib/chess/archive-sync.ts";
import { mergeImportedGames } from "../lib/chess/imported-games.ts";

const makePage = (start, count, nextCursor = null) => parseChessComPage({
  profile: { username: "TestPlayer", name: "Test player" }, stats: {}, syncedAt: "2026-11-08T12:00:00.000Z", nextCursor,
  games: Array.from({length:count}, (_, i) => ({uuid: String(start+i), end_time:1794000000-start-i, rules:"chess", pgn:'[White "TestPlayer"]\n[Black "Opponent"]\n[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1'})),
});

test("full archive sync advances beyond 40 and 150, counts unique games and survives serialization", async () => {
  let progress = structuredClone(initialProgress);
  const observed = [], cursors = [];
  const result = await syncChessComArchives({
    existing: [], all:true, signal:new AbortController().signal,
    loadPage: async cursor => { cursors.push(cursor); const start = cursor ? Number(cursor.split(":")[1]) : 0; return makePage(start, 40, start < 160 ? `2026/11:${start+40}` : null); },
    onPage(page, counts) { progress = applyChessComPage(progress, page, true); observed.push(counts.total); },
  });
  assert.deepEqual(observed, [40,80,120,160,200]);
  assert.equal(result.added,200);
  assert.equal(cursors.length,5);
  const saved = JSON.parse(JSON.stringify(progress));
  assert.equal(chessComGames(saved.games,"testplayer").length,200);
  assert.equal(saved.accounts.chesscom.nextCursor,null);
  assert.equal(saved.accounts.chesscom.historyComplete,true);
  assert.equal(mergeImportedGames(saved.games,saved.games).length,200);
});

test("refresh keeps older games, ignores legacy latest-batch IDs, and retains the history cursor", () => {
  let progress = applyChessComPage(structuredClone(initialProgress),makePage(0,80,"2026/10:15"),true);
  progress.accounts.chesscom.recentGameIds = progress.games.slice(0,40).map(g=>g.id);
  progress = applyChessComPage(progress,makePage(0,40,"2026/11:40"),false);
  assert.equal(chessComGames(progress.games,"testplayer").length,80);
  assert.equal(progress.accounts.chesscom.nextCursor,"2026/10:15");
  assert.equal(progress.accounts.chesscom.recentGameIds,undefined);
  progress = applyChessComPage(progress,makePage(80,40,null),true);
  assert.equal(progress.games.length,120);
  assert.equal(progress.accounts.chesscom.nextCursor,null);
});

test("a new recent window exposes its missing history instead of falsely remaining complete", () => {
  let progress = applyChessComPage(structuredClone(initialProgress),makePage(0,40,null),true);
  progress = applyChessComPage(progress,makePage(100,40,"2026/11:40"),false);
  assert.equal(progress.games.length,80);
  assert.equal(progress.accounts.chesscom.nextCursor,"2026/11:40");
  assert.equal(progress.accounts.chesscom.historyComplete,false);
});

test("refreshing duplicate games reports zero new games, and latest-only makes one request", async () => {
  const page = makePage(0,40,"2026/11:40");
  let requests = 0;
  const result = await syncChessComArchives({existing:page.games,all:false,signal:new AbortController().signal,loadPage:async()=>{requests++;return page;},onPage(){}});
  assert.equal(requests,1);
  assert.equal(result.total,40);
  assert.equal(result.added,0);
});

test("pause and provider failures preserve completed pages and do not report completion", async () => {
  for (const mode of ["pause","failure"]) {
    let progress = structuredClone(initialProgress), requests=0;
    const controller=new AbortController();
    await assert.rejects(syncChessComArchives({existing:[],all:true,signal:controller.signal,
      loadPage:async()=>{if(++requests===2)throw new Error("Chess.com rate limit reached");return makePage(0,40,"2026/11:40");},
      onPage(page){progress=applyChessComPage(progress,page,true);if(mode==="pause")controller.abort();}
    }),mode==="pause"?{name:"AbortError"}:/rate limit/);
    assert.equal(progress.games.length,40);
    assert.equal(progress.accounts.chesscom.nextCursor,"2026/11:40");
    assert.equal(progress.accounts.chesscom.historyComplete,false);
    assert.equal(requests,mode==="pause"?1:2);
  }
});

test("repeated archive cursors stop rather than spinning forever", async () => {
  let requests=0;
  await assert.rejects(syncChessComArchives({existing:[],all:true,signal:new AbortController().signal,loadPage:async()=>{requests++;return makePage(0,40,"2026/11:40");},onPage(){}}),/stopped advancing/);
  assert.equal(requests,2);
});

test("unreadable pages and illegal games cannot inflate the imported count", () => {
  assert.throws(()=>parseChessComPage({profile:{},games:[]}),/unreadable/);
  const page=parseChessComPage({profile:{username:"TestPlayer"},games:[{uuid:"bad",pgn:"1. Qh9"}],nextCursor:null});
  assert.equal(page.games.length,0);
  assert.equal(page.rejected,1);
  const others = [{source:"Chess.com",white:"Someone",black:"Else"},{source:"Lichess",white:"TestPlayer",black:"Else"}];
  assert.equal(chessComGames(others,"TestPlayer").length,0);
});
