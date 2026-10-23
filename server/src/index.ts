import {createServer} from 'node:http';
import {loadConfig} from './config.js';
import {handler} from './http.js';
import {MongoStore} from './mongoStore.js';
import {OutboxMailer,fakeIdentities,fakeStripe,identityVerifier,resendMailer,stripeApi} from './providers.js';
import {Service} from './service.js';
import {MemoryStore} from './store.js';

const config=loadConfig();
const outbox=config.devFakes?new OutboxMailer():null;
const store=config.devFakes&&!config.mongoUri?new MemoryStore():await MongoStore.connect(config.mongoUri!);
const service=new Service(config,store,outbox??resendMailer(config),config.devFakes?fakeIdentities:identityVerifier(config),
  config.devFakes?fakeStripe(config):stripeApi(config));
createServer(handler(service,outbox)).listen(config.port,()=>{
  // (Names and modes only: never a key.)
  console.log(`Driving Practice API on :${config.port}; ${config.devFakes?'LOCAL FAKES (no real email, sign-in or payments)':`Stripe ${config.stripeMode} mode`}; app ${config.appBaseUrl}`);
});
