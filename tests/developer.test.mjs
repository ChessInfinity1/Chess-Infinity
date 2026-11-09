import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
import {isOwnerId} from '../lib/developer-service.ts';

test('developer privilege requires a provisioned immutable account ID, never an email or an empty setting',()=>{
 assert.equal(isOwnerId('owner','owner'),true);
 assert.equal(isOwnerId('owner',' owner '),true);
 for(const [id,owner] of [[undefined,undefined],['', ''],['person',''],['person',undefined],['owner-new','owner'],['OWNER','owner']]) assert.equal(isOwnerId(id,owner),false);
});

test('developer API enforces signed owner sessions, private output, bounded searches, CSRF, audited sign-outs and unchanged progress',async()=>{
 const built=await build({stdin:{contents:`
 import {drizzle} from 'drizzle-orm/d1';
 import {createAuth} from './lib/auth-config.ts';
 import {handleDeveloperRequest} from './lib/developer-service.ts';
 export default {async fetch(request,env){
  const auth=createAuth(drizzle(env.DB),'developer-test-secret-with-more-than-32-characters','https://academy.example');
  if(new URL(request.url).pathname.startsWith('/api/auth/'))return auth.handler(request);
  // Test-only configuration, provisioned directly by this test, never by an HTTP endpoint.
  const owner=await env.DB.prepare('SELECT value FROM test_owner LIMIT 1').first();
  return handleDeveloperRequest(request,{db:env.DB,ownerUserId:owner?.value,origin:'https://academy.example',getSession:headers=>auth.api.getSession({headers})});
 }};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'neutral',conditions:['workerd','module','import'],external:['node:*'],target:'es2022'});
 const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,d1Databases:['DB'],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat']});
 try{
  const db=await mf.getD1Database('DB');
  for(const f of ['0000_tearful_gunslinger.sql','0001_overrated_the_anarchist.sql','0002_developer_audit.sql']){
   const raw=await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8');
   for(const sql of raw.split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(sql).run();
  }
  await db.prepare('CREATE TABLE test_owner(value TEXT)').run();
  async function signup(email,name,ip){
   const response=await mf.dispatchFetch('https://academy.example/api/auth/sign-up/email',{method:'POST',headers:{origin:'https://academy.example','content-type':'application/json','cf-connecting-ip':ip},body:JSON.stringify({email,name,password:'Test-only-password-42!'})});
   assert.equal(response.status,200,await response.clone().text());
   return{user:(await response.json()).user,cookie:response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ')};
  }
  const owner=await signup('owner@example.com','Owner','192.0.2.61');
  const learner=await signup('learner@example.com','Learner','192.0.2.62');
  const other=await signup('other@example.com','Other','192.0.2.63');
  const call=(path,account=owner,extra={})=>mf.dispatchFetch('https://academy.example/api/developer/'+path,{...extra,headers:{...(account?{cookie:account.cookie}:{}),...extra.headers}});
  assert.equal((await call('overview')).status,403,'fails closed before owner provisioning');
  await db.prepare('INSERT INTO test_owner(value) VALUES(?)').bind(owner.user.id).run();
  for(const path of ['overview','users','user?id='+owner.user.id,'audit']){
   const anonymous=await call(path,null);assert.equal(anonymous.status,401);assert.match(anonymous.headers.get('cache-control'),/no-store/);
   assert.equal((await call(path,learner)).status,403);
   assert.equal((await call(path,null,{headers:{'oai-authenticated-user-id':owner.user.id,'oai-authenticated-user-email':'owner@example.com'}})).status,401);
  }
  const payload={completed:['one','two'],xp:125,puzzles:[{id:'a',correct:true},{id:'b',correct:false}],games:[{pgn:'PRIVATE-PGN'}],analyses:[{private:'review'}],puzzleRating:600,goal:'Improve tactics',accounts:{chesscom:{profile:{username:'public-username'},token:'PRIVATE-PROVIDER-TOKEN'}}};
  await db.prepare('INSERT INTO progress(user_id,data,version,updated_at) VALUES(?,?,?,?)').bind(learner.user.id,JSON.stringify(payload),3,new Date().toISOString()).run();
  const summary=await call('overview');assert.equal(summary.status,200);
  assert.equal(summary.headers.get('vary'),'Cookie');assert.match(summary.headers.get('cache-control'),/private.*no-store/);
  const stats=await summary.json();assert.equal(stats.totalAccounts,3);assert.equal(stats.savedProfiles,1);assert.equal(stats.completedLessons,2);assert.equal(stats.puzzleAttempts,2);assert.equal(stats.savedGames,1);assert.equal(stats.activeSessions,3);
  const list=await (await call('users?q=learner%40example.com')).json();assert.equal(list.total,1);assert.equal(list.users[0].email,'learner@example.com');assert.equal(list.users[0].xp,125);
  const detail=await call('user?id='+learner.user.id);const detailText=await detail.text();const data=JSON.parse(detailText);
  assert.equal(data.correctPuzzles,1);assert.equal(data.chesscom,'public-username');assert.equal(data.activeSessions,1);assert.equal(data.saveVersion,3);assert.equal(data.isOwner,false);
  for(const secret of ['PRIVATE-PGN','PRIVATE-PROVIDER-TOKEN','password','access_token','refresh_token','ip_address','user_agent'])assert.ok(!detailText.includes(secret),secret+' must never be exposed');
  assert.equal((await (await call('users?q=%25')).json()).total,0,'wildcards are literal');
  assert.equal((await (await call('users?q='+encodeURIComponent("' OR 1=1 --"))).json()).total,0,'search is parameterized');
  assert.equal((await (await call('users?page=-1')).json()).page,1);
  await db.batch(Array.from({length:21},(_,i)=>db.prepare('INSERT INTO auth_user(id,name,email,email_verified,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind('pagination-'+i,'Pagination learner '+i,'pagination'+i+'@example.com',0,Date.now(),Date.now())));
  const secondPage=await (await call('users?q=Pagination&page=2')).json();assert.equal(secondPage.total,21);assert.equal(secondPage.users.length,1);assert.equal(secondPage.limit,20);
  await db.prepare('INSERT INTO progress(user_id,data,version,updated_at) VALUES(?,?,?,?)').bind(other.user.id,'{invalid-json',1,new Date().toISOString()).run();
  const legacy=await (await call('user?id='+other.user.id)).json();assert.equal(legacy.xp,0);assert.equal(legacy.puzzleAttempts,0);assert.equal(legacy.correctPuzzles,0);
  assert.equal((await call('user?id=unknown')).status,404);
  const mutation={method:'POST',body:JSON.stringify({userId:learner.user.id}),headers:{'content-type':'application/json'}};
  assert.equal((await call('revoke-sessions',owner,mutation)).status,403,'missing origin rejected');
  assert.equal((await call('revoke-sessions',owner,{...mutation,headers:{...mutation.headers,origin:'https://evil.example'}})).status,403);
  assert.equal((await call('revoke-sessions',learner,{...mutation,headers:{...mutation.headers,origin:'https://academy.example'}})).status,403);
  const valid={...mutation,headers:{...mutation.headers,origin:'https://academy.example'}};
  await db.prepare('INSERT INTO auth_session(id,expires_at,token,created_at,updated_at,user_id) VALUES(?,?,?,?,?,?)').bind('expired-test-session',Date.now()-1000,'expired-test-token',Date.now()-2000,Date.now()-2000,learner.user.id).run();
  assert.equal((await call('revoke-sessions',owner,{...valid,body:JSON.stringify({userId:owner.user.id})})).status,409,'owner cannot revoke itself');
  assert.equal((await call('revoke-sessions',owner,{...valid,body:'x'.repeat(513)})).status,413);
  assert.equal((await call('revoke-sessions',owner,{...valid,body:'not-json'})).status,400);
  const revoked=await call('revoke-sessions',owner,valid);assert.equal(revoked.status,200);assert.equal((await revoked.json()).revoked,1);
  const check=await mf.dispatchFetch('https://academy.example/api/auth/get-session',{headers:{cookie:learner.cookie}});assert.equal(await check.json(),null,'revoked cookie no longer authenticates');
  const intact=await db.prepare('SELECT data,version FROM progress WHERE user_id=?').bind(learner.user.id).first();assert.equal(intact.version,3);assert.deepEqual(JSON.parse(intact.data),payload);
  assert.equal((await call('overview')).status,200,'owner session preserved');
  const otherSession=await mf.dispatchFetch('https://academy.example/api/auth/get-session',{headers:{cookie:other.cookie}});assert.equal((await otherSession.json()).user.id,other.user.id,'other learners unaffected');
  const audit=await (await call('audit')).json();assert.equal(audit.events.length,1);assert.equal(audit.events[0].action,'revoke_sessions');assert.equal(audit.events[0].actorId,owner.user.id);assert.equal(audit.events[0].targetId,learner.user.id);
  const relogin=await mf.dispatchFetch('https://academy.example/api/auth/sign-in/email',{method:'POST',headers:{origin:'https://academy.example','content-type':'application/json','cf-connecting-ip':'192.0.2.64'},body:JSON.stringify({email:'learner@example.com',password:'Test-only-password-42!'})});assert.equal(relogin.status,200,'signed-out learner can sign in again');
 }finally{await mf.dispose();}
});
