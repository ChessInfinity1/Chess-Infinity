import {test} from 'node:test';import assert from 'node:assert/strict';import {initialProgress} from '../lib/chess/content.ts';import {parseProgressBackup} from '../lib/progress-backup.ts';
test('study notes and drill results survive supported backups and invalid data cannot overwrite progress',()=>{
  const p=structuredClone(initialProgress);p.study={attempts:[{id:'one',kind:'endgame',exerciseId:'endgame-rook-net-white-left',clean:true,at:'2026-11-15T18:00:00.000Z'}],notes:[{id:'note',title:'Rook mate',body:'Bring my king before sealing the rank.',topic:'Endgames',archived:true,updatedAt:'2026-11-15T18:00:00.000Z'}]};assert.deepEqual(parseProgressBackup(JSON.stringify({data:p})).study,p.study);
  assert.throws(()=>parseProgressBackup(JSON.stringify({...p,study:{...p.study,notes:[{...p.study.notes[0],body:'x'.repeat(4001)}]}})),/study.notes/);
  const legacy={...p};delete legacy.study;assert.deepEqual(parseProgressBackup(JSON.stringify(legacy)).study,{attempts:[],notes:[]});
});
