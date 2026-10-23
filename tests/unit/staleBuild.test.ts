import {expect,it} from 'vitest';
import {isStaleImport} from '../../src/app/staleBuild';

it('recognises a failed load of one of the app\'s own files, as each browser words it',()=>{
  expect(isStaleImport(new TypeError('Failed to fetch dynamically imported module: https://x/assets/glTFLoader-abc.js'))).toBe(true);
  expect(isStaleImport(new TypeError('Importing a module script failed.'))).toBe(true);
  expect(isStaleImport(new TypeError('error loading dynamically imported module'))).toBe(true);
  expect(isStaleImport(new Error('404'))).toBe(false);
  expect(isStaleImport(new Error('Unable to load from https://x/models/car.glb'))).toBe(false);
});
