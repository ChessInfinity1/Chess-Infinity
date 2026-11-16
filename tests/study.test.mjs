import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {initialProgress,openings,puzzles,lessons} from '../lib/chess/content.ts';
import {endgameDrills} from '../lib/chess/endgames.ts';
import {openingLine,openingMove,recordStudy,saveStudyNote,studyInsights,studyMilestones,localStudyDay} from '../lib/chess/study.ts';
import {searchAcademy} from '../lib/chess/quick-search.ts';
test('all 16 endgame drills have distinct legal positions and fulfill their stated objectives',()=>{
  assert.equal(endgameDrills.length,16);assert.equal(new Set(endgameDrills.map(d=>d.fen)).size,16);
  for(const drill of endgameDrills){const board=new Chess(drill.fen),player=board.turn();assert.equal(board.isGameOver(),false,drill.id);
    const enemy=board.board().flat().find(p=>p?.type==='k'&&p.color!==player);assert.equal(board.isAttacked(enemy.square,player),false,drill.id);
    for(const uci of drill.line)board.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
    if(drill.theme.includes('mates'))assert.equal(board.isCheckmate(),true,drill.id);
    if(drill.theme==='Promotion'){assert.ok(board.board().flat().some(p=>p?.type==='q'&&p.color===player));assert.equal(board.isStalemate(),false);}
    if(drill.theme==='Knight promotion'){assert.equal(drill.line[0][4],'n');assert.ok(board.board().flat().some(p=>p?.type==='n'&&p.color===player));assert.ok(!board.board().flat().some(p=>p?.type==='r'));}
  }
});
test('every sample opening can be recalled from both sides and rejects wrong moves without changing the line',()=>{
  for(const opening of openings){const line=openingLine(opening);assert.ok(line.length>1);for(let i=0;i<line.length;i++){const move=line[i];assert.equal(openingMove(opening,i,move.color,move.uci.slice(0,2),move.uci.slice(2,4),move.uci[4]),true,opening.id);assert.throws(()=>openingMove(opening,i,move.color==='w'?'b':'w',move.uci.slice(0,2),move.uci.slice(2,4)),/Wait/);}
    const other=new Chess().moves({verbose:true}).find(m=>m.from+m.to!==line[0].uci);assert.equal(openingMove(opening,0,'w',other.from,other.to),false);assert.equal(openingLine(opening)[0].uci,line[0].uci);
  }
});
test('studio completion rewards once per drill per local day and never changes puzzle rating or imported games',()=>{
  const p=structuredClone(initialProgress),at=new Date(2026,10,15,18).toISOString(),a={id:'first',kind:'opening',exerciseId:'italian',clean:true,at};
  const one=recordStudy(p,a);assert.equal(one.xp,10);assert.equal(one.study.attempts.length,1);assert.strictEqual(recordStudy(one,a),one);assert.equal(one.days[0],localStudyDay(new Date(at)));
  const again=recordStudy(one,{...a,id:'retry',clean:false});assert.equal(again.xp,10);assert.equal(again.study.attempts.length,2);
  const next=recordStudy(again,{...a,id:'tomorrow',at:new Date(2026,10,16,18).toISOString()});assert.equal(next.xp,20);assert.equal(next.puzzleRating,p.puzzleRating);assert.deepEqual(next.games,p.games);assert.deepEqual(next.puzzles,[]);assert.deepEqual(p,initialProgress);
});
test('journal upserts preserve practice history, archive restores, trims, and protects the capacity limit',()=>{
  const attempt={id:'one',kind:'endgame',exerciseId:'test',clean:false,at:'2026-11-15T12:00:00.000Z'};const note={id:'note',title:'  A rook lesson  ',body:'  Keep the king active.  ',topic:'Endgames',updatedAt:'2026-11-15T12:00:00.000Z'};
  const first=saveStudyNote({attempts:[attempt],notes:[]},note);assert.equal(first.notes[0].title,'A rook lesson');assert.equal(first.notes[0].body,'Keep the king active.');assert.deepEqual(first.attempts,[attempt]);
  const archived=saveStudyNote(first,{...first.notes[0],archived:true});const restored=saveStudyNote(archived,{...archived.notes[0],archived:false});assert.equal(restored.notes.length,1);assert.equal(restored.notes[0].archived,false);
  assert.throws(()=>saveStudyNote(first,{...note,title:'  '}),/title/);const full={attempts:[],notes:Array.from({length:100},(_,i)=>({...note,id:String(i)}))};assert.throws(()=>saveStudyNote(full,note),/100/);assert.equal(saveStudyNote(full,{...note,id:'0'}).notes.length,100);
});
test('insights use local days, filter unknown and future attempts, and show honest small samples',()=>{
  const now=new Date(2026,10,15,18),p=structuredClone(initialProgress);p.days=['2026-11-14','2026-11-15','2026-11-16'];p.puzzles=[{id:puzzles[0].id,correct:true,at:new Date(2026,10,15,9).toISOString()},{id:puzzles[0].id,correct:false,at:new Date(2026,10,14,9).toISOString()},{id:'unknown',correct:true,at:now.toISOString()},{id:puzzles[0].id,correct:true,at:new Date(2026,10,15,19).toISOString()}];p.completed=[lessons[0].id];p.lessonDates={[lessons[0].id]:'2026-11-15'};
  const data=studyInsights(p,7,now);assert.equal(data.days.length,7);assert.equal(data.days.at(-1).day,'2026-11-15');assert.equal(data.active,2);assert.equal(data.attempts,2);assert.equal(data.rate,50);assert.equal(data.lessons,1);assert.equal(data.patterns[0].attempts,2);assert.equal(data.days.at(-1).actions,2);
  assert.equal(studyInsights(initialProgress,28,now).rate,null);
});
test('milestones use distinct real completions, actual study results and consecutive calendar days',()=>{
  const p=structuredClone(initialProgress);p.completed=[lessons[0].id,lessons[0].id,'unknown'];p.puzzles=Array.from({length:10},()=>({id:puzzles[0].id,correct:true,at:'2026-11-15T12:00:00Z'}));p.days=['2026-11-13','2026-11-14','2026-11-15','2026-11-15','invalid'];
  const all=studyMilestones(p);assert.equal(all.find(i=>i.id==='first-lesson').earned,true);assert.equal(all.find(i=>i.id==='ten-lessons').value,1);assert.equal(all.find(i=>i.id==='ten-puzzles').value,1);assert.equal(all.find(i=>i.id==='three-days').earned,true);assert.equal(all.find(i=>i.id==='opening').earned,false);
});
test('quick search covers tools and content, normalizes accents, filters categories and ignores empty whitespace',()=>{
  assert.ok(searchAcademy('journal').some(r=>r.kind==='tool'));assert.ok(searchAcademy('reti').some(r=>r.title==='Réti Opening'));assert.ok(searchAcademy('forks','puzzle').length);assert.ok(searchAcademy('forks','puzzle').every(r=>r.kind==='puzzle'));assert.deepEqual(searchAcademy('   '),searchAcademy(''));assert.equal(searchAcademy('xyz-no-such-pattern').length,0);assert.ok(searchAcademy('','opening').every(r=>r.kind==='opening'));
});
