"""Authored FF9-inspired black mage: cloth shell, bent hat and baked rig.
Reuses one generated cloth atlas plus the accepted courier's leather image.
"""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector,Euler
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/assets/characters/mage';EVID=ROOT/'evidence/mage'
OUT.mkdir(parents=True,exist_ok=True);EVID.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=24;objects=[];atlas=bpy.data.images.load(str(OUT/'cloth-atlas.png'))
def material(name,color,tex=None,emission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.92
 if tex:
  n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=atlas if tex=='atlas' else bpy.data.images.load(str(OUT/tex));m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
blue=material('Worn indigo cloth',(.15,.23,.39),'atlas');ochre=material('Weathered ochre linen',(.65,.40,.15),'atlas');ivory=material('Ivory canvas',(.73,.65,.50),'atlas');stripe=material('Tan pinstriped breeches',(.61,.47,.30),'atlas');leather=material('Soft worn leather',(.26,.14,.06),'leather.png');sole=material('Dark leather sole',(.08,.047,.022));shadow=material('Face is shadow only',(.0007,.0009,.0013));yellow=material('Warm luminous eyes',(1,.58,.055),emission=3.2);brass=material('Old brass buttons',(.35,.24,.09));magic=material('A small warm spell',(1,.48,.03),emission=4)
tiles={blue:(0,.5),ochre:(.5,.5),ivory:(0,0),stripe:(.5,0)}
def apply(o,modifier):
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=modifier.name)
def mesh(name,verts,faces,mat):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free();o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);d.materials.append(mat)
 for f in d.polygons:f.use_smooth=True
 return o
def sphere(name,loc,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 return o
def sculpt(parts,name,limit=5000):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 rem=o.modifiers.new('Cloth union','REMESH');rem.mode='VOXEL';rem.voxel_size=.007;apply(o,rem)
 sm=o.modifiers.new('Soft sculpt','SMOOTH');sm.factor=.6;sm.iterations=4;apply(o,sm)
 sub=o.modifiers.new('Rounded forms','SUBSURF');sub.levels=1;apply(o,sub)
 if len(o.data.polygons)>limit:dec=o.modifiers.new('Game mesh','DECIMATE');dec.ratio=limit/len(o.data.polygons);apply(o,dec)
 for f in o.data.polygons:f.use_smooth=True
 return o
def shell(o,thickness=.008,sub=1):
 if sub:m=o.modifiers.new('Soft fabric surface','SUBSURF');m.levels=sub;apply(o,m)
 m=o.modifiers.new('Actual cloth thickness','SOLIDIFY');m.thickness=thickness;apply(o,m)
 return o
def profile(name,rows,mat,n=48,fold=.006):
 verts=[];faces=[]
 for i,(z,x,y,rx,ry) in enumerate(rows):
  for j in range(n):
   t=j*math.tau/n;w=fold*math.sin(t*7+z*13)*math.sin(math.pi*i/(len(rows)-1));verts.append((x+(rx+w)*math.cos(t),y+(ry+w)*math.sin(t),z))
 for i in range(len(rows)-1):
  for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
 faces.extend([tuple(range(n-1,-1,-1)),tuple(range((len(rows)-1)*n,len(rows)*n))]);return mesh(name,verts,faces,mat)
# The coat is a joined shoulder/sleeve sculpt, opened at hem, cuffs and front.
rows=[(.355,0,0,.267,.174),(.47,0,0,.250,.170),(.62,0,0,.223,.149),(.78,0,0,.223,.154),(.89,0,0,.229,.151),(.97,0,0,.145,.108),(.992,0,0,.11,.092)]
parts=[profile('Coat torso',rows,blue)]
for side in [-1,1]:
 parts.append(profile('Loose sleeve',[(.475,side*.349,-.072,.128,.112),(.54,side*.345,-.064,.121,.100),(.64,side*.320,-.035,.103,.09),(.76,side*.28,-.010,.106,.094),(.86,side*.24,0,.112,.10),(.92,side*.18,0,.09,.08)],blue,32))
coat=sculpt(parts,'Continuous coat shoulders and sleeves',18000)
closed_coat=coat.copy();closed_coat.data=coat.data.copy();scene.collection.objects.link(closed_coat)
# V shaped opening under the second button, a real cut in the cloth shell.
wedge=mesh('Front opening cutter',[(-.14,-.5,.34),(.14,-.5,.34),(0,-.5,.73),(-.14,-.055,.34),(.14,-.055,.34),(0,-.055,.73)],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],blue)
m=coat.modifiers.new('Split coat front','BOOLEAN');m.operation='DIFFERENCE';m.object=wedge;apply(coat,m);bpy.data.objects.remove(wedge,do_unlink=True)
bm=bmesh.new();bm.from_mesh(coat.data)
remove=[f for f in bm.faces if f.calc_center_median().z<.379 or (abs(f.calc_center_median().x)>.28 and f.calc_center_median().z<.49)]
bmesh.ops.delete(bm,geom=remove,context='FACES');bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(coat.data);bm.free()
# Low broad folds enhance silhouette, rather than noisy surface bumps.
for v in coat.data.vertices:
 x,y,z=v.co;theta=math.atan2(y,x);r=math.hypot(x,y)
 if r>1e-4 and abs(x)<.29:
  d=.011*math.sin(theta*9+z*7)*(1-math.exp(-max(0,.90-z)*6));v.co.x+=x/r*d;v.co.y+=y/r*d
