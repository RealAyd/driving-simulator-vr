import {describe,expect,it} from 'vitest';
import {driveRoute,loadCentre} from './trafficDrive';

/**
 * Real routes driven through the background traffic (the owner's test drives): no car vanishes where the learner can
 * see it, the learner always gets to the end, seldom held up and never for long, and few cars come the other way down
 * its road (oncoming traffic is kept for junctions and roundabouts).
 */
describe('traffic on real drives',()=>{
  for(const [id,seed] of [['goodmayes-london',1],['basildon',3],['farnborough',2],['folkestone',1],['folkestone',2],['folkestone',3],['leeds',3],['chelmsford-hanbury-road',1],['inverness-longman-drive',1]] as const)
    it(`${id}, route ${seed}`,async()=>{
      const r=driveRoute(await loadCentre(id),seed);
      expect(r.completed).toBe(true);
      expect(r.vanishedInView).toBe(0);
      expect(r.backedOff).toBeLessThanOrEqual(1);
      expect(r.learnerHeld).toBeLessThan(75);
      expect(r.oncomingPerKm).toBeLessThan(20);
    },240_000);
});
