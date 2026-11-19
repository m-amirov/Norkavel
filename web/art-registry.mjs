// Exact allowlist for candidate G3 actor art. The manifest, not filename alone,
// decides whether a downloaded image is integrated into the runtime.
export const G3_ACTORS = Object.freeze([
  {id:'sentinel',source:'companion-sentinel-master-0.3',path:'assets/art/g3/sentinel-master-0.3.webp',size:[512,512],team:'ally'},
  {id:'ember',source:'companion-ember-master-0.3',path:'assets/art/g3/ember-master-0.3.webp',size:[512,512],team:'ally'},
  {id:'healer',source:'companion-healer-master-0.3',path:'assets/art/g3/healer-master-0.3.webp',size:[512,512],team:'ally'},
  {id:'ash',source:'companion-ash-master-0.3',path:'assets/art/g3/ash-master-0.3.webp',size:[512,512],team:'ally'}
]);
const sha256 = /^[a-f0-9]{64}$/;
export function readyG3Actors(manifest) {
  if(!manifest || manifest.schema!==1 || !Array.isArray(manifest.images))return [];
  return G3_ACTORS.flatMap(definition=>{
    const matches=manifest.images.filter(entry=>entry?.id===definition.source);
    if(matches.length!==1)return [];
    const image=matches[0];
    if(image.path!==definition.path ||
      image.status!=='CANDIDATE_INTEGRATED' ||
      !sha256.test(image.sha256||'') ||
      !Array.isArray(image.size) ||
      image.size.length!==2 ||
      image.size.some((n,i)=>n!==definition.size[i]) ||
      image.mode!=='RGBA')return [];
    return [{...definition,url:'/'+definition.path,sha256:image.sha256}];
  });
}
