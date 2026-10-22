import type {BusinessKind} from '../contracts';

/**
 * Sign styles for businesses. Brands (the project owner chose to show brands): the chain's name in its own sign
 * colours and weight, as lettering only (no traced logos, symbols or typefaces), used where the map data names the
 * chain (brand=* or a name that is the chain's). Trademarks belong to their owners; no affiliation is claimed.
 * Other businesses: a sign in the style usual for their trade (a chemist's green, a pub's dark board with gilt
 * lettering), so a learner can tell a chemist from a takeaway at a glance, as on a real high street.
 */
export interface BrandSign{text:string;background:string;colour:string;weight:string}

const b=(text:string,background:string,colour:string,weight='800'):BrandSign=>({text,background,colour,weight});
/** By chain name; looked up by the brand tag or the business's name (case, apostrophes and "&"/"and" ignored). */
export const BRAND_SIGNS:Readonly<Record<string,BrandSign>>={
  // Supermarkets and convenience stores
  'Tesco':b('TESCO','#eef1ee','#1b4c93'),'Tesco Express':b('TESCO express','#eef1ee','#1b4c93'),'Tesco Extra':b('TESCO extra','#eef1ee','#1b4c93'),
  'Tesco Metro':b('TESCO metro','#eef1ee','#1b4c93'),"Sainsbury's":b("Sainsbury's",'#23282d','#e76a1d'),"Sainsbury's Local":b("Sainsbury's Local",'#23282d','#e76a1d'),
  'Asda':b('ASDA','#eef1ee','#5f9c2f'),'Morrisons':b('Morrisons','#00563f','#ffd53d'),'Morrisons Daily':b('Morrisons Daily','#00563f','#ffd53d'),
  'Aldi':b('ALDI','#00256b','#f4f4f4'),'Lidl':b('LIDL','#0050aa','#fff000'),'Co-op':b('co-op','#00b1e7','#ffffff'),'Iceland':b('ICELAND','#d2212d','#ffffff'),
  'Waitrose':b('Waitrose','#f5f5f0','#5b8f22','700'),'Marks & Spencer':b('M&S','#1d1d1b','#f4f4f4'),'M&S Simply Food':b('M&S FOOD','#1d1d1b','#f4f4f4'),
  'Heron Foods':b('HERON FOODS','#004b8d','#ffffff'),'Farmfoods':b('FARMFOODS','#e31b23','#ffffff'),'One Stop':b('One Stop','#ffffff','#2b3990'),
  'Londis':b('LONDIS','#e30613','#ffffff'),'Nisa':b('NISA local','#e21a22','#ffffff'),'Nisa Local':b('NISA local','#e21a22','#ffffff'),
  'Spar':b('SPAR','#ffffff','#d71920'),'Premier':b('Premier','#e30613','#ffffff'),'Budgens':b('budgens','#f6f6f2','#6a2c91'),'Costcutter':b('COSTCUTTER','#ffffff','#e30613'),
  'Lifestyle Express':b('Lifestyle Express','#1a3d8f','#ffffff'),'Best-one':b('Best-one','#e3051b','#ffffff'),
  // Food and drink
  'Greggs':b('GREGGS','#00558f','#ffc72c'),'Costa':b('COSTA','#6d1f37','#ffffff'),'Costa Coffee':b('COSTA','#6d1f37','#ffffff'),
  'Starbucks':b('STARBUCKS','#00704a','#ffffff'),'Caffè Nero':b('CAFFÈ NERO','#1c1c1c','#ffffff'),'Caffe Nero':b('CAFFÈ NERO','#1c1c1c','#ffffff'),
  'Pret A Manger':b('PRET A MANGER','#862633','#ffffff'),'Subway':b('SUBWAY','#008938','#ffc20e'),"Domino's":b("Domino's",'#006491','#ffffff'),
  "Domino's Pizza":b("Domino's",'#006491','#ffffff'),'Pizza Hut':b('Pizza Hut','#ee3124','#ffffff'),"Papa John's":b("PAPA JOHN'S",'#ffffff','#14653b'),
  'KFC':b('KFC','#bb262a','#eef1ee'),"McDonald's":b("McDonald's",'#23282d','#ffbc0d'),'Burger King':b('BURGER KING','#f5ebdc','#d62300'),
  "Nando's":b("NANDO'S",'#000000','#ffffff'),'Wetherspoon':b('J D WETHERSPOON','#1b2a4a','#e7d3a1','700'),'JD Wetherspoon':b('J D WETHERSPOON','#1b2a4a','#e7d3a1','700'),
  // Chemists, banks, post
  'Boots':b('Boots','#05054b','#ffffff'),'Superdrug':b('Superdrug','#e5007e','#ffffff'),'Lloyds Pharmacy':b('LloydsPharmacy','#00a650','#ffffff'),
  'Well Pharmacy':b('Well Pharmacy','#00a3ad','#ffffff'),'Barclays':b('BARCLAYS','#00aeef','#ffffff'),'Lloyds Bank':b('LLOYDS BANK','#006a4d','#ffffff'),
  'NatWest':b('NatWest','#42145f','#ffffff'),'HSBC':b('HSBC UK','#ffffff','#db0011'),
  'Santander':b('Santander','#ec0000','#ffffff'),'Halifax':b('HALIFAX','#005eb8','#ffffff'),'Nationwide':b('Nationwide','#1c1f5c','#ffffff'),
  'TSB':b('TSB','#1a3f8c','#ffffff'),'Post Office':b('Post Office','#e2001a','#ffde00'),
  // High street
  'Ladbrokes':b('Ladbrokes','#e8002d','#ffffff'),'William Hill':b('William Hill','#00143c','#fcd700'),'Coral':b('CORAL','#0b2d6c','#ffffff'),
  'Paddy Power':b('PADDY POWER','#004833','#ffffff'),'Betfred':b('BETFRED','#0b4a9b','#ffffff'),'Specsavers':b('Specsavers','#00843d','#ffffff'),
  'Card Factory':b('cardfactory','#e6007e','#ffffff'),'Poundland':b('Poundland','#004d9c','#ffffff'),'B&M':b('B&M','#3d1f6b','#ffffff'),
  'Home Bargains':b('HOME BARGAINS','#e30613','#ffffff'),'Currys':b('currys','#4c12a1','#ffffff'),'Halfords':b('Halfords','#f37021','#ffffff'),
  'Screwfix':b('SCREWFIX','#003c71','#ffffff'),'Toolstation':b('TOOLSTATION','#003da5','#ffd100'),'Argos':b('Argos','#d42114','#ffffff'),
  'Timpson':b('TIMPSON','#002d72','#ffffff'),'Oxfam':b('Oxfam','#61a534','#ffffff'),
  'British Heart Foundation':b('British Heart Foundation','#ffffff','#e2001a'),'Cancer Research UK':b('Cancer Research UK','#ffffff','#2e008b'),
  // Petrol
  'BP':b('bp','#007f00','#ffffff'),'Shell':b('Shell','#ffd500','#dd1d21'),'Esso':b('Esso','#ffffff','#e2001a'),'Texaco':b('TEXACO','#d71920','#ffffff'),
  'Jet':b('JET','#ffd400','#004b93'),'Gulf':b('Gulf','#f47b20','#003a70'),'Murco':b('MURCO','#e30613','#ffffff'),'Applegreen':b('applegreen','#00a651','#ffffff')
};

