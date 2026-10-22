/** The lessons finished on this device (the home screen offers the next one). Kept locally; nothing is sent. */
const KEY='dp-lessons-done';

export function lessonsDone():string[]{
  try{const v=JSON.parse(localStorage.getItem(KEY)??'[]');return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[]}catch{return []}
}
export function markLessonDone(id:string):void{
  const done=lessonsDone();
  if(done.includes(id))return;
  try{localStorage.setItem(KEY,JSON.stringify([...done,id]))}catch{/* not kept */}
}
