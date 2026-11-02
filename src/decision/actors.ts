import type {DecisionRoute} from './route';

/** A route's road users as scenario actors (passing vehicles). Each waits at the start of its path until a challenge
 * starts it (the runner sets its timing), so the delay here only keeps it still until then. */
export function actorDefs(route:DecisionRoute){
  return route.actors.map(a=>({id:a.id,kind:'passing-vehicle' as const,body:'car' as const,name:a.name,colour:a.colour,speed:a.speed,
    delaySeconds:120,repeat:false,yieldsToLearner:!!a.yields,path:a.path.map(p=>({x:p.x,z:p.z}))}));
}
