"""Prepare CC0 MakeHuman female head topology from the installed local MPFB.
Only a head is retained; no helper meshes or original body is exported.
"""
import bpy,bmesh,json
from pathlib import Path
from mathutils import Vector
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
ROOT=Path(__file__).resolve().parents[1];data=Path(LocationService.get_mpfb_data('3dobjs')).parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
macro=TargetService.get_default_macro_info_dict();macro.update({'gender':0.0,'age':.38,'muscle':.32,'weight':.44});macro['race']={'asian':.7,'caucasian':.3,'african':0.0}
o=HumanService.create_human(mask_helpers=False,detailed_helpers=False,extra_vertex_groups=True,feet_on_ground=True,scale=.1,macro_detail_dict=macro)
for name,weight in [('eyes/l-eye-scale-incr',.20),('eyes/r-eye-scale-incr',.20),('chin/chin-width-decr',.18),('nose/nose-point-width-decr',.12)]:
 path=data/'targets'/(name+'.target.gz')
 if path.exists():TargetService.load_target(o,str(path),weight=weight)
TargetService.bake_targets(o)
eye_source={}
for side,indices in [('L',range(13606,13614)),('R',range(13614,13622))]:eye_source[side]=sum((o.data.vertices[i].co for i in indices),Vector())/8
# Save the group membership as attributes before changing mesh indices.
body=o.vertex_groups['body'].index;lip=o.vertex_groups['lips'].index;ear=o.vertex_groups['ears'].index
lip_attr=o.data.attributes.new('lip_region','BOOLEAN','POINT')
for v in o.data.vertices:lip_attr.data[v.index].value=any(g.group==lip for g in v.groups)
keep={v.index for v in o.data.vertices if any(g.group==body for g in v.groups) and v.co.z>1.27}
# Normalized extraction threshold tracks the actual macro head size.
scalp=o.vertex_groups['scalp'].index;top=max(v.co.z for v in o.data.vertices if any(g.group==scalp for g in v.groups));lip_z=sum(v.co.z for v in o.data.vertices if any(g.group==lip for g in v.groups))/sum(1 for v in o.data.vertices if any(g.group==lip for g in v.groups))
cut=lip_z-.080;keep={v.index for v in o.data.vertices if any(g.group==body for g in v.groups) and v.co.z>cut}
bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS');bm.to_mesh(o.data);bm.free();o.name='GarnetFemaleHeadBase';o.data.materials.clear();o.vertex_groups.clear()
# Fit the natural female facial anatomy to the existing Garnet body/hair.
zs=(1.748-1.485)/(top-(lip_z-.027));sx=1.34;sy=1.15
for v in o.data.vertices:v.co=Vector((v.co.x*sx,v.co.y*sy+.070,1.485+(v.co.z-(lip_z-.027))*zs))
o['eye_centres']=json.dumps({side:[c.x*sx,c.y*sy+.070,1.485+(c.z-(lip_z-.027))*zs] for side,c in eye_source.items()});o.data.update();bm=bmesh.new();bm.from_mesh(o.data);bound=[e for e in bm.edges if e.is_boundary];loops=[]
while bound:
 edges=[bound.pop(0)];verts=set(edges[0].verts);changed=True
 while changed:
  changed=False
  for e in list(bound):
   if any(v in verts for v in e.verts):edges.append(e);verts.update(e.verts);bound.remove(e);changed=True
 pts=[v.co for v in verts];avg=sum(pts,Vector())/len(pts);loops.append({'count':len(pts),'center':list(avg),'min':[min(v[i]for v in pts)for i in range(3)],'max':[max(v[i]for v in pts)for i in range(3)]})
bm.free();out=ROOT/'authoring/characters/royal-cast/garnet-head-v3.blend';out.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(out),compress=True)
report={'source':'MakeHuman hm08 CC0 base topology, installed MPFB macro shapes','macro':macro,'headOnly':True,'bounds':[[min(v.co[i]for v in o.data.vertices),max(v.co[i]for v in o.data.vertices)]for i in range(3)],'lip_z':lip_z,'sourceTop':top,'scale':[sx,sy,zs],'boundaries':loops};p=ROOT/'evidence/garnet-v3';p.mkdir(parents=True,exist_ok=True);(p/'head-provenance.json').write_text(json.dumps(report,indent=2));print('HEAD_PREPARED',json.dumps(report),flush=True)
