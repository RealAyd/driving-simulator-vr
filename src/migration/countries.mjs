// Extracted country defaults; inherited data is not newly verified legal guidance.
const ISO_CODES="AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(' ');
const LEFT_TRAFFIC=new Set("AG AI AU BB BD BM BN BS BT BW CC CK CX CY DM FJ FK GB GD GG GY HK ID IE IM IN JE JM JP KE KI KN KY LC LK LS MO MS MT MU MV MW MY MZ NA NF NP NR NU NZ PG PK PN SB SC SG SH SR SZ TC TH TK TL TO TT TV TZ UG VC VG VI WS ZA ZM ZW".split(' '));
// Road-side and steering-side are distinct. The countries below keep traffic
// LEFT but have predominantly US-imported LEFT-hand-drive cars.
// Sources: UK FCDO (British Virgin Islands, Turks and Caicos), US State Dept
// (Bahamas), and local driving guides (Cayman / US Virgin Islands).
const LHD_ON_LEFT=new Set(['BS','KY','TC','VG','VI']);
// Myanmar keeps RIGHT but, according to UK FCDO, its majority fleet is RHD.
// Mongolia also has many RHD Japanese imports but mixed fleets: keep its
// legal-design default LHD and flag the market variation separately.
const RHD_ON_RIGHT=new Set(['MM']);
const MIXED_STEERING=new Set(['BS','KY','TC','VG','VI','MM','MN']);
const MPH_COUNTRIES=new Set([
  'GB','US','VI','PR','GU','MP','AS','BS','KY',
  // Additional confirmed mph speed-limit jurisdictions.
  'JE','GG','IM','MS','TC','VG','FK','BZ'
]);
const NAME_OVERRIDES={
  GB:'United Kingdom',US:'United States',KR:'South Korea',KP:'North Korea',
  CD:'DR Congo',CG:'Republic of the Congo',CI:"Côte d'Ivoire",
  CZ:'Czechia',SZ:'Eswatini',TL:'Timor-Leste',TW:'Taiwan',
  VI:'U.S. Virgin Islands',VG:'British Virgin Islands',HK:'Hong Kong',
  MO:'Macau',PS:'Palestine',VA:'Vatican City',TR:'Türkiye'
};
const COUNTRY_ALIASES={
  GB:'UK Great Britain Britain England Scotland Wales Northern Ireland',
  US:'USA America United States of America',
  AE:'UAE Emirates',CI:'Ivory Coast',MM:'Burma',SZ:'Swaziland',
  TL:'East Timor',CZ:'Czech Republic',TR:'Turkey',
  KR:'Korea South',KP:'Korea North',CD:'Congo Kinshasa',CG:'Congo Brazzaville'
};
const regionNames=typeof Intl.DisplayNames==='function'
  ?new Intl.DisplayNames(['en'],{type:'region'}):null;
const COUNTRY_LIST=Object.freeze(ISO_CODES.map(iso=>{
  const name=NAME_OVERRIDES[iso]||(regionNames?.of(iso)??iso);
  const roadSide=LEFT_TRAFFIC.has(iso)?'left':'right';
  const drive=RHD_ON_RIGHT.has(iso)||
              (roadSide==='left'&&!LHD_ON_LEFT.has(iso))?'RHD':'LHD';
  return Object.freeze({
    name,iso,drive,roadSide,seatSide:drive==='RHD'?'right':'left',
    seatX:drive==='RHD'?0.48:-0.48,units:MPH_COUNTRIES.has(iso)?'mph':'km/h',
    mixedSteering:MIXED_STEERING.has(iso)
  });
}).sort((a,b)=>a.name.localeCompare(b.name,'en')));
const COUNTRIES=Object.freeze(Object.fromEntries(COUNTRY_LIST.map(c=>[c.iso,c])));

/*
 * Regression checks for frequently selected countries.
 * CAUTION: Nigeria has used RIGHT-hand road traffic and LEFT-HAND-DRIVE
 * (driver seat on the left) since 2 April 1972. Do not treat every
 * Commonwealth nation as RHD; verify country-specific traffic rules.
 * UK, Australia, India, South Africa, Japan, New Zealand, Kenya and
 * Jamaica use LEFT-hand road traffic / RIGHT-HAND-DRIVE vehicles.
 * These assertions intentionally keep the live UI data aligned with
 * the car's actual cockpit configuration.
 */
const EXPECTED_DRIVE_CONFIG=Object.freeze({
  NG:{drive:'LHD',roadSide:'right'},
  GB:{drive:'RHD',roadSide:'left'},
  AU:{drive:'RHD',roadSide:'left'},
  IN:{drive:'RHD',roadSide:'left'},
  ZA:{drive:'RHD',roadSide:'left'},
  JP:{drive:'RHD',roadSide:'left'},
  NZ:{drive:'RHD',roadSide:'left'},
  KE:{drive:'RHD',roadSide:'left'},
  JM:{drive:'RHD',roadSide:'left'},
  BS:{drive:'LHD',roadSide:'left'},
  KY:{drive:'LHD',roadSide:'left'},
  TC:{drive:'LHD',roadSide:'left'},
  VG:{drive:'LHD',roadSide:'left'},
  VI:{drive:'LHD',roadSide:'left'},
  MM:{drive:'RHD',roadSide:'right'},
  MN:{drive:'LHD',roadSide:'right'}
});
for(const [iso,expected] of Object.entries(EXPECTED_DRIVE_CONFIG)){
  const actual=COUNTRIES[iso];
  if(!actual||actual.drive!==expected.drive||actual.roadSide!==expected.roadSide||
     actual.seatSide!==(expected.drive==='RHD'?'right':'left')){
    throw new Error('Invalid driving convention for '+iso+
      ': verify road-side and steering-side data before deployment');
  }
}


function countryFlag(iso){
  return [...iso].map(letter=>String.fromCodePoint(127397+letter.charCodeAt(0))).join('');
}
function normalized(text){
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}


function makeFlag(iso){
 return 'https://flagcdn.com/w40/'+iso.toLowerCase()+'.png';
}

export { COUNTRY_LIST, COUNTRIES, COUNTRY_ALIASES, countryFlag, normalized, makeFlag };
