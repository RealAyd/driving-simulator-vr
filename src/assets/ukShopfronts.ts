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
