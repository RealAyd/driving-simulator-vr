import {expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {allPhrases,examinerPhrases,phraseFile} from '../../src/audio/phrases';

/**
 * Every recorded sentence (instructor and examiner): the clip is there, decodes, is about as long as the sentence
 * reads (no clip cut short or padded out), and has no long gap of silence in it.
 */
it('voice clips: present, whole, the right length, no gaps',()=>{
  const problems:string[]=[];
  for(const [dir,list] of [['public/voice/',allPhrases()],['public/voice/examiner/',examinerPhrases()]] as const){
    const index=new Set(JSON.parse(readFileSync(`${dir}index.json`,'utf8')).files as string[]);
    for(const sentence of list as string[]){
      const file=phraseFile(sentence);
      if(!index.has(file)){problems.push(`${dir}${file} missing: "${sentence}"`);continue}
      const err=execFileSync('sh',['-c',`ffmpeg -hide_banner -nostats -i "${dir}${file}" -af silencedetect=noise=-45dB:d=0.9 -f null - 2>&1`],{encoding:'utf8'});
      const dur=/Duration: (\d+):(\d+):([\d.]+)/.exec(err);
      if(!dur){problems.push(`${dir}${file} does not decode`);continue}
      const seconds=+dur[1]!*3600+ +dur[2]!*60+ +dur[3]!;
      const rate=sentence.length/seconds;
      // (Short phrases are padded with silence: only judged from about four words.)
      if(sentence.length>20&&(rate>24||rate<8))problems.push(`${dir}${file} ${seconds.toFixed(1)} s for ${sentence.length} characters: "${sentence.slice(0,60)}"`);
      // Silence inside the clip (not at its ends) longer than 0.9 s.
      // A gap inside the speech: a silence that starts after the first words and ends before the clip does.
      const ends=[...err.matchAll(/silence_end: ([\d.]+)/g)].map(m=>+m[1]!);
      const gap=ends.find(t=>t>.9&&t<seconds-.1);
      if(gap!==undefined)problems.push(`${dir}${file} has a gap of silence ending at ${gap.toFixed(1)} s`);
    }
  }
  console.log(problems.join('\n')||'all clips fine');
  expect(problems).toEqual([]);
});
