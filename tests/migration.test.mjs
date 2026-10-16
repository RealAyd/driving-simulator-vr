import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRIES, COUNTRY_LIST, normalized} from '../src/migration/countries.mjs';
import {shareAppLink} from '../src/migration/share.mjs';
import {IndicatorAudio} from '../src/migration/indicator-audio.mjs';
import {UkMockScore,assessTurnSequence} from '../reference/legacy/assessment.mjs';
test('country extraction retains distinct seat and road defaults',()=>{
 assert.equal(COUNTRIES.GB.drive,'RHD');assert.equal(COUNTRIES.GB.roadSide,'left');
 assert.equal(COUNTRIES.NG.drive,'LHD');assert.equal(COUNTRIES.BS.roadSide,'left');
 assert.equal(COUNTRIES.BS.drive,'LHD');
 assert.equal(new Set(COUNTRY_LIST.map(c=>c.iso)).size,COUNTRY_LIST.length);
 assert.equal(normalized(' Côte '),'cote');
});
test('legacy ledger deduplicates and preserves strict escalation',()=>{
 const s=new UkMockScore();
 s.record('mirror','x','one');s.record('mirror','x','one');
 assert.equal(s.drivingFaults,1);
 s.record('mirror','x','two');s.record('mirror','x','three');
 assert.equal(s.seriousFaults,1);
 s.finish();s.recordSerious('x','four');assert.equal(s.seriousFaults,1);
 s.newTest();assert.equal(s.drivingFaults,0);
});
test('legacy sequence distinguishes correct and missing observations',()=>{
 const input={side:'left',activeSignal:'left',mirrorAt:1000,signalAt:1500,blindAt:2000,now:2500};
 assert.equal(assessTurnSequence(input).passed,true);
 assert.equal(assessTurnSequence({...input,blindAt:0}).passed,false);
});
test('share supports clipboard, manual fallback and cancellation',async()=>{
 let copied;
 assert.equal((await shareAppLink({url:'https://example.com/#x',navigator:{clipboard:{writeText:async u=>copied=u}}})).status,'copied');
 assert.equal(copied,'https://example.com/');
 assert.equal((await shareAppLink({url:'https://example.com/',navigator:{}})).status,'manual-copy');
 assert.equal((await shareAppLink({url:'https://example.com/',navigator:{share:async()=>{throw {name:'AbortError'}}}})).status,'cancelled');
 await assert.rejects(shareAppLink({url:'javascript:bad',navigator:{}}));
});
test('audio gracefully handles unavailable context and disposal',async()=>{
 const audio=new IndicatorAudio(()=>null);
 assert.equal(await audio.unlock(),false);audio.click();
 await audio.dispose();assert.equal(await audio.unlock(),false);
});
