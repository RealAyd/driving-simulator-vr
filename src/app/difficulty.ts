/**
 * How hard a drive is, chosen on the home screen (remembered on this device): how busy the roads are, how long a
 * mock test lasts, and how much the instructor reminds you on a lesson.
 */
export type Difficulty='easy'|'standard'|'test';

export interface DifficultyLevel{
  id:Difficulty;
  label:string;
  summary:string;
  /** Background cars, buses and cyclists on the roads (gathered at junctions: traffic.ts). */
  traffic:{cars:number;buses:number;cycles:number};
  /** Mock test route length (metres) and the most time it may take (seconds). */
  mockMetres:number;
  mockSeconds:number;
  /** Lessons: the instructor's reminders before each junction (otherwise only the word after it). */
  reminders:boolean;
}

export const DIFFICULTIES:Record<Difficulty,DifficultyLevel>={
  // (Short enough to finish in one go: a mock test's session is used only when it is completed.)
  easy:{id:'easy',label:'Easy',summary:'Quiet roads. Mock test about 5 minutes. Lessons with reminders.',
    traffic:{cars:5,buses:1,cycles:1},mockMetres:1500,mockSeconds:600,reminders:true},
  standard:{id:'standard',label:'Standard',summary:'Normal traffic. Mock test about 10 minutes. Lessons with reminders.',
    traffic:{cars:9,buses:1,cycles:2},mockMetres:3000,mockSeconds:1050,reminders:true},
  test:{id:'test',label:'Test day',summary:'Busy roads. Mock test about 15 minutes. Lessons without reminders.',
    traffic:{cars:14,buses:2,cycles:2},mockMetres:4500,mockSeconds:1500,reminders:false}
};

const KEY='dp-difficulty';
export function savedDifficulty():Difficulty{
  try{const v=localStorage.getItem(KEY);if(v==='easy'||v==='standard'||v==='test')return v}catch{/* private mode */}
  return 'standard';
}
export function saveDifficulty(d:Difficulty):void{try{localStorage.setItem(KEY,d)}catch{/* private mode */}}