shell(coat,.007,0);objects.append((coat,'coat'))
# Upturned folded collar/lapels, with soft but readable thickness.
for side in [-1,1]:
 verts=[];faces=[];n=16;m=8
 for j in range(m+1):
  v=j/m
  for i in range(n+1):
   u=i/n;a=Vector((side*(.025+.15*u),-.175+.095*u,.87+.086*u));b=Vector((side*(.025+.210*u),-.203+.054*u,.905+.17*u));p=a.lerp(b,v);p.y-=.012*math.sin(v*math.pi)*math.sin(u*math.pi);verts.append(p)
 for j in range(m):
  for i in range(n):k=j*(n+1)+i;faces.append((k,k+1,k+n+2,k+n+1))
 o=shell(mesh('Turned collar '+str(side),verts,faces,ivory),.010,1);objects.append((o,'Chest'))
for z in [.842,.712]:objects.append((sphere('Brass coat button',(0,-.18,z),(.024,.009,.024),brass),'Chest' if z>.8 else 'Spine'))
# Puffy striped trousers tucked into ankle boots.
objects.append((sphere('High waist under coat',(0,.012,.525),(.19,.135,.165),stripe),'Spine'))
boots=[];gloves=[]
for side in [-1,1]:
 tag='L' if side<0 else 'R'
 p=profile('Breeches '+tag,[(.19,side*.117,0,.064,.068),(.23,side*.119,0,.099,.092),(.31,side*.113,0,.112,.108),(.40,side*.110,0,.109,.105),(.49,side*.10,0,.085,.084)],stripe,40,.007);sub=p.modifiers.new('Soft breeches','SUBSURF');sub.levels=1;apply(p,sub);objects.append((p,'pants_'+tag))
 b=sculpt([sphere('Boot ankle',(side*.12,-.008,.135),(.078,.082,.115),leather),sphere('Rounded boot toe',(side*.12,-.08,.065),(.083,.132,.062),leather)],'Soft ankle boot '+tag,2400);objects.append((b,'Foot_'+tag));boots.append(b)
 objects.append((sphere('Boot sole',(side*.12,-.075,.026),(.084,.135,.022),sole),'Foot_'+tag))
 g=sculpt([sphere('Glove mitt',(side*.344,-.077,.414),(.068,.059,.077),ivory),sphere('Glove thumb',(side*.297,-.105,.422),(.026,.030,.043),ivory)],'Continuous glove '+tag,1500);objects.append((g,'Hand_'+tag));gloves.append(g)
head=sphere('Recessed black face',(0,-.005,1.097),(.245,.192,.220),shadow);objects.append((head,'Head'))
for side in [-1,1]:objects.append((sphere('Luminous eye '+str(side),(side*.073,-.186,1.11),(.022,.016,.044),yellow),'Eye_'+('L' if side<0 else 'R')))
proxy_parts=[closed_coat]
for source in [head]+gloves:
 o=source.copy();o.data=source.data.copy();scene.collection.objects.link(o);proxy_parts.append(o)
