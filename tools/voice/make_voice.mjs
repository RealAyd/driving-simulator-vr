// Records what the instructor and the examiner say in Azure's British neural voices, one MP3 per sentence, with an
// index the app reads (src/audio/phrases.ts lists the sentences): the instructor (en-GB-SoniaNeural) into
// public/voice/, the examiner on mock tests (en-GB-RyanNeural) into public/voice/examiner/. Only new sentences are
// recorded; clips for sentences no longer said are removed.
//
//   AZURE_SPEECH_KEY=… [AZURE_SPEECH_REGION=uksouth] [INSTRUCTOR_VOICE=…] [EXAMINER_VOICE=…] node tools/voice/make_voice.mjs
//   (SPEECH_KEY and SPEECH_REGION, Azure's own names, are read too.)
//
// Needs a Speech resource in Azure (the free tier covers it; its limit of requests a minute is waited out).
// Sentences not recorded are spoken by the device.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';

const key=process.env.AZURE_SPEECH_KEY??process.env.SPEECH_KEY;
const region=process.env.AZURE_SPEECH_REGION??process.env.SPEECH_REGION??'uksouth';
if(!key)throw new Error('Set AZURE_SPEECH_KEY (and AZURE_SPEECH_REGION if the resource is not in uksouth).');

const vite=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true},appType:'custom',logLevel:'error'});
const {allPhrases,examinerPhrases,phraseFile}=await vite.ssrLoadModule('/src/audio/phrases.ts');
await vite.close();

const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&apos;').replace(/"/g,'&quot;');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function record(text,voice){
  const ssml=`<speak version='1.0' xml:lang='en-GB'><voice name='${voice}'><prosody rate='-4%'>${escape(text)}</prosody></voice></speak>`;
  for(let attempt=1;;attempt++){
    try{
      // curl: it uses the environment's HTTPS proxy, where Node's fetch may not.
      return execFileSync('curl',['-sS','--fail','-m','60','-X','POST',`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        '-H',`Ocp-Apim-Subscription-Key: ${key}`,'-H','Content-Type: application/ssml+xml',
        '-H','X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3','-H','User-Agent: DrivingPractice-voice/1.0',
        '--data-binary','@-'],{input:ssml,maxBuffer:16*1024*1024,stdio:['pipe','pipe','pipe']});
    }catch(e){
      // Too many requests (the free tier allows 20 a minute): waited out, a few times.
      if(!/error: 429/.test(String(e.stderr))||attempt>=5)throw new Error(`Azure: ${String(e.stderr).trim()}`);
      process.stdout.write(' (waiting a minute: Azure\'s limit)');
      await sleep(61000);
    }
  }
}

async function voiceSet(dir,voice,phrases){
  fs.mkdirSync(dir,{recursive:true});
  const files=new Set();
  let made=0,chars=0;
  for(const text of phrases){
    const file=phraseFile(text);
    files.add(file);
    if(fs.existsSync(`${dir}/${file}`))continue;
    fs.writeFileSync(`${dir}/${file}`,await record(text,voice));
    made++;chars+=text.length;
    process.stdout.write(`\r${dir}: ${made} recorded`);
  }
  let removed=0;
  for(const f of fs.readdirSync(dir))if(f.endsWith('.mp3')&&!files.has(f)){fs.rmSync(`${dir}/${f}`);removed++}
  fs.writeFileSync(`${dir}/index.json`,JSON.stringify({voice,source:'Microsoft Azure AI Speech (neural text to speech)',files:[...files].sort()})+'\n');
  console.log(`\n${dir} (${voice}): ${phrases.length} sentences, ${made} recorded now (${chars} characters), ${removed} old clips removed.`);
}

await voiceSet('public/voice',process.env.INSTRUCTOR_VOICE??'en-GB-SoniaNeural',allPhrases());
await voiceSet('public/voice/examiner',process.env.EXAMINER_VOICE??'en-GB-RyanNeural',examinerPhrases());
