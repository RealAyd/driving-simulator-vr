/**
 * A file's address with its content fingerprint (sim/vite.config.ts), for files the app loads by a fixed name:
 * models and the built test centres. A host may let browsers keep such files for a long time; a changed file then
 * has a new address, so phones never keep an old one. Unknown files (and tests, with no build) are unchanged.
 */
declare const __ASSET_VERSIONS__:Record<string,string>|undefined;
const versions:Record<string,string>=typeof __ASSET_VERSIONS__==='undefined'?{}:__ASSET_VERSIONS__;

export function versioned(url:string):string{
  const key=url.replace(/^\.?\//,'');
  const v=versions[key]??(key.startsWith('centres/')?versions['centres/']:undefined);
  return v?`${url}${url.includes('?')?'&':'?'}v=${v}`:url;
}