weight_proxy=sculpt(proxy_parts,'Solid skin-weight proxy',10000)
# Bent crown and undulating brim share their base vertices in a single shell.
centers=[(0,0,1.24,.270),(0,0,1.31,.258),(.007,.006,1.42,.222),(.013,.012,1.56,.178),(.013,.014,1.70,.123),(.040,.016,1.81,.083),(.120,.018,1.857,.060),(.230,.020,1.82,.036),(.32,.022,1.72,.012)]
verts=[];faces=[];n=64
for i,(x,y,z,r) in enumerate(centers):
 c=Vector((x,y,z));a=Vector(centers[max(0,i-1)][:3]);b=Vector(centers[min(len(centers)-1,i+1)][:3]);tangent=(b-a).normalized();e1=Vector((0,1,0)).cross(tangent).normalized();e2=tangent.cross(e1).normalized()
 if i==0:e1=Vector((1,0,0));e2=Vector((0,1,0))
 for j in range(n):
  t=j*math.tau/n;d=(.015*math.sin(t*5+z*11)+.006*math.sin(t*3-z*15))*math.sin(i/(len(centers)-1)*math.pi);verts.append(c+e1*(r+d)*math.cos(t)+e2*(r*.88+d)*math.sin(t))
for i in range(len(centers)-1):
 for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
tip=len(verts);verts.append((.34,.022,1.686))
for j in range(n):faces.append(((len(centers)-1)*n+j,(len(centers)-1)*n+(j+1)%n,tip))
prev=list(range(n))
for k in range(1,9):
 u=k/8;r=.270+.28*u;current=[]
 for j in range(n):
  t=j*math.tau/n;front=max(0,-math.sin(t))**6;z=1.24+u*u*(.047*math.sin(3*t+.3)+.028*math.cos(t*2)-.03+.10*front)
  current.append(len(verts));verts.append((r*math.cos(t),r*.88*math.sin(t),z))
 for j in range(n):faces.append((prev[j],current[j],current[(j+1)%n],prev[(j+1)%n]))
 prev=current
hat=shell(mesh('One soft bent hat and brim',verts,faces,ochre),.008,1);objects.append((hat,'hat'))
band=profile('Dark leather hat band',[(1.26,0,0,.275,.244),(1.292,0,0,.265,.237),(1.32,0,0,.260,.233)],leather,64,0)
# Remove caps from this decorative wrapped band.
bm=bmesh.new();bm.from_mesh(band.data);bmesh.ops.delete(bm,geom=[f for f in bm.faces if len(f.verts)>8],context='FACES');bm.to_mesh(band.data);bm.free();shell(band,.004,1);objects.append((band,'Hat'))
orb=sphere('Small amber magic',(0,-.425,.815),(.063,.063,.063),magic);objects.append((orb,'Spell'))
# Compact real rig, separate secondary hat and coat motion controls.
a=bpy.data.armatures.new('Black mage skeleton');rig=bpy.data.objects.new('BlackMageRig',a);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bones={}
def bone(name,h,t,parent=None):
 b=a.edit_bones.new(name);b.head=h;b.tail=t
 if parent:b.parent=bones[parent]
 bones[name]=b
bone('Root',(0,0,0),(0,0,.14));bone('Spine',(0,0,.38),(0,0,.81),'Root');bone('Chest',(0,0,.78),(0,0,1.0),'Spine');bone('Head',(0,0,.99),(0,0,1.22),'Chest');bone('Hat',(0,0,1.22),(0,0,1.66),'Head');bone('HatTip',(.02,.01,1.70),(.26,.02,1.80),'Hat')
for side in [-1,1]:
 tag='L' if side<0 else 'R';bone('UpperArm_'+tag,(side*.16,0,.88),(side*.293,-.012,.67),'Chest');bone('Forearm_'+tag,(side*.293,-.012,.67),(side*.344,-.061,.46),'UpperArm_'+tag);bone('Hand_'+tag,(side*.344,-.061,.46),(side*.344,-.09,.375),'Forearm_'+tag)
 bone('Thigh_'+tag,(side*.11,0,.42),(side*.115,0,.255),'Root');bone('Shin_'+tag,(side*.115,0,.255),(side*.12,-.018,.13),'Thigh_'+tag);bone('Foot_'+tag,(side*.12,-.018,.13),(side*.12,-.15,.06),'Shin_'+tag)
 bone('Eye_'+tag,(side*.073,-.186,1.11),(side*.073,-.186,1.15),'Head');bone('Coat_'+tag,(side*.10,0,.63),(side*.22,0,.38),'Spine')
