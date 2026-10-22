import {describe,expect,it} from 'vitest';
import {parseLocation} from '../../src/contracts';
import {RoadNetwork} from '../../src/test/route';
import {allPhrases,examinerPhrases,phraseFile,phraseKey,sentences} from '../../src/audio/phrases';
import goodmayesJson from '../../content/locations/goodmayes.json';
import brentwoodJson from '../../content/locations/brentwood-paired-mini-roundabouts.json';

const known=new Set(allPhrases().map(phraseKey)),examiner=new Set(examinerPhrases().map(phraseKey));

describe('the recorded voice\'s sentences',()=>{
  it('split after full stops, keeping decimals whole',()=>{
    expect(sentences('Good stop. Stopped 1.4 m from the kerb. Ready?  Go!')).toEqual(['Good stop.','Stopped 1.4 m from the kerb.','Ready?','Go!']);
  });
  it('one clip file per sentence (no two share a name)',()=>{
    const files=allPhrases().map(phraseFile);
    expect(new Set(files).size).toBe(files.length);
    expect(phraseFile('That’s fine.')).toBe(phraseFile('that\'s  fine.'));
  });
  it('the instructor has a clip for everything the examiner says (giving the directions in a lesson)',()=>{
    for(const k of examiner)expect(known.has(k),k).toBe(true);
    expect(examiner.size).toBeLessThan(known.size);
  });
  it('every direction the examiner gives on test routes has a clip',()=>{
    for(const json of [goodmayesJson,brentwoodJson]){
      const loc=parseLocation(json),net=new RoadNetwork(loc),sp=loc.spawn;
      const start=net.locate(sp.position.x,sp.position.z,sp.headingDeg*Math.PI/180)!;
      for(let seed=1;seed<=6;seed++)for(const step of net.plan(start,3000,seed).steps)
        for(const s of sentences(step.say))expect(examiner.has(phraseKey(s)),s).toBe(true);
    }
  },30000);
});
