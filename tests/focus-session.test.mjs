import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { initialProgress, lessons, puzzles } from "../lib/chess/content.ts";
import { createFocusSession, duePractice, completeFocusStep, appendFocusSession } from "../lib/chess/focus.ts";
import { parseProgressBackup, validateProgress } from "../lib/progress-backup.ts";
const now = new Date("2026-11-11T12:00:00Z");
test("focus sessions match their size and contain unique, playable lessons and puzzles", () => {
  for (const [minutes, count] of [[5,3],[10,5],[15,7]]) {
    const session = createFocusSession(structuredClone(initialProgress), minutes, `session-${minutes}`, now);
    assert.equal(session.steps.length, count);
    assert.equal(new Set(session.steps.map(item => item.id)).size, count);
    assert.equal(session.steps[0].kind, "lesson");
    for (const step of session.steps) {
      const exercise = (step.kind === "lesson" ? lessons : puzzles).find(item => item.id === step.id);
      assert.ok(exercise);
      const game = new Chess(exercise.fen);
      for (const uci of exercise.line) game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
    }
  }
});
test("due reviews precede fresh puzzles, ignore invalid and future review IDs", () => {
  const p = structuredClone(initialProgress);
  p.reviews = {
    [puzzles[7].id]: {due:"2026-11-09T12:00:00Z",interval:1},
    [puzzles[2].id]: {due:"2026-11-10T12:00:00Z",interval:1},
    [puzzles[1].id]: {due:"2026-11-12T12:00:00Z",interval:1},
    [lessons[3].id]: {due:"2026-11-10T12:00:00Z",interval:1},
    deleted: {due:"2026-11-01T12:00:00Z",interval:1},
  };
  assert.deepEqual(duePractice(p,now),[puzzles[7].id,puzzles[2].id,lessons[3].id]);
  const session = createFocusSession(p,5,"reviews",now);
  assert.equal(session.steps[0].id,lessons[3].id);
  assert.deepEqual(session.steps.slice(1).map(item=>item.id),[puzzles[7].id,puzzles[2].id]);
  assert.ok(session.steps.every(step=>step.reason.includes("review")));
});
test("fresh sessions avoid the previous session's puzzles and adapt to recorded difficulty", () => {
  const p = structuredClone(initialProgress);
  p.puzzleRating = 1500;
  const first = createFocusSession(p,15,"first",now);
  p.focusSessions = [first];
  const second = createFocusSession(p,15,"second",now);
  const prior = new Set(first.steps.slice(1).map(step=>step.id));
  assert.ok(second.steps.slice(1).every(step=>!prior.has(step.id)));
  const difficulty = puzzles.find(item=>item.id===first.steps[1].id).rating;
  assert.ok(Math.abs(difficulty-1500)<=100);
});
test("fresh sessions mix patterns instead of repeating one family of generated drills", () => {
  const session = createFocusSession(structuredClone(initialProgress),15,"variety",now);
  const selected = session.steps.slice(1).map(step=>puzzles.find(puzzle=>puzzle.id===step.id));
  assert.ok(new Set(selected.map(puzzle=>puzzle.theme)).size>=4);
  assert.ok(selected.filter(puzzle=>puzzle.id.startsWith("infinity-promotion-")).length<=1);
  assert.ok(selected.every(puzzle=>Math.abs(puzzle.rating-initialProgress.puzzleRating)<=250));
});
test("only the current step advances; repeated results and unrelated practice do not count", () => {
  const session = createFocusSession(structuredClone(initialProgress),5,"s",now);
  let sessions = [session];
  const [first,second] = session.steps;
  assert.deepEqual(completeFocusStep(sessions,"other",first.id,"lesson",true,now),sessions);
  assert.deepEqual(completeFocusStep(sessions,"s",second.id,"puzzle",true,now),sessions);
  assert.deepEqual(completeFocusStep(sessions,"s",first.id,"puzzle",true,now),sessions);
  sessions = completeFocusStep(sessions,"s",first.id,"lesson",false,now);
  assert.equal(sessions[0].steps[0].clean,false);
  assert.equal(sessions[0].finishedAt,undefined);
  assert.deepEqual(completeFocusStep(sessions,"s",first.id,"lesson",true,now),sessions);
  for (const step of session.steps.slice(1)) sessions = completeFocusStep(sessions,"s",step.id,step.kind,true,now);
  assert.equal(sessions[0].finishedAt,now.toISOString());
  assert.deepEqual(completeFocusStep(sessions,"s",second.id,"puzzle",false,now),sessions);
});
test("focus checklist survives authenticated save validation and progress backup round trips", () => {
  const p = structuredClone(initialProgress);
  p.focusSessions = [createFocusSession(p,10,"saved",now)];
  p.focusSessions = completeFocusStep(p.focusSessions,"saved",p.focusSessions[0].steps[0].id,"lesson",true,now);
  assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(p))).focusSessions,p.focusSessions);
  assert.deepEqual(parseProgressBackup(JSON.stringify({data:p})).focusSessions,p.focusSessions);
  assert.throws(()=>validateProgress({...p,focusSessions:[{...p.focusSessions[0],minutes:999}]}),/focusSessions/);
  assert.equal(validateProgress({...p,focusSessions:undefined}).completed.length,0);
});
test("focus history is bounded without mutating old progress or duplicating IDs", () => {
  let sessions = [];
  for (let i=0;i<30;i++) sessions = appendFocusSession(sessions,createFocusSession(initialProgress,5,`s${i}`,now));
  assert.equal(sessions.length,20);
  assert.equal(sessions[0].id,"s10");
  const replacement = {...sessions.at(-1),minutes:15};
  const updated = appendFocusSession(sessions,replacement);
  assert.equal(updated.length,20);
  assert.equal(updated.at(-1).minutes,15);
  assert.equal(sessions.at(-1).minutes,5);
});