bone('Spell',(0,-.425,.815),(0,-.425,.88),'Chest');bpy.ops.object.mode_set(mode='OBJECT')
def smooth(lo,hi,x):u=max(0,min(1,(x-lo)/(hi-lo)));return u*u*(3-2*u)
def weights(o,label):
 if label=='coat':
  active={'Spine','Chest','UpperArm_L','UpperArm_R','Forearm_L','Forearm_R'}
  for b in a.bones:b.use_deform=b.name in active
  bpy.ops.object.select_all(action='DESELECT');weight_proxy.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.parent_set(type='ARMATURE_AUTO')
  for b in a.bones:b.use_deform=True
  proxy_tree=BVHTree.FromPolygons([v.co for v in weight_proxy.data.vertices],[tuple(f.vertices) for f in weight_proxy.data.polygons]);assignments=[]
  for v in o.data.vertices:
   hit,normal,face,distance=proxy_tree.find_nearest(v.co);w={};total=0
   for vi in weight_proxy.data.polygons[face].vertices:
    near=weight_proxy.data.vertices[vi];factor=1/max(1e-7,(near.co-hit).length_squared);total+=factor
    for g in near.groups:
     name=weight_proxy.vertex_groups[g.group].name;w[name]=w.get(name,0)+g.weight*factor
   w={name:value/total for name,value in w.items() if value>1e-6};assert w,('coat proxy heat weight failed',v.index)
   flap=(1-smooth(.43,.66,v.co.z))*.30;w={name:value*(1-flap) for name,value in w.items()};w['Coat_'+('L' if v.co.x<0 else 'R')]=flap;assignments.append(w)
  bpy.data.objects.remove(weight_proxy,do_unlink=True)
  mod=o.modifiers.new('Transferred cloth skin','ARMATURE');mod.object=rig;o.parent=rig
 else:assignments=[]
 for i,v in enumerate(o.data.vertices):
  x,y,z=v.co;side='L' if x<0 else 'R'
  if label=='coat':w=assignments[i]
  elif label=='hat':u=smooth(.05,.24,x) if z>1.35 else 0;w={'Hat':1-u,'HatTip':u}
  elif label.startswith('pants_'):u=smooth(.21,.31,z);w={'Thigh_'+label[-1]:u,'Shin_'+label[-1]:1-u}
  else:w={label:1}
  w=dict(sorted(w.items(),key=lambda t:t[1],reverse=True)[:4]);total=sum(w.values())
  for name,value in w.items():
   group=o.vertex_groups.get(name) or o.vertex_groups.new(name=name)
   if value>1e-6:group.add([i],value/total,'REPLACE')
 if label!='coat':m=o.modifiers.new('Mage skin','ARMATURE');m.object=rig;o.parent=rig
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
 mat=o.data.materials[0]
 if mat in tiles:
  ox,oy=tiles[mat]
  for loop_index,loop in enumerate(o.data.uv_layers.active.data):
   if mat==stripe:
    pos=o.data.vertices[o.data.loops[loop_index].vertex_index].co;uvx=(math.atan2(pos.y,pos.x-(.11 if pos.x>0 else -.11))/math.tau+.5);uvy=max(0,min(1,(pos.z-.18)/.5));loop.uv=(ox+.025+uvx*.45,oy+.025+uvy*.45)
   else:
    pos=o.data.vertices[o.data.loops[loop_index].vertex_index].co
    if mat==blue:uvx=math.atan2(pos.y,pos.x)/math.tau+.5;uvy=(pos.z-.37)/.65
    elif mat==ochre:
     if pos.z<1.34:uvx=(pos.x/.58+1)/2;uvy=(pos.y/.52+1)/2
     else:uvx=math.atan2(pos.y,pos.x)/math.tau+.5;uvy=(pos.z-1.24)/.68
    else:uvx=(pos.x+.5);uvy=(pos.z-.3)/.82
    loop.uv=(ox+.025+max(0,min(1,uvx))*.45,oy+.025+max(0,min(1,uvy))*.45)
 o.select_set(False)
for o,label in objects:weights(o,label)
rig.scale=(.80,)*3
for b in rig.pose.bones:b.rotation_mode='QUATERNION'
rest={b.name:b.matrix_local.to_quaternion() for b in a.bones}
def rotation(name,xyz):q=Euler(xyz,'XYZ').to_quaternion();rig.pose.bones[name].rotation_quaternion=rest[name].inverted()@q@rest[name]
def reset():
 for b in rig.pose.bones:b.location=(0,0,0);b.scale=(1,1,1);b.rotation_quaternion=(1,0,0,0)
def bvh(o):
 ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();tree=BVHTree.FromPolygons([ev.matrix_world@v.co for v in me.vertices],[tuple(f.vertices) for f in me.polygons]);ev.to_mesh_clear();return tree
