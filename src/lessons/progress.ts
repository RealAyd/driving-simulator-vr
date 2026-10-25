/** The lessons finished (the home screen offers the next one): kept on this device, and on the account when signed in. */
const KEY='dp-lessons-done';

export function lessonsDone():string[]{
  try{const v=JSON.parse(localStorage.getItem(KEY)??'[]');return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[]}catch{return []}
}
export function markLessonDone(id:string):void{
  const done=lessonsDone();
  if(done.includes(id))return;
  try{localStorage.setItem(KEY,JSON.stringify([...done,id]))}catch{/* not kept */}
}
/** Adds lessons finished elsewhere (the account's, on sign-in). */
export function mergeLessonsDone(ids:readonly string[]):void{
  const done=lessonsDone(),add=ids.filter(id=>!done.includes(id));
  if(add.length)try{localStorage.setItem(KEY,JSON.stringify([...done,...add]))}catch{/* not kept */}
}
