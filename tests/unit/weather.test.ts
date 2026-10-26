import {describe,expect,it} from 'vitest';
import {conditionsFrom,conditionsFromName,conditionsName} from '../../src/world/weather';

describe('driving conditions',()=>{
  it('come from the address (?time, ?weather), else day and dry',()=>{
    expect(conditionsFrom('')).toEqual({time:'day',rain:false});
    expect(conditionsFrom('?time=night')).toEqual({time:'night',rain:false});
    expect(conditionsFrom('?weather=rain&time=night')).toEqual({time:'night',rain:true});
    expect(conditionsFrom('?time=noon&weather=snow')).toEqual({time:'day',rain:false});
  });
  it('round-trip through their one-word names (the drive setting, remembered on the device)',()=>{
    for(const name of ['day','night','rain','night-rain','dusk'])expect(conditionsName(conditionsFromName(name))).toBe(name);
    expect(conditionsFromName(null)).toEqual({time:'day',rain:false});
    expect(conditionsFromName('fog')).toEqual({time:'day',rain:false});
  });
});
