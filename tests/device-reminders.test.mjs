import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';

const built = await build({ entryPoints: ['lib/device-reminders.ts'], bundle: true, write: false, format: 'iife', globalName: 'reminders', platform: 'browser', target: 'es2022' });
const key = Uint8Array.from([4, ...Array(64).fill(7)]);
const publicKey = Buffer.from(key).toString('base64url');
const schedule = {time:'18:00',days:[1,3,5],timeZone:'America/New_York'};
function browser({ existing = true, saveFails = false, sameKey = true } = {}) {
  const calls = [], shown = [];
  const subscription = {endpoint:'https://fcm.googleapis.com/test',options:{applicationServerKey: sameKey ? key.buffer : new Uint8Array(65).buffer},toJSON:()=>({endpoint:'https://fcm.googleapis.com/test',keys:{}}),unsubscribe:async()=>{calls.push('unsubscribe');return true;}};
  const registration = {pushManager:{getSubscription:async()=>existing ? subscription : null,subscribe:async()=>{calls.push('subscribe');return subscription;}},showNotification:async(...a)=>shown.push(a)};
  const Notification = {permission:'granted',requestPermission:async()=>{calls.push('permission');return 'granted';}};
  const navigator = {userAgent:'Chrome',maxTouchPoints:0,serviceWorker:{register:async()=>{calls.push('register');return {pushManager:{getSubscription:()=>{throw Error('installing registration used');}}};},ready:Promise.resolve(registration),getRegistration:async()=>registration}};
  const context = {navigator,Notification,window:{isSecureContext:true,Notification,PushManager:{},matchMedia:()=>({matches:false})},AbortSignal,Response,Uint8Array,atob,setTimeout,clearTimeout,fetch:async(_url,init)=>{const action=JSON.parse(init.body).action;calls.push(action);return Response.json(saveFails && action==='save' ? {error:'Connection unavailable'} : {enabled:action!=='remove',schedule,nextAt:100},{status:saveFails && action==='save' ? 503 : 200});}};
  vm.createContext(context);vm.runInContext(built.outputFiles[0].text,context);
  return {api:context.reminders,calls,shown,subscription,Notification};
}
test('enabling uses the active registration and preserves an existing matching subscription',async()=>{
  const f=browser();const result=await f.api.enableDeviceReminder(publicKey,schedule);
  assert.equal(result.subscription,f.subscription);assert.deepEqual(f.calls,['register','save']);
  assert.equal(result.status.enabled,true);
});
test('new subscriptions wait for activation; explicit repair replaces an old subscription',async()=>{
  const fresh=browser({existing:false});await fresh.api.enableDeviceReminder(publicKey,schedule);assert.deepEqual(fresh.calls,['register','subscribe','save']);
  const repair=browser();await repair.api.enableDeviceReminder(publicKey,schedule,true);assert.deepEqual(repair.calls,['register','unsubscribe','remove','subscribe','save']);
  const changed=browser({sameKey:false});await changed.api.enableDeviceReminder(publicKey,schedule);assert.ok(changed.calls.includes('subscribe'));
});
test('a failed save does not delete a working browser subscription or its schedule',async()=>{
  const f=browser({saveFails:true});await assert.rejects(f.api.enableDeviceReminder(publicKey,schedule),/Connection unavailable/);assert.deepEqual(f.calls,['register','save']);
});
test('device diagnostics use persistent notifications and permission is requested from the action',async()=>{
  const f=browser();f.Notification.permission='default';await f.api.showDeviceNotificationTest();
  assert.deepEqual(f.calls,['permission','register']);assert.equal(f.shown.length,1);assert.equal(f.shown[0][1].tag,'chess-infinity-device-test');
  assert.match(f.api.notificationError({name:'NotAllowedError'}),/site settings/);
  assert.match(f.api.notificationError({name:'InvalidStateError'}),/Repair/);
  assert.match(f.api.notificationError({name:'TimeoutError'}),/internet/);
});
