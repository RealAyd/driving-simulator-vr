import {describe,expect,it,vi} from 'vitest';

describe('versioned asset addresses',()=>{
  it('adds the content fingerprint to models and centres, leaves other files alone',async()=>{
    vi.stubGlobal('__ASSET_VERSIONS__',{'assets/models/people/person-man-jacket.glb':'0123abcd','centres/':'feedf00d'});
    vi.resetModules();
    const {versioned}=await import('../../src/assets/versioned');
    expect(versioned('assets/models/people/person-man-jacket.glb')).toBe('assets/models/people/person-man-jacket.glb?v=0123abcd');
    expect(versioned('./assets/models/people/person-man-jacket.glb')).toBe('./assets/models/people/person-man-jacket.glb?v=0123abcd');
    expect(versioned('centres/goodmayes.json.gz')).toBe('centres/goodmayes.json.gz?v=feedf00d');
    expect(versioned('voice/abc.mp3')).toBe('voice/abc.mp3');
    vi.unstubAllGlobals();
  });
});
