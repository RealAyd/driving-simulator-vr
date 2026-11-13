import {describe,expect,it} from 'vitest';
import {ago,describeDrive} from '../../src/access/recent';

describe('recently practised',()=>{
  it('says what was practised and where, plainly',()=>{
    expect(describeDrive({scenario:'brentwood-guided-traversal',mode:'free'})).toBe('Mini-roundabout practice in Brentwood');
    expect(describeDrive({scenario:'goodmayes-mock-test',mode:'test'})).toBe('Mock test in Goodmayes');
    // An area built round a test centre: the centre's own name.
    expect(describeDrive({scenario:'area-hull-test-centre-free-drive',mode:'free'})).toMatch(/^Free drive in Hull/);
    expect(describeDrive({scenario:'area-hull-test-centre-mock-test',mode:'test'})).toMatch(/^Mock test at Hull/);
    // A postcode stays in capitals; something unknown is said by its kind only.
    expect(describeDrive({scenario:'area-rm6-4jp-lesson',mode:'lesson'})).toBe('Lesson in RM6 4JP');
    expect(describeDrive({scenario:'something-new',mode:'lesson'})).toBe('Lesson');
  });
  it('says how long ago',()=>{
    expect(ago(20)).toBe('just now');
    expect(ago(60)).toBe('1 min ago');
    expect(ago(150)).toBe('2 mins ago');
    expect(ago(7300)).toBe('2 hours ago');
    expect(ago(90000)).toBe('1 day ago');
  });
});
