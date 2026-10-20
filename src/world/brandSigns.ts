/**
 * Brand sign styles for businesses the map data names (the project owner chose to show brands): the lettering,
 * colours and weight of each sign follow the owner's asset Batch D sign textures (brand-coloured lettering, not
 * traced logos). Used only on a building whose OpenStreetMap name is exactly the brand. Trademarks belong to
 * their owners; no affiliation is claimed.
 */
export interface BrandSign{text:string;background:string;colour:string;weight:string}

export const BRAND_SIGNS:Readonly<Record<string,BrandSign>>={
  "KFC":{text:'KFC',background:'#bb262a',colour:'#eef1ee',weight:'800'},
  "McDonald's":{text:"McDonald's",background:'#23282d',colour:'#eef1ee',weight:'800'},
  'Tesco Express':{text:'TESCO express',background:'#eef1ee',colour:'#1b4c93',weight:'800'},
  "Sainsbury's":{text:"Sainsbury's",background:'#23282d',colour:'#e76a1d',weight:'800'}
};

export const brandSign=(name:string):BrandSign|null=>BRAND_SIGNS[name]??null;
