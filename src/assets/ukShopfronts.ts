/**
 * Reusable, location-independent British high-street shopfront variants.
 * Deterministic from a stable building ID: reloading or changing scenarios never
 * changes the fixed street. No brand is inferred from a colour or frontage.
 * All dimensions are metres and are clamped to the available mapped wall.
 */
export interface ShopfrontVariant {
  readonly id: 'uk-shopfront-compact'|'uk-shopfront-glazed'|'uk-shopfront-traditional';
  readonly doorSide: 'left'|'right';
  readonly recess: number;
  readonly stallHeight: number;
  readonly mullionSpacing: number;
  readonly canopy: boolean;
}
function hash(value:string):number {
  let n=2166136261;
  for(let i=0;i<value.length;i++)n=Math.imul(n^value.charCodeAt(i),16777619);
  return n>>>0;
}
export function shopfrontVariant(buildingId:string,unitIndex:number,unitWidth:number):ShopfrontVariant {
  const h=hash(`${buildingId}:${unitIndex}`);
  const traditional=h%3===0;
  const glazed=h%3===1;
  return {
    id:traditional?'uk-shopfront-traditional':glazed?'uk-shopfront-glazed':'uk-shopfront-compact',
    doorSide:(h>>>3)%2?'left':'right',
    recess:unitWidth>=3.4?(traditional?.28:.18):.08,
    stallHeight:glazed?.25:traditional?.65:.45,
    mullionSpacing:glazed?1.85:traditional?1.15:1.5,
    canopy:traditional&&unitWidth>=4.2
  };
}

/** What a shop window shows: goods on shelves, a clothes rail, a café or takeaway counter, a pub bar, or an office. */
export type ShopDisplay='shelves'|'rail'|'cafe'|'pub'|'office';

const DISPLAY_BY_NAME:Array<[RegExp,ShopDisplay]>=[
  [/\b(arms|swan|merchant|tavern|inn|pub|bar)\b/i,'pub'],
  [/(greggs|kfc|mcdonald|nando|cr[eê]perie|peking|kitchen|caf[eé]|coffee|costa|starbucks|pizza|grill|tea|bakery|restaurant|chicken|subway|figo|yaya)/i,'cafe'],
  [/(bank|halifax|santander|hsbc|lloyds|barclays|natwest|nationwide|building society|betfred|coral|ladbrokes|william hill|letting|estate agent|solicitor|insurance|surgery|dental|clinic)/i,'office'],
  [/(sue ryder|cancer research|hospice|oxfam|british heart|barnardo|charity|clothing|fashion|boutique)/i,'rail']
];

/**
 * The window display for a shop unit: from its mapped name where one says what it is (a pub, a café or
 * takeaway, a bank or agent, a charity or clothes shop), otherwise goods on shelves or, now and then, a clothes rail.
 */
export function shopDisplay(name:string|undefined,buildingId:string,unitIndex:number):ShopDisplay{
  if(name)for(const [re,kind] of DISPLAY_BY_NAME)if(re.test(name))return kind;
  return hash(`${buildingId}:${unitIndex}:display`)%4===0?'rail':'shelves';
}
