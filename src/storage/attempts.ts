import type {AttemptResult} from '../contracts';

export interface AttemptStore{
  save(result:AttemptResult):Promise<void>;
  list(scenarioId:string):Promise<AttemptResult[]>;
  /** Where results are kept, for honest UI wording. */
  readonly kind:'indexeddb'|'memory';
}

class MemoryStore implements AttemptStore{
  readonly kind='memory' as const;
  private readonly items:AttemptResult[]=[];
  async save(result:AttemptResult){this.items.push(structuredClone(result))}
  async list(scenarioId:string){return this.items.filter(r=>r.scenarioId===scenarioId)}
}

const DB='driving-practice';
const STORE='attempts';

class IndexedDbStore implements AttemptStore{
  readonly kind='indexeddb' as const;
  constructor(private readonly db:IDBDatabase){}

  save(result:AttemptResult):Promise<void>{
    return new Promise((resolve,reject)=>{
      const tx=this.db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).add(result);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }

  list(scenarioId:string):Promise<AttemptResult[]>{
    return new Promise((resolve,reject)=>{
      const request=this.db.transaction(STORE,'readonly').objectStore(STORE).index('scenarioId').getAll(scenarioId);
      request.onsuccess=()=>resolve(request.result as AttemptResult[]);
      request.onerror=()=>reject(request.error);
    });
  }
}

/**
 * Opens on-device storage for exercise results. Falls back to memory when
 * IndexedDB is unavailable (private windows, blocked storage); results are
 * then lost on reload, and the UI says so.
 */
export async function openAttemptStore(factory:IDBFactory|undefined=globalThis.indexedDB):Promise<AttemptStore>{
  if(!factory)return new MemoryStore();
  try{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      const request=factory.open(DB,1);
      request.onupgradeneeded=()=>{
        const store=request.result.createObjectStore(STORE,{autoIncrement:true});
        store.createIndex('scenarioId','scenarioId');
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error('IndexedDB blocked'));
    });
    return new IndexedDbStore(db);
  }catch{
    return new MemoryStore();
  }
}
