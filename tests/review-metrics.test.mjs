import {test} from 'node:test';
import assert from 'node:assert/strict';
import {winningChances,chanceLoss,reviewGrade,reviewAccuracy} from '../lib/chess/review-metrics.ts';
import {classification} from '../lib/chess/engine.ts';
const ev=(score,mate=null)=>({score,mate});
test('equivalent evaluation losses have different impact in balanced and decisive positions',()=>{
 const balanced=chanceLoss(ev(0),ev(-3),'w');
 const alreadyLost=chanceLoss(ev(-6),ev(-9),'w');
 assert.equal(reviewGrade(balanced),'Blunder');
 assert.ok(alreadyLost < 10);
 assert.notEqual(reviewGrade(alreadyLost),'Blunder');
 assert.equal(reviewGrade(chanceLoss(ev(0),ev(3),'b')),'Blunder');
 assert.equal(reviewGrade(chanceLoss(ev(6),ev(9),'b')),reviewGrade(alreadyLost));
 assert.ok(Math.abs(winningChances(ev(1),'w')+winningChances(ev(1),'b')-100)<1e-10);
});
test('mates, invalid scores, and ungraded moves cannot inflate blunder counts or accuracy',()=>{
 assert.equal(chanceLoss(ev(100,2),ev(100,8),'w'),0);
 assert.equal(chanceLoss(ev(-100,-2),ev(-100,-8),'b'),0);
 assert.equal(reviewGrade(NaN),'Uncertain');
 assert.equal(classification(NaN,false),'Uncertain');
 assert.equal(classification(Infinity,false),'Uncertain');
 assert.equal(reviewAccuracy([{reliable:false,chanceLoss:99}]),null);
 assert.equal(reviewAccuracy([{reliable:true,chanceLoss:0},{reliable:false,chanceLoss:99}]),100);
});
