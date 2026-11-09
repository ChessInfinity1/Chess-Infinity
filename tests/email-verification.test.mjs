import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
import {createVerificationEmailSender,emailDeliveryConfigured,EmailDeliveryError} from '../lib/verification-email.ts';

test('email transports confirm provider acceptance and never report failure as a sent code',async()=>{
 for(const provider of ['brevo','resend']){
  let recorded;
  const env={EMAIL_PROVIDER:provider,EMAIL_API_KEY:'test-only-provider-key',EMAIL_FROM:'verify@example.com'};
  const sender=createVerificationEmailSender(env,async(url,options)=>{
   recorded={url,options,payload:JSON.parse(options.body)};
   return Response.json(provider==='brevo'?{messageId:'test-message'}:{id:'test-message'},{status:201});
  });
  assert.equal(emailDeliveryConfigured(env),true);
  await sender({email:'learner@example.com',otp:'123456'});
  assert.equal(recorded.url,provider==='brevo'?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails');
  assert.equal(recorded.payload.subject,'Verify your email · Chess Infinity');
  const content=provider==='brevo'?recorded.payload.htmlContent:recorded.payload.text;
  assert.match(content,/123456/);assert.match(content,/10 minutes/);
  assert.deepEqual(recorded.payload.to,provider==='brevo'?[{email:'learner@example.com'}]:['learner@example.com']);
  assert.ok(recorded.options.signal instanceof AbortSignal);
  for(const failure of [()=>Response.json({error:'provider-private-error'},{status:403}),()=>Response.json({}),()=>{throw Error('network-private-error');}]){
   const broken=createVerificationEmailSender(env,async()=>failure());
   await assert.rejects(()=>broken({email:'learner@example.com',otp:'123456'}),e=>e instanceof EmailDeliveryError&&!e.message.includes('private-error'));
  }
  await assert.rejects(()=>sender({email:'bad\r\nBcc: victim@example.com',otp:'123456'}),EmailDeliveryError);
  await assert.rejects(()=>sender({email:'learner@example.com',otp:'<html>'}),EmailDeliveryError);
 }
 assert.equal(createVerificationEmailSender({}),undefined);
 assert.equal(emailDeliveryConfigured({EMAIL_PROVIDER:'resend',EMAIL_API_KEY:'key',EMAIL_FROM:'not-an-email'}),false);
});

test('signup OTP uses hashed, expiring, single-use codes; blocks pending sessions; preserves legacy accounts and progress',async()=>{
 const built=await build({stdin:{contents:`
 import {drizzle} from 'drizzle-orm/d1';
 import {createAuth} from './lib/auth-config.ts';
 export default {async fetch(request,env){
  const cfg=await env.DB.prepare('SELECT mode FROM test_email_config LIMIT 1').first();
  const send=cfg.mode==='no-sender'?undefined:async(data)=>{
   if(cfg.mode==='failure')throw Error('fixture provider unavailable');
   await env.DB.prepare('INSERT INTO test_outbox(email,otp) VALUES(?,?)').bind(data.email,data.otp).run();
  };
  const auth=createAuth(drizzle(env.DB),'email-test-secret-with-at-least-thirty-two-characters','https://academy.example',{
   verificationEnabled:cfg.mode!=='legacy',sendVerificationCode:send,
  });
  return auth.handler(request);
 }};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'neutral',conditions:['workerd','module','import'],external:['node:*'],target:'es2022'});
 const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,d1Databases:['DB'],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat']});
 try{
  const db=await mf.getD1Database('DB');
  for(const file of ['0000_tearful_gunslinger.sql','0001_overrated_the_anarchist.sql','0002_developer_audit.sql','0003_signup_email_verification.sql']){
   const raw=await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8');
   for(const statement of raw.split('--> statement-breakpoint').filter(x=>x.trim()))await db.prepare(statement).run();
  }
  await db.prepare('CREATE TABLE test_email_config(mode TEXT)').run();
  await db.prepare("INSERT INTO test_email_config(mode) VALUES('legacy')").run();
  await db.prepare('CREATE TABLE test_outbox(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT,otp TEXT)').run();
  let ip=1;
  const call=(path,body,extra={})=>mf.dispatchFetch('https://academy.example/api/auth/'+path,{method:body?'POST':'GET',headers:{origin:'https://academy.example','content-type':'application/json','cf-connecting-ip':'192.0.2.'+ip++,...extra},...(body?{body:JSON.stringify(body)}:{})});
  const password='Verification-test-password-42!';
  const signup=email=>call('sign-up/email',{email,name:'Email test learner',password,requiresEmailVerification:false,emailVerified:true});
  const send=email=>call('email-otp/send-verification-otp',{email,type:'email-verification'});
  const codeFor=async email=>(await db.prepare('SELECT otp FROM test_outbox WHERE email=? ORDER BY id DESC LIMIT 1').bind(email).first()).otp;
  const verify=(email,otp,extra)=>call('email-otp/verify-email',{email,otp},extra);
  const cookieOf=response=>response.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  const legacy=await signup('legacy@example.com');assert.equal(legacy.status,200,await legacy.clone().text());
  const legacyCookie=cookieOf(legacy);const legacyUser=(await legacy.json()).user;
  await db.prepare('INSERT INTO progress(user_id,data,version,updated_at) VALUES(?,?,?,?)').bind(legacyUser.id,'{"completed":["lesson1"],"xp":150}',2,new Date().toISOString()).run();
  await db.prepare("UPDATE test_email_config SET mode='enabled'").run();
  const registration=await signup('new@example.com');assert.equal(registration.status,200,await registration.clone().text());
  assert.equal(registration.headers.get('set-cookie'),null);assert.equal((await registration.json()).token,null);
  const user=await db.prepare('SELECT id,email_verified,requires_email_verification FROM auth_user WHERE email=?').bind('new@example.com').first();
  assert.equal(user.email_verified,0);assert.equal(user.requires_email_verification,1,'browser cannot opt out of verification');
  const pending=await call('sign-in/email',{email:'new@example.com',password});assert.equal(pending.status,403,await pending.clone().text());assert.equal((await pending.json()).code,'EMAIL_NOT_VERIFIED');
  assert.equal((await call('sign-in/email',{email:'new@example.com',password:'wrong-password'})).status,401);
  const delivery=await send('new@example.com');assert.equal(delivery.status,200,await delivery.clone().text());
  const otp=await codeFor('new@example.com');assert.match(otp,/^\d{6}$/);
  const record=await db.prepare('SELECT value,expires_at FROM auth_verification WHERE identifier=?').bind('email-verification-otp-new@example.com').first();
  assert.ok(!record.value.includes(otp),'raw code must not be stored');assert.ok(record.expires_at>Date.now()+590000);
  const wrong=(otp[0]==='0'?'1':'0')+otp.slice(1);
  assert.equal((await verify('new@example.com',wrong)).status,400);
  assert.equal((await verify('legacy@example.com',otp)).status,400,'codes are bound to their recipient');
  assert.equal((await verify('new@example.com',otp,{origin:'https://evil.example'})).status,403);
  assert.equal((await verify('new@example.com',otp,{origin:''})).status,403);
  const verified=await verify('new@example.com',otp);assert.equal(verified.status,200,await verified.clone().text());assert.equal(verified.headers.get('set-cookie'),null);assert.equal((await verified.json()).token,null,'verification does not bypass the password');
  assert.equal((await verify('new@example.com',otp)).status,400,'code is consumed once');
  const login=await call('sign-in/email',{email:'new@example.com',password});assert.equal(login.status,200,await login.clone().text());
  const session=await call('get-session',null,{cookie:cookieOf(login)});assert.equal((await session.json()).user.emailVerified,true);
  assert.equal((await call('sign-in/email',{email:'legacy@example.com',password})).status,200,'existing unverified accounts remain accessible');
  const oldSession=await call('get-session',null,{cookie:legacyCookie});assert.equal((await oldSession.json()).user.id,legacyUser.id);
  assert.equal((await db.prepare('SELECT version FROM progress WHERE user_id=?').bind(legacyUser.id).first()).version,2,'legacy progress preserved');
  assert.equal((await call('sign-in/email-otp',{email:'new@example.com',otp})).status,404,'unrequested passwordless login disabled');
  assert.equal((await call('email-otp/send-verification-otp',{email:'new@example.com',type:'forget-password'})).status,400);
  assert.equal((await call('email-otp/get-verification-otp?email=new%40example.com&type=email-verification')).status,404,'codes cannot be read through HTTP');

  assert.equal((await signup('expiry@example.com')).status,200);
  assert.equal((await send('expiry@example.com')).status,200);const expired=await codeFor('expiry@example.com');
  await db.prepare('UPDATE auth_verification SET expires_at=? WHERE identifier=?').bind(Date.now()-1000,'email-verification-otp-expiry@example.com').run();
  const expiredResponse=await verify('expiry@example.com',expired);assert.equal(expiredResponse.status,400);assert.equal((await expiredResponse.json()).code,'OTP_EXPIRED');
  assert.equal((await send('expiry@example.com')).status,200);const prior=await codeFor('expiry@example.com');
  assert.equal((await send('expiry@example.com')).status,200);const latest=await codeFor('expiry@example.com');
  if(prior!==latest)assert.equal((await verify('expiry@example.com',prior)).status,400,'a superseded code is rejected');
  assert.equal((await verify('expiry@example.com',latest)).status,200);

  assert.equal((await signup('attempts@example.com')).status,200);assert.equal((await send('attempts@example.com')).status,200);
  const limitedCode=await codeFor('attempts@example.com');const bad=(limitedCode[0]==='0'?'1':'0')+limitedCode.slice(1);
  for(let n=0;n<5;n++)assert.equal((await verify('attempts@example.com',bad)).status,400);
  const exhausted=await verify('attempts@example.com',limitedCode);assert.equal(exhausted.status,403);assert.equal((await exhausted.json()).code,'TOO_MANY_ATTEMPTS');
  assert.equal((await send('attempts@example.com')).status,200);assert.equal((await verify('attempts@example.com',await codeFor('attempts@example.com'))).status,200);
  for(let n=0;n<3;n++)assert.equal((await call('email-otp/send-verification-otp',{email:'attempts@example.com',type:'email-verification'},{'cf-connecting-ip':'198.51.100.1'})).status,200);
  assert.equal((await call('email-otp/send-verification-otp',{email:'attempts@example.com',type:'email-verification'},{'cf-connecting-ip':'198.51.100.1'})).status,429);
  assert.equal((await send('unknown@example.com')).status,200);assert.equal(await db.prepare('SELECT otp FROM test_outbox WHERE email=?').bind('unknown@example.com').first(),null,'unknown accounts do not receive messages');

  await db.prepare("UPDATE test_email_config SET mode='failure'").run();
  const failed=await send('attempts@example.com');assert.equal(failed.status,503);assert.equal((await failed.json()).code,'EMAIL_DELIVERY_FAILED');
  await db.prepare("UPDATE test_email_config SET mode='no-sender'").run();
  const unavailable=await signup('missing-sender@example.com');assert.equal(unavailable.status,503);assert.equal(await db.prepare('SELECT id FROM auth_user WHERE email=?').bind('missing-sender@example.com').first(),null,'missing sender cannot create a stranded account');
  assert.equal((await call('sign-in/email',{email:'legacy@example.com',password})).status,200);
  assert.equal((await signup('pending@example.com')).status,503);
  await db.prepare("UPDATE test_email_config SET mode='enabled'").run();assert.equal((await signup('pending@example.com')).status,200);
  await db.prepare("UPDATE test_email_config SET mode='legacy'").run();
  assert.equal((await call('sign-in/email',{email:'pending@example.com',password})).status,403,'disabling new signup verification never bypasses existing pending accounts');
 }finally{await mf.dispose();}
});
