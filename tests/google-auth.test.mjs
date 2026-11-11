import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {drizzle} from 'drizzle-orm/d1';
import {readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {createAuth} from '../lib/auth-config.ts';
import {googleCredentials,accountReturnPath,googleAuthError,googleAuthorizationUrl} from '../lib/google-auth.ts';
import {readProgress,writeProgress} from '../lib/progress-store.ts';
const origin='https://academy.example';
const secrets={GOOGLE_CLIENT_ID:'123456-test.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'test-only-google-client-secret'};
const authSecret='test-only-academy-secret-at-least-thirty-two-characters';

test('Google is available only with both server credentials; client destinations are constrained',()=>{
 assert.equal(googleCredentials({}),null);
 assert.equal(googleCredentials({GOOGLE_CLIENT_ID:secrets.GOOGLE_CLIENT_ID}),null);
 assert.equal(googleCredentials({...secrets,GOOGLE_CLIENT_ID:'placeholder'}),null);
 assert.deepEqual(googleCredentials(secrets),{clientId:secrets.GOOGLE_CLIENT_ID,clientSecret:secrets.GOOGLE_CLIENT_SECRET});
 for(const bad of ['https://evil.example/','//evil.example/','javascript:alert(1)','/login','/logout?x=1','/api/auth/get-session'])assert.equal(accountReturnPath(bad,origin),'/',bad);
 assert.equal(accountReturnPath('/?screen=focus',origin),'/?screen=focus');
 assert.equal(accountReturnPath(origin+'/?screen=settings',origin),'/?screen=settings');
 assert.match(googleAuthError('account_not_linked'),/Preferences/);
 assert.match(googleAuthError('access_denied'),/cancelled/);
 assert.ok(!googleAuthError('<script>bad</script>').includes('<script>'));
 assert.equal(googleAuthorizationUrl('https://accounts.google.com/o/oauth2/v2/auth?state=test'),'https://accounts.google.com/o/oauth2/v2/auth?state=test');
 for(const bad of ['https://accounts.google.com.evil.example/o/oauth2/v2/auth','http://accounts.google.com/o/oauth2/v2/auth','https://accounts.google.com/other','https://user:pass@accounts.google.com/o/oauth2/v2/auth'])assert.throws(()=>googleAuthorizationUrl(bad));
});

async function fixture(enabled=true){
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'});
 const binding=await mf.getD1Database('DB');
 for(const name of ['0000_tearful_gunslinger.sql','0001_overrated_the_anarchist.sql']){
  const raw=await readFile(new URL('../drizzle/'+name,import.meta.url),'utf8');
  for(const sql of raw.split('--> statement-breakpoint').filter(s=>s.trim()))await binding.prepare(sql).run();
 }
 const db=drizzle(binding),jar=new Map();
 const auth=()=>createAuth(db,authSecret,origin,enabled?secrets:{});
 const req=async(path,body,extra={})=>{
  const response=await auth().handler(new Request(origin+'/api/auth/'+path,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.70',cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...extra},...(body?{body:JSON.stringify(body)}:{})}));
  for(const cookie of response.headers.getSetCookie()){
   const pair=cookie.split(';')[0],i=pair.indexOf('='),name=pair.slice(0,i),value=pair.slice(i+1);
   if(!value||/max-age=0(?:;|$)/i.test(cookie))jar.delete(name);else jar.set(name,value);
  }
  return response;
 };
 const {privateKey,publicKey}=await generateKeyPair('RS256');
 const jwk={...await exportJWK(publicKey),kid:'test-google-key',alg:'RS256',use:'sig'};
 const remote={email:'learner@example.com',sub:'google-test-learner',verified:true,audience:secrets.GOOGLE_CLIENT_ID,calls:0,challenge:'',tampered:false};
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(input,init)=>{
  const url=String(input);
  if(url==='https://www.googleapis.com/oauth2/v3/certs')return Response.json({keys:[jwk]});
  if(url==='https://oauth2.googleapis.com/token'){
   remote.calls++;
   const body=new URLSearchParams(init.body);
   assert.equal(body.get('client_id'),secrets.GOOGLE_CLIENT_ID);
   assert.equal(body.get('client_secret'),secrets.GOOGLE_CLIENT_SECRET);
   assert.equal(body.get('redirect_uri'),origin+'/api/auth/callback/google');
   assert.ok(body.get('code_verifier'));
   const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.get('code_verifier')));
   assert.equal(Buffer.from(hash).toString('base64url'),remote.challenge);
   let idToken=await new SignJWT({email:remote.email,email_verified:remote.verified,name:'Google learner'}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setSubject(remote.sub).setIssuer('https://accounts.google.com').setAudience(remote.audience).setIssuedAt().setExpirationTime('1h').sign(privateKey);
   if(remote.tampered){const parts=idToken.split('.');const claims=JSON.parse(Buffer.from(parts[1],'base64url'));claims.email='tampered@example.com';parts[1]=Buffer.from(JSON.stringify(claims)).toString('base64url');idToken=parts.join('.');}
   return Response.json({access_token:'test-only-access-token',refresh_token:'test-only-refresh-token',id_token:idToken,token_type:'Bearer',expires_in:3600,scope:'openid email profile'});
  }
  throw Error('Unexpected outbound request in isolated OAuth test: '+url);
 };
 async function start(link=false){
  const response=await req(link?'link-social':'sign-in/social',{provider:'google',callbackURL:link?'/?screen=settings':'/?screen=focus',errorCallbackURL:'/login',disableRedirect:true});
  assert.equal(response.status,200,await response.clone().text());
  const data=await response.json(),url=new URL(data.url);
  assert.equal(url.origin,'https://accounts.google.com');
  assert.equal(url.searchParams.get('redirect_uri'),origin+'/api/auth/callback/google');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(url.searchParams.get('prompt'),'select_account');
  assert.deepEqual(new Set(url.searchParams.get('scope').split(' ')),new Set(['openid','email','profile']));
  assert.ok(url.searchParams.get('state'));
  remote.challenge=url.searchParams.get('code_challenge');
  return url;
 }
 async function finish(url){return req('callback/google?'+new URLSearchParams({state:url.searchParams.get('state'),code:'test-only-authorization-code'}));}
 async function session(){const response=await req('get-session');return response.json();}
 return {mf,binding,db,jar,req,auth,remote,start,finish,session,dispose:async()=>{globalThis.fetch=originalFetch;await mf.dispose();}};
}

test('real Google OAuth handler verifies signed responses, saves a session and returns to existing progress',async()=>{
 const f=await fixture();try{
  const options=f.auth().options;
  assert.equal(typeof options.socialProviders.google.getUserInfo,"function");
  assert.equal(options.account.accountLinking.requireLocalEmailVerified,true);
  assert.equal(options.account.encryptOAuthTokens,true);
  const callback=await f.finish(await f.start());
  assert.equal(callback.status,302);
  assert.equal(new URL(callback.headers.get('location'),origin).search,'?screen=focus');
  const signedIn=await f.session();
  assert.equal(signedIn.user.email,f.remote.email);
  assert.equal(signedIn.user.emailVerified,true);
  assert.match(callback.headers.get('set-cookie'),/HttpOnly/i);
  assert.match(callback.headers.get('set-cookie'),/Secure/i);
  await writeProgress(f.db,signedIn.user.id,{completed:['l1'],xp:50},0);
  const account=await f.binding.prepare('SELECT provider_id,access_token,refresh_token FROM auth_account WHERE user_id=?').bind(signedIn.user.id).first();
  assert.equal(account.provider_id,'google');
  assert.notEqual(account.access_token,'test-only-access-token');
  assert.notEqual(account.refresh_token,'test-only-refresh-token');
  assert.equal((await f.req('sign-out',{})).status,200);
  assert.equal((await f.finish(await f.start())).status,302);
  assert.equal((await f.session()).user.id,signedIn.user.id);
  assert.equal((await readProgress(f.db,signedIn.user.id)).data.xp,50);
  assert.equal((await f.binding.prepare('SELECT count(*) AS n FROM auth_user').first()).n,1);
 }finally{await f.dispose();}
});

test('unverified existing email is never silently linked; authenticated explicit linking preserves its ID and data',async()=>{
 const f=await fixture();try{
  const payload={name:'Existing learner',email:f.remote.email,password:'Existing-user-password-42!'};
  const signup=await f.req('sign-up/email',payload);assert.equal(signup.status,200);
  const user=(await signup.json()).user;
  await writeProgress(f.db,user.id,{completed:['l1','l2'],xp:100},0);
  await f.req('sign-out',{});
  const blocked=await f.finish(await f.start());
  assert.equal(new URL(blocked.headers.get('location'),origin).searchParams.get('error'),'account_not_linked');
  assert.equal(await f.session(),null);
  assert.equal((await f.req('sign-in/email',payload)).status,200);
  const linked=await f.finish(await f.start(true));
  assert.equal(linked.status,302);
  assert.equal(new URL(linked.headers.get('location'),origin).search,'?screen=settings');
  const row=await f.binding.prepare("SELECT user_id FROM auth_account WHERE provider_id='google'").first();
  assert.equal(row.user_id,user.id);
  await f.req('sign-out',{});
  assert.equal((await f.finish(await f.start())).status,302);
  assert.equal((await f.session()).user.id,user.id);
  assert.deepEqual((await readProgress(f.db,user.id)).data,{completed:['l1','l2'],xp:100});
  assert.equal((await f.binding.prepare('SELECT count(*) AS n FROM auth_user').first()).n,1);
 }finally{await f.dispose();}
});

test('OAuth rejects cross-origin callbacks, missing state, forged tokens and unverified Google email',async()=>{
 const f=await fixture();try{
  const external=await f.req('sign-in/social',{provider:'google',callbackURL:'https://evil.example/'});
  assert.equal(external.status,403);
  const token=await f.req('sign-in/social',{provider:'google',idToken:{token:'forged-token'}});
  assert.ok(token.status>=400);
  assert.equal(f.remote.calls,0);
  const flow=await f.start();
  const noCookie=await f.req('callback/google?'+new URLSearchParams({state:flow.searchParams.get('state'),code:'test-code'}),null,{cookie:''});
  assert.ok(new URL(noCookie.headers.get('location'),origin).searchParams.get('error'));
  assert.equal(f.remote.calls,0);
  f.remote.verified=false;
  const unverified=await f.finish(await f.start());
  assert.equal(new URL(unverified.headers.get('location'),origin).searchParams.get('error'),'unable_to_get_user_info');
  assert.equal(await f.session(),null);
  f.remote.verified=true;f.remote.audience='another-client.apps.googleusercontent.com';
  const wrongAudience=await f.finish(await f.start());
  assert.equal(new URL(wrongAudience.headers.get('location'),origin).searchParams.get('error'),'unable_to_get_user_info');
  assert.equal(await f.session(),null);
 }finally{await f.dispose();}
});

test('missing Google configuration keeps email sign-up working and issues no Google session',async()=>{
 const f=await fixture(false);try{
  const response=await f.req('sign-in/social',{provider:'google',callbackURL:'/'});
  assert.ok(response.status>=400);
  assert.equal(f.remote.calls,0);
  const signup=await f.req('sign-up/email',{name:'Email learner',email:'email-only@example.com',password:'Email-user-password-42!'});
  assert.equal(signup.status,200);
  assert.equal((await f.session()).user.email,'email-only@example.com');
 }finally{await f.dispose();}
});

test('explicit linking rejects a different verified Google email without changing the signed-in account',async()=>{
 const f=await fixture();try{
  const response=await f.req('sign-up/email',{name:'Original learner',email:f.remote.email,password:'Original-password-42!'});
  const user=(await response.json()).user;
  await writeProgress(f.db,user.id,{completed:['l1'],xp:50},0);
  f.remote.email='different@example.com';f.remote.sub='different-google-subject';
  const callback=await f.finish(await f.start(true));
  assert.equal(new URL(callback.headers.get('location'),origin).searchParams.get('error'),'email_does_not_match');
  assert.equal((await f.session()).user.id,user.id);
  assert.equal((await readProgress(f.db,user.id)).data.xp,50);
  assert.equal((await f.binding.prepare("SELECT count(*) AS n FROM auth_account WHERE provider_id='google'").first()).n,0);
 }finally{await f.dispose();}
});

test('a modified Google ID-token payload cannot create an account or session',async()=>{
 const f=await fixture();try{
  f.remote.tampered=true;
  const callback=await f.finish(await f.start());
  assert.equal(new URL(callback.headers.get('location'),origin).searchParams.get('error'),'unable_to_get_user_info');
  assert.equal(await f.session(),null);
  assert.equal((await f.binding.prepare('SELECT count(*) AS n FROM auth_user').first()).n,0);
 }finally{await f.dispose();}
});
