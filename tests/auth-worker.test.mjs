import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
test('credential hashing, sessions and D1 saves execute inside the actual Workers runtime',async()=>{
 const built=await build({stdin:{contents:`
 import {drizzle} from 'drizzle-orm/d1';
 import {createAuth} from './lib/auth-config.ts';
 import {readProgress,writeProgress} from './lib/progress-store.ts';
 export default {async fetch(request,env){
  const db=drizzle(env.DB);
  const auth=createAuth(db,'worker-test-secret-at-least-32-characters','https://academy.example');
  if(new URL(request.url).pathname.startsWith('/api/auth/')) return auth.handler(request);
  const session=await auth.api.getSession({headers:request.headers});
  if(!session)return new Response(null,{status:401});
  if(request.method==='PUT'){const b=await request.json();return Response.json(await writeProgress(db,session.user.id,b.data,b.version));}
  return Response.json(await readProgress(db,session.user.id));
 }};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'neutral',conditions:['workerd','module','import'],external:['node:*'],target:'es2022'});
 const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,d1Databases:['DB'],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat']});
 try{
  const db=await mf.getD1Database('DB');
  for(const f of ['0000_tearful_gunslinger.sql','0001_overrated_the_anarchist.sql']){
   const raw=await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8');
   for(const sql of raw.split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(sql).run();
  }
  const headers={origin:'https://academy.example','content-type':'application/json','cf-connecting-ip':'192.0.2.50'};
  const payload={name:'Worker test',email:'worker@example.com',password:'Worker-integration-test-42!'};
  const signup=await mf.dispatchFetch('https://academy.example/api/auth/sign-up/email',{method:'POST',headers,body:JSON.stringify(payload)});
  assert.equal(signup.status,200,await signup.clone().text());
  const cookie=signup.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
  const authed={...headers,cookie};
  assert.equal((await mf.dispatchFetch('https://academy.example/api/progress')).status,401);
  const save=await mf.dispatchFetch('https://academy.example/api/progress',{method:'PUT',headers:authed,body:JSON.stringify({data:{completed:['l1'],xp:50},version:0})});
  assert.equal(save.status,200);assert.equal((await save.json()).version,1);
  const read=await mf.dispatchFetch('https://academy.example/api/progress',{headers:authed});
  assert.equal((await read.json()).data.xp,50);
  const logout=await mf.dispatchFetch('https://academy.example/api/auth/sign-out',{method:'POST',headers:authed,body:'{}'});assert.equal(logout.status,200);
  assert.equal((await mf.dispatchFetch('https://academy.example/api/progress',{headers:authed})).status,401);
  const login=await mf.dispatchFetch('https://academy.example/api/auth/sign-in/email',{method:'POST',headers,body:JSON.stringify(payload)});assert.equal(login.status,200,await login.clone().text());
  const again=login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
  const saved=await mf.dispatchFetch('https://academy.example/api/progress',{headers:{...headers,cookie:again}});assert.equal((await saved.json()).data.xp,50);
 }finally{await mf.dispose();}
});
