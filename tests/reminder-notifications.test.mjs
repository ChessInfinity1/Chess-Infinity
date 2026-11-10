import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, createECDH, hkdfSync, createDecipheriv } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { build } from 'esbuild';
import vm from 'node:vm';
import { nextReminderAt, parseReminderSchedule, reminderDayAt } from '../lib/reminder-schedule.ts';
import { handleReminderRequest, sendDueReminders, validPushEndpoint } from '../lib/push-reminders.ts';

test('practice schedules use the selected timezone across midnight, weekends and daylight saving', () => {
  const s = { time:'18:00',days:[1,3,5],timeZone:'America/New_York' };
  assert.equal(new Date(nextReminderAt(s,Date.parse('2026-11-09T22:59:00Z'))).toISOString(),'2026-11-09T23:00:00.000Z');
  assert.equal(new Date(nextReminderAt(s,Date.parse('2026-11-09T23:01:00Z'))).toISOString(),'2026-11-11T23:00:00.000Z');
  assert.equal(new Date(nextReminderAt({...s,time:'00:05',days:[2]},Date.parse('2026-11-10T04:59:00Z'))).toISOString(),'2026-11-10T05:05:00.000Z');
  assert.equal(reminderDayAt(Date.parse('2026-11-10T01:00:00Z'),s.timeZone),'2026-11-09');
  assert.equal(new Date(nextReminderAt({...s,time:'09:00',days:[0]},Date.parse('2026-03-08T05:00:00Z'))).toISOString(),'2026-03-08T13:00:00.000Z');
  assert.equal(new Date(nextReminderAt({...s,time:'02:30',days:[0]},Date.parse('2026-03-08T05:00:00Z'))).toISOString(),'2026-03-08T07:30:00.000Z');
  assert.equal(new Date(nextReminderAt({...s,time:'01:30',days:[0]},Date.parse('2026-11-01T05:45:00Z'),'2026-11-01')).toISOString(),'2026-11-08T06:30:00.000Z');
  assert.equal(new Date(nextReminderAt({...s,time:'08:15',days:[2],timeZone:'Asia/Kathmandu'},Date.parse('2026-11-09T12:00:00Z'))).toISOString(),'2026-11-10T02:30:00.000Z');
  for(const bad of [{...s,days:[]},{...s,time:'25:00'},{...s,timeZone:'Mars/City'},{...s,days:[7]}])assert.throws(()=>parseReminderSchedule(bad));
});

function subscription(name='device') {
  const receiver=createECDH('prime256v1');receiver.generateKeys();
  const auth=Buffer.from(webcrypto.getRandomValues(new Uint8Array(16)));
  return { receiver, auth, json:{endpoint:'https://fcm.googleapis.com/fcm/send/'+name,expirationTime:null,keys:{auth:auth.toString('base64url'),p256dh:receiver.getPublicKey().toString('base64url')}} };
}
async function vapid() {
  const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const key=await webcrypto.subtle.exportKey('jwk',pair.privateKey);
  return {VAPID_PUBLIC_KEY:Buffer.concat([Buffer.from([4]),Buffer.from(key.x,'base64url'),Buffer.from(key.y,'base64url')]).toString('base64url'),VAPID_PRIVATE_KEY:key.d,VAPID_SUBJECT:'https://academy.example'};
}
function decrypt(body, sub) {
  const b=Buffer.from(body),salt=b.subarray(0,16),sender=b.subarray(21,21+b[20]),cipher=b.subarray(21+b[20]);
  const shared=sub.receiver.computeSecret(sender);
  const info=Buffer.concat([Buffer.from('WebPush: info\0'),sub.receiver.getPublicKey(),sender]);
  const ikm=hkdfSync('sha256',shared,sub.auth,info,32);
  const key=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16);
  const nonce=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12);
  const dec=createDecipheriv('aes-128-gcm',key,nonce);dec.setAuthTag(cipher.subarray(-16));
  const plain=Buffer.concat([dec.update(cipher.subarray(0,-16)),dec.final()]);
  let end=plain.length-1;while(plain[end]===0)end--;assert.equal(plain[end],2);
  return JSON.parse(plain.subarray(0,end).toString());
}