const norm=(s:string)=>s.toLowerCase().replace(/[’'`]/g,'').replace(/\s*&\s*|\s+and\s+/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const BY_NORM=new Map(Object.entries(BRAND_SIGNS).map(([k,v])=>[norm(k),v]));

/** The chain's sign, from the map's brand tag or a name that is the chain's (or starts with it: "Tesco Express"). */
export function brandSign(name:string,brand?:string):BrandSign|null{
  for(const s of [brand,name]){
    if(!s)continue;
    const n=norm(s),exact=BY_NORM.get(n);
    if(exact)return exact;
  }
  // "Boots Pharmacy", "Greggs Bakery": the chain's name first, then a word or two more.
  const n=norm(name);
  for(const [k,v] of BY_NORM)if(k.length>=4&&n.startsWith(`${k} `)&&n.split(' ').length<=k.split(' ').length+2)return v;
  return null;
}

/** A trade's usual sign: colours, and lettering weight (independent shops). */
export const TRADE_SIGNS:Readonly<Record<BusinessKind,{background:string;colour:string;weight:string}>>={
  supermarket:{background:'#f3f1ea',colour:'#1f5f2e',weight:'800'},
  convenience:{background:'#1f4f86',colour:'#ffffff',weight:'700'},
  pharmacy:{background:'#0b7a3e',colour:'#ffffff',weight:'700'},
  pub:{background:'#1c2e24',colour:'#e3c779',weight:'700'},
  cafe:{background:'#4a2f22',colour:'#f3e6cf',weight:'600'},
  restaurant:{background:'#262626',colour:'#efe6d2',weight:'600'},
  takeaway:{background:'#b3261e',colour:'#ffffff',weight:'800'},
  bank:{background:'#14315c',colour:'#ffffff',weight:'700'},
  'post-office':{background:'#d4202a',colour:'#ffde00',weight:'800'},
  hairdresser:{background:'#141414',colour:'#f2f2f2',weight:'600'},
  bookmaker:{background:'#0b4d2a',colour:'#ffffff',weight:'800'},
  charity:{background:'#6b2156',colour:'#ffffff',weight:'700'},
  'estate-agent':{background:'#24426e',colour:'#ffffff',weight:'700'},
  fuel:{background:'#1f4f86',colour:'#ffffff',weight:'800'},
  shop:{background:'',colour:'#f1ead6',weight:'600'}
};

/** A business's trade from its name where the map gives none ("Eden Pharmacy", "Hair Touch Barbers"). */
export function tradeFromName(name:string):BusinessKind|null{
  const n=name.toLowerCase();
  if(/pharmacy|chemist/.test(n))return 'pharmacy';
  if(/post office/.test(n))return 'post-office';
  if(/\b(pub|inn|tavern|arms|bar)\b/.test(n))return 'pub';
  if(/caf[eé]|coffee/.test(n))return 'cafe';
  if(/kebab|chicken|pizza|fish|chips|grill|takeaway|burger/.test(n))return 'takeaway';
  if(/restaurant|kitchen|bistro|curry|tandoori|thai|chinese/.test(n))return 'restaurant';
  if(/barber|hair|salon|beauty|nails/.test(n))return 'hairdresser';
  if(/\bbank\b|building society/.test(n))return 'bank';
  if(/news|food ?(and|&) ?wine|off licen[cs]e|convenience|express|local\b|mini ?market|supermarket/.test(n))return 'convenience';
  if(/estate agent|lettings|properties/.test(n))return 'estate-agent';
  if(/bet|bookmaker/.test(n))return 'bookmaker';
  return null;
}
