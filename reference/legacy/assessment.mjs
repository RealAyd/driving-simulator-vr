// REFERENCE ONLY: strict legacy heuristics, not the new assessment default.
const TURN_SEQUENCE_WINDOW_MS=15000;
const MSM_MIRROR_WINDOW_MS=2000;
const STRICT_REPEAT_CATEGORY_THRESHOLD=3;
function assessTurnSequence({side,activeSignal,mirrorAt,signalAt,blindAt,now}){
  if(activeSignal!==side||!signalAt||now-signalAt>TURN_SEQUENCE_WINDOW_MS)
    return {passed:false,reason:'Matching '+side+' signal was not activated before turning.'};
  if(!mirrorAt||mirrorAt>signalAt||signalAt-mirrorAt>MSM_MIRROR_WINDOW_MS)
    return {passed:false,reason:'Check the '+side+' mirror BEFORE signalling.'};
  if(!blindAt||blindAt<=signalAt||blindAt>now||now-blindAt>TURN_SEQUENCE_WINDOW_MS)
    return {passed:false,reason:'Hold a '+side+' shoulder check for at least 400 ms AFTER signalling.'};
  return {passed:true,reason:'Mirror → Signal → Blind spot → Manoeuvre'};
}

/**
 * SIMULATED UK car-test fault ledger.
 * GOV.UK: <=15 driving faults AND no serious/dangerous faults.
 * Automatic escalation on a third same-category fault is a deliberate
 * stricter practice-mode rule, NOT an official DVSA numeric rule.
 * Distinct incident keys prevent double marking the same driving event.
 */
class UkMockScore{
 constructor(){this.newTest()}
 newTest(){
   this.mirrorMinors=0;this.signalMinors=0;this.speedMinors=0;
   this.drivingFaults=0;this.seriousFaults=0;this.dangerousFaults=0;
   this.failed=false;this.finished=false;this.failureReason='';
   this.upgraded=new Set();this.incidents=new Set();this.log=[];
 }
 record(category,reason,incidentKey){
   if(this.finished)return null;
   if(!['mirror','signal','speed'].includes(category))throw Error('Unsupported fault category '+category);
   if(incidentKey&&this.incidents.has(incidentKey))return null;
   if(incidentKey)this.incidents.add(incidentKey);
   const name=category+'Minors';
   this[name]++;
   this.drivingFaults++;
   const event={category,reason,incidentKey:incidentKey||null,at:Date.now(),escalated:false};
   this.log.push(event);
   if(this[name]===STRICT_REPEAT_CATEGORY_THRESHOLD&&!this.upgraded.has(category)){
     this.upgraded.add(category);
     this.seriousFaults++;
     this.failed=true;
     this.failureReason='TEST FAILED: Repeated Fault in Single Category';
     event.escalated=true;
   }
   if(this.drivingFaults>=16){
     this.failed=true;
     if(!this.failureReason)this.failureReason='TEST FAILED: More than 15 driving faults';
   }
   return event;
 }
 recordSerious(reason,incidentKey){
   if(this.finished)return null;
   if(incidentKey&&this.incidents.has(incidentKey))return null;
   if(incidentKey)this.incidents.add(incidentKey);
   this.seriousFaults++;this.failed=true;
   this.failureReason=reason||'TEST FAILED: Serious fault';
   const event={category:'serious',reason:this.failureReason,
     incidentKey:incidentKey||null,at:Date.now()};
   this.log.push(event);
   return event;
 }
 recordDangerous(reason){
   if(this.finished)return;
   this.dangerousFaults++;this.failed=true;
   this.failureReason=reason||'TEST FAILED: Dangerous fault';
 }
 finish(){this.finished=true;return this.result}
 get result(){
   if(this.failed||this.drivingFaults>15||this.seriousFaults>0||this.dangerousFaults>0)return 'fail';
   return this.finished?'pass':'in-progress';
 }
}

export { assessTurnSequence, UkMockScore };