soles=[o for o,label in objects if o.name.startswith('Boot sole')]
def pose(kind,t):
 reset();p=rig.pose.bones;phase=t*math.tau/(.9 if kind=='Walk' else 4)
 rotation('Chest',(math.sin(phase)*.012,0,math.sin(phase)*.008));rotation('Head',(math.sin(phase)*.018,math.sin(phase)*.045,0));rotation('HatTip',(0,math.sin(phase)*.035,math.sin(phase)*.02));p['Spell'].scale=(.0001,)*3
 if kind=='Walk':
  for side in [-1,1]:
   tag='L' if side<0 else 'R';v=math.sin(phase+(math.pi if side<0 else 0));rotation('Thigh_'+tag,(v*.34,0,0));rotation('Shin_'+tag,(max(0,-v)*-.20,0,0));rotation('Foot_'+tag,(-v*.10,0,0));rotation('UpperArm_'+tag,(-v*.14,0,0));rotation('Coat_'+tag,(v*.065,0,side*abs(v)*.02))
  p['Root'].location.y=.013*abs(math.sin(phase));rotation('Head',(0,0,math.sin(phase)*.02))
 elif kind=='Greet':
  u=min(1,t/.6,max(0,(3-t)/.6));rotation('UpperArm_L',(-1.30*u,-.14*u,0));rotation('Forearm_L',(-.38*u,0,.09*math.sin(t*6)*u));rotation('Hand_L',(0,0,.15*math.sin(t*6)*u));rotation('Head',(.10*u,0,-.04*u))
 elif kind=='Magic':
  u=min(1,t/.8,max(0,(4-t)/.8))
  for side in [-1,1]:
   tag='L' if side<0 else 'R';rotation('UpperArm_'+tag,(-1.1*u,side*.28*u,0));rotation('Forearm_'+tag,(-.36*u,side*.12*u,0));rotation('Hand_'+tag,(.18*u,0,0))
  rotation('Head',(.08*u,0,0));pulse=u*(.78+.12*math.sin(t*7));p['Spell'].scale=(max(.0001,pulse),)*3
 bpy.context.view_layer.update();low=999
 for o in soles+boots:
  ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in me.vertices));ev.to_mesh_clear()
 if low<.003:p['Root'].location.y+=(.003-low)/.8
 bpy.context.view_layer.update();after=999
 for o in soles+boots:
  ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();after=min(after,min((ev.matrix_world@v.co).z for v in me.vertices));ev.to_mesh_clear()
 return after
rig.animation_data_create();actions=[];contacts={};clearance={}
for name,duration in [('Idle',4),('Walk',.9),('Greet',3),('Magic',4)]:
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;frames=round(duration*24)+1;ground=[];samples=[]
 for frame in range(1,frames+1):
  scene.frame_set(frame);ground.append(pose(name,(frame-1)/(frames-1)*duration));headtree=bvh(head);hattree=bvh(hat);samples.append({'gloveHeadSurfacePairs':sum(len(bvh(g).overlap(headtree)) for g in gloves),'gloveHatSurfacePairs':sum(len(bvh(g).overlap(hattree)) for g in gloves)})
  for b in rig.pose.bones:b.keyframe_insert(data_path='rotation_quaternion',frame=frame);b.keyframe_insert(data_path='location',frame=frame);b.keyframe_insert(data_path='scale',frame=frame)
 actions.append(action);contacts[name]={'minimumSoleZ':min(ground),'frames':frames};clearance[name]={key:max(v[key] for v in samples) for key in samples[0]}
rig.animation_data.action=actions[0];scene.frame_set(1);pose('Idle',0)
for clip,c in clearance.items():assert all(v==0 for v in c.values()),(clip,c)
for o,label in objects:
 for v in o.data.vertices:assert abs(sum(g.weight for g in v.groups)-1)<.002,(o.name,v.index)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o,label in objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(OUT/'black-mage-v1.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_merge_animation='ACTION',export_skins=True,export_def_bones=True,export_force_sampling=True,export_optimize_animation_size=True,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'black-mage-v1.blend'))
report={'joints':len(a.bones),'meshes':len(objects),'actions':[a.name for a in actions],'allWeightsNormalized':True,'groundSamples':contacts,'surfaceIntersections':clearance,'scale':.8,'newImageCalls':2,'server4090Tasks':0,'training':'none','coatBinding':'bone heat on closed solid proxy transferred to cloth shell','source':'authored cloth geometry, Blender heat skin, one generated atlas and reused leather'}
(EVID/'build-report.json').write_text(json.dumps(report,indent=2));print('MAGE_BUILD',json.dumps(report))
