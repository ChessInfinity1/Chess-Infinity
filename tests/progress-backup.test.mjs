import { test } from "node:test";
import assert from "node:assert/strict";
import { initialProgress } from "../lib/chess/content.ts";
import { parseProgressBackup, validateProgress } from "../lib/progress-backup.ts";
test("migration preserves lessons, puzzle history, games and linked public profiles for plain exports and device envelopes",()=>{
 const data={...initialProgress,completed:["l1"],xp:50,puzzles:[{id:"p1",correct:true,at:"2026-11-08"}],games:[{id:"game-1",pgn:"1. e4 e5 2. Nf3 Nc6 *",white:"Alice",black:"Bob",result:"*",source:"PGN import",date:"2026-11-08"}],accounts:{chesscom:{profile:{username:"alice",avatar:"https://example.com/avatar.png"}}}};
 assert.deepEqual(parseProgressBackup(JSON.stringify(data)),data);
 assert.deepEqual(parseProgressBackup(JSON.stringify({data,version:123,pending:false})),data);
 assert.equal(validateProgress(data).xp,50);
});
test("migration rejects corrupt records and illegal PGN without accepting secrets or identity overrides",()=>{
 assert.throws(()=>parseProgressBackup('{}'));
 assert.throws(()=>parseProgressBackup(JSON.stringify({...initialProgress,puzzles:[{id:"p1",correct:"yes"}]})),/Invalid progress/);
 assert.throws(()=>parseProgressBackup(JSON.stringify({...initialProgress,games:[{id:"bad",pgn:"1. e9 *",white:"A",black:"B",result:"*",source:"PGN",date:"today"}]})),/invalid PGN/);
 const p=parseProgressBackup(JSON.stringify({...initialProgress,userId:"somebody-else",accounts:{lichess:{profile:{username:"alice"},token:"secret"}}}));
 assert.equal(p.userId,undefined); assert.equal(p.accounts.lichess.token,undefined);
});
