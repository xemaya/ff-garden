export const ROYAL_STREET=Object.freeze({id:'royal',label:'听风王城',path:'data/royal-city.json'});

export function selectStreet(query,manifest){
  if(query.has('sample'))return {sample:true,royal:false,street:null};
  if(query.has('street')){
    const street=manifest.streets.find(entry=>entry.id===query.get('street'));
    if(!street)throw new Error('未知街道');
    return {sample:false,royal:false,street};
  }
  // Existing role/study links with no explicit district keep their old street.
  // An unknown district safely enters the new default instead of fetching it.
  if(!query.toString()||query.has('district'))return {sample:false,royal:true,street:{...ROYAL_STREET}};
  const street=manifest.streets.find(entry=>entry.id===manifest.defaultStreet);
  return street?{sample:false,royal:false,street}:{sample:true,royal:false,street:null};
}