test('authenticated D1 push flow encrypts real payloads, isolates users, handles retries and prevents duplicate sends',async()=>{
  const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'});
  try {
    const DB=await mf.getD1Database('DB');
    for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()) {
      for(const sql of (await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8')).split('--> statement-breakpoint').filter(s=>s.trim())) await DB.prepare(sql).run();
    }
    for(const id of ['alice','bob']) await DB.prepare('INSERT INTO auth_user (id,name,email,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id,id,id+'@example.com',0,0).run();
    const env={DB,APP_ORIGIN:'https://academy.example',...await vapid()},sub=subscription();
    const now=Date.parse('2026-11-09T22:59:00Z'),schedule={time:'18:00',days:[1,2,3,4,5,6,0],timeZone:'America/New_York'};
    const request=(action,who='alice',extra={},origin=env.APP_ORIGIN)=>handleReminderRequest(new Request(env.APP_ORIGIN+'/api/reminders',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({action,subscription:sub.json,schedule,...extra})}),env,who,now,send);
    const sent=[];let result=201;
    const send=async(url,init)=>{sent.push({url,init,payload:decrypt(init.body,sub)});return new Response(null,{status:result});};
    assert.equal((await request('save',null)).status,401);
    assert.equal((await request('save','alice',{},'https://evil.example')).status,403);
    assert.equal((await request('save','alice',{schedule:{...schedule,days:[]}})).status,400);
    assert.equal((await request('save','alice',{subscription:{...sub.json,endpoint:'https://127.0.0.1/private'}})).status,400);
    assert.equal((await request('save')).status,200);
    assert.equal((await (await request('status','bob')).json()).enabled,false);
    const save=await (await request('status')).json();assert.equal(save.enabled,true);assert.equal(save.nextAt,now+60000);
    await request('remove','bob');assert.equal((await(await request('status')).json()).enabled,true);
    assert.equal((await request('test')).status,200);assert.equal(sent.length,1);assert.match(sent[0].init.headers.authorization,/^vapid /);assert.equal(sent[0].init.headers['content-encoding'],'aes128gcm');assert.match(sent[0].payload.body,/test notification/);assert.equal(sent[0].init.redirect,'error');
    assert.equal((await request('test')).status,429);
    await Promise.all([sendDueReminders(env,now+61000,send),sendDueReminders(env,now+61000,send)]);
    assert.equal(sent.length,2);assert.equal(sent[1].payload.url,'/?screen=learn');
    const after=await DB.prepare('SELECT * FROM practice_push').first();assert.equal(after.last_local_day,'2026-11-09');assert.equal(after.next_send_at,Date.parse('2026-11-10T23:00:00Z'));
    // Cloud progress suppresses an alert only for its own local practice day.
    await DB.prepare('INSERT INTO progress (user_id,data,version,updated_at) VALUES (?,?,?,?)').bind('alice',JSON.stringify({days:['2026-11-10'],practiceReminder:{enabled:true}}),1,new Date(now).toISOString()).run();
    await sendDueReminders(env,after.next_send_at,send);assert.equal(sent.length,2);
    await DB.prepare('DELETE FROM progress').run();
    const next=Date.parse('2026-11-11T23:00:00Z');
    result=503;await sendDueReminders(env,next,send);
    const retry=await DB.prepare('SELECT * FROM practice_push').first();assert.equal(retry.failures,1);assert.equal(retry.last_error,'delivery');assert.equal(retry.next_send_at,next+120000);
    result=201;await sendDueReminders(env,retry.next_send_at,send);assert.equal((await DB.prepare('SELECT failures FROM practice_push').first()).failures,0);
    // Saving preferences again cannot produce a second reminder on the same local day.
    const edit=await handleReminderRequest(new Request(env.APP_ORIGIN+'/api/reminders',{method:'POST',headers:{origin:env.APP_ORIGIN},body:JSON.stringify({action:'save',subscription:sub.json,schedule})}),env,'alice',next+180000,send);
    assert.equal((await edit.json()).nextAt,Date.parse('2026-11-12T23:00:00Z'));
    result=410;await sendDueReminders(env,Date.parse('2026-11-12T23:00:00Z'),send);assert.equal((await DB.prepare('SELECT COUNT(*) n FROM practice_push').first()).n,0);
    assert.equal((await request('save')).status,200);
    await request('remove');assert.equal((await(await request('status')).json()).enabled,false);
    result=201;
    await request('save');
    await DB.prepare('INSERT INTO progress (user_id,data,version,updated_at) VALUES (?,?,?,?)').bind('alice',JSON.stringify({days:[],practiceReminder:{enabled:false}}),1,new Date(now-1).toISOString()).run();
    const beforeStale=sent.length;await sendDueReminders(env,now+61000,send);assert.equal(sent.length,beforeStale+1,'old disabled preferences cannot cancel a newly enabled device');
    await request('remove');await request('save');
    await DB.prepare('UPDATE progress SET data=?, updated_at=? WHERE user_id=?').bind(JSON.stringify({days:[],practiceReminder:{enabled:false}}),new Date(now+1).toISOString(),'alice').run();
    const beforeOff=sent.length;await sendDueReminders(env,now+61000,send);assert.equal(sent.length,beforeOff);assert.equal((await(await request('status')).json()).enabled,false);
    await DB.prepare('DELETE FROM progress').run();
    await request('save');
    await DB.prepare('INSERT INTO progress (user_id,data,version,updated_at) VALUES (?,?,?,?)').bind('alice',JSON.stringify({days:[],practiceReminder:{enabled:true,snoozeUntil:new Date(now+660000).toISOString()}}),1,new Date(now+1).toISOString()).run();
    await sendDueReminders(env,now+61000,send);assert.equal(sent.length,beforeOff);assert.equal((await DB.prepare('SELECT next_send_at FROM practice_push').first()).next_send_at,now+660000);
    await sendDueReminders(env,now+660001,send);assert.equal(sent.length,beforeOff+1);
    await request('remove');await DB.prepare('DELETE FROM progress').run();
    const devices=await Promise.all(Array.from({length:8},(_,i)=>request('save','alice',{subscription:{...sub.json,endpoint:sub.json.endpoint+i}})));
    assert.equal(devices.filter(r=>r.status===200).length,5);assert.equal(devices.filter(r=>r.status===409).length,3);
    const cfg=await(await handleReminderRequest(new Request(env.APP_ORIGIN+'/api/reminders'),env,null)).json();assert.equal(cfg.publicKey,env.VAPID_PUBLIC_KEY);assert.ok(!JSON.stringify(cfg).includes(env.VAPID_PRIVATE_KEY));
    for(const bad of ['http://fcm.googleapis.com/x','https://fcm.googleapis.com.evil.example/x','https://fcm.googleapis.com:9000/x','https://user:pass@fcm.googleapis.com/x','https://web.push.apple.com.evil.example/x'])assert.equal(validPushEndpoint(bad),false);
  } finally {await mf.dispose();}
});

test('notification encryption runs in the actual Cloudflare Workers runtime',async()=>{
  const built=await build({stdin:{contents:`import {buildPushPayload} from '@block65/webcrypto-web-push'; export default {async fetch(request){const {message,subscription,vapid}=await request.json();const payload=await buildPushPayload(message,subscription,vapid);return Response.json({headers:payload.headers,length:payload.body.byteLength});}};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022'});
  const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-05-15'});
  try { const keys=await vapid(),r=await mf.dispatchFetch('https://academy.example/test',{method:'POST',body:JSON.stringify({message:{data:{title:'test'}},subscription:subscription().json,vapid:{publicKey:keys.VAPID_PUBLIC_KEY,privateKey:keys.VAPID_PRIVATE_KEY,subject:keys.VAPID_SUBJECT}})});assert.equal(r.status,200);const body=await r.json();assert.equal(body.length,4096);assert.equal(body.headers['content-encoding'],'aes128gcm'); } finally {await mf.dispose();}
});

test('service worker displays actual push notifications and safely opens practice on tap',async()=>{
  const events={},shown=[],messages=[],opened=[];
  const self={location:{origin:'https://academy.example'},addEventListener:(name,fn)=>events[name]=fn,registration:{showNotification:async(...args)=>shown.push(args)},clients:{matchAll:async()=>[{url:'https://academy.example/',postMessage:m=>messages.push(m),navigate:async u=>opened.push(u),focus:async()=>{}}],openWindow:async u=>opened.push(u)}};
  vm.runInNewContext(await readFile(new URL('../offline/sw-template.js',import.meta.url),'utf8'),{self,URL});
  let task;events.push({data:{json:()=>({title:'Test',body:'Works',tag:'chess-infinity-test',url:'https://evil.example'})},waitUntil:p=>task=p});await task;
  assert.equal(shown[0][0],'Test');assert.equal(shown[0][1].data.url,'/?screen=learn');assert.equal(messages[0].type,'PRACTICE_NOTIFICATION_SHOWN');
  let closed=false;events.notificationclick({notification:{close:()=>closed=true},waitUntil:p=>task=p});await task;assert.equal(closed,true);assert.deepEqual(opened,['https://academy.example/?screen=learn']);
  events.push({data:{json:()=>{throw Error('invalid')}},waitUntil:p=>task=p});await task;assert.equal(shown.length,2);assert.equal(shown[1][0],'Time for a little chess');
});
