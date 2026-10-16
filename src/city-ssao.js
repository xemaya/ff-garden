import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';

// The stock normal override ignores a SpriteMaterial's radial alpha map, turning
// each halo into an opaque square depth occluder. FX do not represent solid surfaces.
export class CitySSAOPass extends SSAOPass {
  excludeSprites=true;
  overrideVisibility(){
    super.overrideVisibility();
    if(!this.excludeSprites)return;
    this.scene.traverse(o=>{if(o.isSprite||o.userData.excludeFromSSAO)o.visible=false;});
  }
}
