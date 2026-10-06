"""Reusable authored FF9 riding bird: feather sculpture, fitted tack, baked rig."""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector,Euler
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/assets/characters/chocobo';EVID=ROOT/'evidence/chocobo';OUT.mkdir(parents=True,exist_ok=True);EVID.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);scene=bpy.context.scene;scene.render.fps=24;objects=[]
def material(name,color,texture=None,rough=.9):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 if texture:n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(OUT/texture));m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])
 return m
plumage=material('Soft golden down',(.9,.64,.22),'feathers.png');feather=material('Honey flight feathers',(.77,.47,.10));tips=material('Light golden feather edges',(.94,.68,.20));beakmat=material('Amber horn beak',(.49,.18,.028),rough=.65);legmat=material('Ochre scaled shanks',(.43,.24,.07));clawmat=material('Pale horn claws',(.73,.65,.43));eye=material('Dark friendly pupil',(.012,.009,.006),rough=.25);iris=material('Amber eye rim',(.23,.10,.025),rough=.45);shine=material('Small eye highlight',(.95,.91,.75),rough=.2);leather=material('Worn saddle leather',(.25,.13,.06),'leather.png');padmat=material('Tan saddle blanket',(.44,.32,.18));metal=material('Old stirrup brass',(.29,.21,.11),rough=.58);mouth=material('Beak mouth seam',(.055,.025,.009))
def apply(o,m):bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
def mesh(name,verts,faces,mat):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free();o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);d.materials.append(mat)
 for f in d.polygons:f.use_smooth=True
 return o
def sphere(name,loc,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 return o
def join(parts,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;return o
def sculpt(parts,name,limit=4000):
 o=join(parts,name);m=o.modifiers.new('Unified organic sculpt','REMESH');m.mode='VOXEL';m.voxel_size=.008;apply(o,m);m=o.modifiers.new('Soft transitions','SMOOTH');m.factor=.65;m.iterations=4;apply(o,m);m=o.modifiers.new('Rounded game form','SUBSURF');m.levels=1;apply(o,m)
 if len(o.data.polygons)>limit:m=o.modifiers.new('Game sculpt','DECIMATE');m.ratio=limit/len(o.data.polygons);apply(o,m)
 o.data.validate(verbose=False,clean_customdata=True)
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 for f in o.data.polygons:f.use_smooth=True
 return o
def tube(name,points,r,mat):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=6;c.bevel_depth=r;c.bevel_resolution=2;c.use_fill_caps=True;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,v in zip(s.bezier_points,points):p.co=v;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 return o
def leaf(name,a,b,c,width,normal,mat):
 a,b,c=Vector(a),Vector(b),Vector(c);normal=Vector(normal);verts=[];faces=[];rows=12;n=12
 for i in range(rows+1):
  t=i/rows;p=(1-t)**2*a+2*(1-t)*t*b+t*t*c;tan=(2*(1-t)*(b-a)+2*t*(c-b)).normalized();norm=(normal-tan*normal.dot(tan)).normalized();across=tan.cross(norm).normalized();w=max(.001,width*math.sin(math.pi*t)**.65*(1-.20*t));d=max(.001,.012*math.sin(math.pi*t))
  for j in range(n):
   q=j*math.tau/n;verts.append(p+across*w*math.cos(q)+norm*d*math.sin(q))
 for i in range(rows):
  for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
 faces.extend([tuple(range(n-1,-1,-1)),tuple(range(rows*n,(rows+1)*n))]);o=mesh(name,verts,faces,mat);m=o.modifiers.new('Tapered soft vane','SUBSURF');m.levels=1;apply(o,m);return o
def curved_neck():
 rows=[(1.15,-.20,.215,.210),(1.30,-.25,.179,.172),(1.43,-.31,.137,.143),(1.62,-.365,.119,.135),(1.80,-.411,.128,.153),(1.97,-.441,.161,.191)]
 verts=[];faces=[];n=40
 for z,y,rx,ry in rows:
  for j in range(n):t=j*math.tau/n;verts.append((rx*math.cos(t),y+ry*math.sin(t),z))
 for k in range(len(rows)-1):
  for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
 faces.extend([tuple(range(n-1,-1,-1)),tuple(range((len(rows)-1)*n,len(rows)*n))]);o=mesh('Flowing tapered neck',verts,faces,plumage);sub=o.modifiers.new('Soft curved neck','SUBSURF');sub.levels=2;apply(o,sub);return o
body_parts=[sphere('Pear body',(0,.05,1.025),(.365,.515,.46),plumage),sphere('Breast',(0,-.17,1.19),(.253,.260,.32),plumage),curved_neck(),sphere('Alert head',(0,-.45,1.95),(.213,.250,.245),plumage)]
for side in [-1,1]:body_parts.append(sphere('Feather thigh',(side*.19,.012,.69),(.137,.20,.242),plumage))
body=sculpt(body_parts,'Continuous body neck and head',18000);objects.append((body,'body'))
# Upper bill has a curved hooked point; lower bill gets its own opening bone.
def bill(name,rows,mat):
 verts=[];faces=[];n=32
 for y,z,rx,rz in rows:
  for j in range(n):t=j*math.tau/n;verts.append((rx*math.cos(t),y,z+rz*math.sin(t)))
 for i in range(len(rows)-1):
  for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
 faces.extend([tuple(range(n-1,-1,-1)),tuple(range((len(rows)-1)*n,len(rows)*n))]);o=mesh(name,verts,faces,mat);m=o.modifiers.new('Smooth horn','SUBSURF');m.levels=2;apply(o,m);return o
objects.append((bill('Curved upper beak',[(-.58,1.77,.128,.085),(-.69,1.755,.15,.095),(-.79,1.71,.111,.091),(-.86,1.65,.058,.055),(-.879,1.595,.005,.005)],beakmat),'Head'))
objects.append((bill('Lower beak',[(-.575,1.65,.092,.048),(-.685,1.65,.110,.04),(-.78,1.637,.069,.025),(-.815,1.63,.005,.005)],beakmat),'Beak'))
objects.append((sphere('Dark mouth interior',(0,-.69,1.673),(.102,.094,.015),mouth),'Head'))
for side in [-1,1]:
 objects.append((sphere('Nostril',(side*.102,-.695,1.798),(.012,.008,.010),mouth),'Head'))
 objects.append((sphere('Warm eye rim',(side*.169,-.585,1.85),(.016,.040,.043),iris),'Head'))
 objects.append((sphere('Bright dark eye',(side*.183,-.597,1.856),(.005,.027,.030),eye),'Head'))
 objects.append((sphere('Eye catchlight',(side*.187,-.613,1.876),(.003,.006,.007),shine),'Head'))
# Rounded separate vanes overlap like real folded wings, joined by wing per side.
for side in [-1,1]:
 parts=[]
 for i in range(6):parts.append(leaf('Long folded primary',(side*.333,-.12+i*.045,1.23-i*.025),(side*.474,.24+i*.05,1.09-i*.035),(side*(.37+.012*i),.53+i*.041,.86-i*.042),.060,(side,0,.2),feather if i%2 else tips))
 for i in range(5):parts.append(leaf('Short wing cover',(side*.34,-.16+i*.07,1.31-i*.02),(side*.46,.075+i*.078,1.24-i*.025),(side*.425,.30+i*.078,1.065-i*.027),.078,(side,0,.2),tips if i%2 else feather))
 wing=join(parts,'Layered folded wing '+str(side));objects.append((wing,'wing_'+str(side)))
parts=[]
for i in range(-4,5):parts.append(leaf('Swept tail vane',(i*.022,.345,1.15),(i*.065,.76,1.44),(i*.087,1.16-abs(i)*.05,1.57-abs(i)*.088),.085,(math.cos(i*.16),0,math.sin(i*.16)),tips if i%2 else feather))
objects.append((join(parts,'Long fan tail'),'tail'))
parts=[]
for i in range(7):
 x=(i-3)*.026;control_y=-.30+i*.045 if i<2 else -.22+i*.040;control_z=2.41-i*.025 if i<2 else 2.29-i*.025;tip_y=-.09+i*.080 if i<2 else .075+i*.056;tip_z=2.30-i*.030 if i<2 else 2.25-i*.057;parts.append(leaf('Crest plume',(x,-.42+abs(i-3)*.015,1.995),(x*1.9,control_y,control_z),(x*2.1,tip_y,tip_z),.060,(math.cos((i-3)*.20),-.20,math.sin((i-3)*.20)),tips if i%2 else feather))
objects.append((join(parts,'Swept crest'),'Crest'))
# Raise facial parts and plume together to match the longer neck.
for o,label in objects:
 if label in ['Head','Beak','Crest']:
  for v in o.data.vertices:v.co.z+=.16
# A shank and all three toes form one continuous mesh. Claws are horn tips.
feet=[];claws=[]
for side in [-1,1]:
 tag='L' if side<0 else 'R';parts=[tube('Curved shank',[(side*.19,.09,.64),(side*.188,.045,.40),(side*.18,-.026,.125)],.041,legmat),sphere('Ankle',(side*.18,-.032,.10),(.046,.066,.052),legmat)]
 for toe in range(3):
  dx=(toe-1)*.103;end=(side*.18+dx,-.344+abs(toe-1)*.05,.063)
  parts.append(tube('Forward toe',[(side*.18,-.03,.094),(side*.18+dx*.52,-.18,.067),end],.025,legmat))
  claw=tube('Horn claw '+tag+' '+str(toe),[end,(end[0]+dx*.12,end[1]-.048,.056),(end[0]+dx*.16,end[1]-.082,.041)],.017,clawmat)
  # Taper the tip in local front direction, keeping the base tucked into the toe.
  for v in claw.data.vertices:
   u=max(0,min(1,(end[1]-v.co.y)/.082));center=Vector((end[0]+dx*.16*u,v.co.y,.063-.022*u));v.co=center+(v.co-center)*(1-.94*u)
  objects.append((claw,'Toe_'+tag+'_'+str(toe)));claws.append(claw)
 foot=sculpt(parts,'Continuous shank and three toes '+tag,4000);objects.append((foot,'foot_'+tag));feet.append(foot)
 # Sparse raised scale ridges on the front of the long bare shank.
 scales=[]
 for k in range(7):
  z=.18+k*.056;y=-.026+(z-.125)/(.64-.125)*.116
  scales.append(tube('Shank scale',[(side*.18-.034,y-.019,z),(side*.18,y-.043,z+.009),(side*.18+.034,y-.019,z)],.004,legmat))
 objects.append((join(scales,'Shank scales '+tag),'Shin_'+tag))
# Fitted blanket, seat and raised front/back follow the actual pear-shaped back.
def back_z(x,y):return 1.025+.46*math.sqrt(max(.04,1-(x/.365)**2-((y-.05)/.515)**2))
def saddle_surface(name,width,y0,y1,lift,mat,raised=False):
 verts=[];faces=[];n=20;m=20
 for j in range(m+1):
  v=j/m;y=y0+(y1-y0)*v
  for i in range(n+1):
   x=(i/n*2-1)*width;z=back_z(x,y)+lift+(.075*(2*v-1)**4 if raised else 0);verts.append((x,y,z))
 for j in range(m):
  for i in range(n):k=j*(n+1)+i;faces.append((k,k+1,k+n+2,k+n+1))
 o=mesh(name,verts,faces,mat);sub=o.modifiers.new('Supple saddle curve','SUBSURF');sub.levels=1;apply(o,sub);solid=o.modifiers.new('Real padding','SOLIDIFY');solid.thickness=.032 if raised else .027;apply(o,solid);return o
objects.append((saddle_surface('Fitted saddle blanket',.266,-.015,.43,.017,padmat),'Spine'))
objects.append((saddle_surface('Curved leather riding seat',.205,.035,.37,.047,leather,True),'Spine'))
# Flat belly girth, projected onto the body instead of hovering as an ellipse.
bodytree=BVHTree.FromPolygons([v.co for v in body.data.vertices],[tuple(f.vertices) for f in body.data.polygons]);verts=[];faces=[];n=64
for i in range(n):
 t=i*math.tau/n;x=.37*math.cos(t);z=1.025+.48*math.sin(t)
 for y in [.152,.203]:
  p,normal,face,d=bodytree.find_nearest(Vector((x,y,z)));verts.append(p+normal*.009)
for i in range(n):faces.append((i*2,((i+1)%n)*2,((i+1)%n)*2+1,i*2+1))
girth=mesh('Flat fitted belly girth',verts,faces,leather);solid=girth.modifiers.new('Leather thickness','SOLIDIFY');solid.thickness=.006;apply(girth,solid);objects.append((girth,'Spine'))
for side in [-1,1]:
 strap=tube('Stirrup hanger',[(side*.249,.14,1.39),(side*.40,.15,1.12),(side*.437,.15,.87)],.014,leather);objects.append((strap,'Spine'))
 stirrup=tube('Simple stirrup',[(side*.437,.15,.885),(side*.481,.15,.745),(side*.386,.15,.745),(side*.437,.15,.885)],.011,metal);objects.append((stirrup,'Spine'))
# Skeleton with avian leg chain, toe roll, wing tips and secondary tail/crest.
a=bpy.data.armatures.new('Chocobo skeleton');rig=bpy.data.objects.new('ChocoboRig',a);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bones={}
def bone(name,h,t,parent=None):
 b=a.edit_bones.new(name);b.head=h;b.tail=t
 if parent:b.parent=bones[parent]
 bones[name]=b
bone('Root',(0,0,0),(0,0,.2));bone('Spine',(0,.07,.78),(0,-.10,1.30),'Root');bone('Neck',(0,-.19,1.29),(0,-.34,1.83),'Spine');bone('Head',(0,-.37,1.82),(0,-.45,2.12),'Neck');bone('Beak',(0,-.575,1.81),(0,-.77,1.805),'Head');bone('Crest',(0,-.39,2.15),(0,.12,2.32),'Head');bone('Tail',(0,.33,1.15),(0,.82,1.40),'Spine');bone('TailTip',(0,.82,1.40),(0,1.13,1.52),'Tail')
for side in [-1,1]:
 tag='L' if side<0 else 'R';bone('Thigh_'+tag,(side*.19,0,.87),(side*.19,.095,.59),'Root');bone('Shin_'+tag,(side*.19,.095,.59),(side*.18,-.026,.11),'Thigh_'+tag);bone('Foot_'+tag,(side*.18,-.026,.11),(side*.18,-.20,.066),'Shin_'+tag)
 for toe in range(3):dx=(toe-1)*.103;bone('Toe_'+tag+'_'+str(toe),(side*.18,-.10,.075),(side*.18+dx,-.35+abs(toe-1)*.05,.06),'Foot_'+tag)
 bone('Wing_'+tag,(side*.30,-.04,1.22),(side*.445,.31,1.04),'Spine');bone('WingTip_'+tag,(side*.445,.31,1.04),(side*.40,.63,.82),'Wing_'+tag)
bpy.ops.object.mode_set(mode='OBJECT')
def smooth(lo,hi,x):u=max(0,min(1,(x-lo)/(hi-lo)));return u*u*(3-2*u)
def bind(o,label):
 if label=='body':
  active={'Spine','Neck','Head','Thigh_L','Thigh_R'}
  for b in a.bones:b.use_deform=b.name in active
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.parent_set(type='ARMATURE_AUTO')
  for b in a.bones:b.use_deform=True
  samples=[]
  for v in o.data.vertices:
   w={o.vertex_groups[g.group].name:g.weight for g in v.groups if g.weight>1e-6};assert w,('unbound body',v.index);samples.append(w)
  for g in o.vertex_groups:g.remove(range(len(o.data.vertices)))
 else:samples=[]
 for i,v in enumerate(o.data.vertices):
  x,y,z=v.co;side='L' if x<0 else 'R'
  if label=='body':w=samples[i]
  elif label.startswith('foot_'):
   tag=label[-1];u=smooth(.13,.24,z);w={'Shin_'+tag:u,'Foot_'+tag:1-u}
  elif label.startswith('wing_'):tag='L' if label.endswith('-1') else 'R';u=smooth(.17,.60,y);w={'Wing_'+tag:1-u,'WingTip_'+tag:u}
  elif label=='tail':u=smooth(.65,1.10,y);w={'Tail':1-u,'TailTip':u}
  else:w={label:1}
  w=dict(sorted(w.items(),key=lambda item:item[1],reverse=True)[:4]);total=sum(w.values())
  for name,value in w.items():
   g=o.vertex_groups.get(name) or o.vertex_groups.new(name=name)
   if value>1e-6:g.add([i],value/total,'REPLACE')
 if label!='body':m=o.modifiers.new('Chocobo skin','ARMATURE');m.object=rig;o.parent=rig
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
 if o.data.materials[0]==plumage:
  for li,uv in enumerate(o.data.uv_layers.active.data):
   p=o.data.vertices[o.data.loops[li].vertex_index].co;uv.uv=((math.atan2(p.y-.02,p.x)/math.tau+.5)*4,(p.z-.40)/1.86*4)
 o.select_set(False)
for o,label in objects:bind(o,label)
rig.scale=(.88,)*3
for b in rig.pose.bones:b.rotation_mode='QUATERNION'
rest={b.name:b.matrix_local.to_quaternion() for b in a.bones}
def rotate(name,xyz):q=Euler(xyz,'XYZ').to_quaternion();rig.pose.bones[name].rotation_quaternion=rest[name].inverted()@q@rest[name]
def reset():
 for b in rig.pose.bones:b.location=(0,0,0);b.scale=(1,1,1);b.rotation_quaternion=(1,0,0,0)
def min_ground():
 low=999
 for o in feet+claws:
  ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in me.vertices));ev.to_mesh_clear()
 return low
def pose(kind,t):
 reset();p=rig.pose.bones;phase=t*math.tau/(.95 if kind=='Walk' else 4);rotate('Spine',(math.sin(phase)*.015,0,math.sin(phase)*.012));rotate('Neck',(math.sin(phase)*.018,0,0));rotate('Head',(0,0,math.sin(phase)*.065));rotate('Crest',(.02*math.sin(phase),.03*math.sin(phase),0));rotate('Tail',(math.sin(phase)*.035,0,0));rotate('TailTip',(math.sin(phase+.4)*.05,0,0))
 for side in [-1,1]:rotate('Wing_'+('L' if side<0 else 'R'),(0,side*math.sin(phase)*.035,0))
 if kind=='Walk':
  for side in [-1,1]:
   tag='L' if side<0 else 'R';s=math.sin(phase+(math.pi if side<0 else 0));rotate('Thigh_'+tag,(s*.27,0,0));rotate('Shin_'+tag,(max(0,-s)*-.18,0,0));rotate('Foot_'+tag,(-s*.12,0,0))
  p['Root'].location.y=.025*abs(math.sin(phase));rotate('Head',(0,0,math.sin(phase)*.028))
 elif kind=='Chirp':
  u=min(1,t/.6,max(0,(3-t)/.6));rotate('Neck',(-.10*u,0,0));rotate('Head',(-.08*u,0,.045*math.sin(t*6)*u));rotate('Beak',(.24*max(0,math.sin(t*6))*u,0,0));rotate('Crest',(-.065*u,0,0))
 elif kind=='Flap':
  u=min(1,t/.7,max(0,(4-t)/.7))
  for side in [-1,1]:tag='L' if side<0 else 'R';rotate('Wing_'+tag,(0,-side*u*(.48+.12*math.sin(t*6)),0));rotate('WingTip_'+tag,(0,-side*u*.17,0))
  rotate('Neck',(-.045*u,0,0))
 bpy.context.view_layer.update();low=min_ground()
 p['Root'].location.y+=(.003-low)/.88
 bpy.context.view_layer.update();return min_ground()
rig.animation_data_create();actions=[];contacts={}
for name,duration in [('Idle',4),('Walk',.95),('Chirp',3),('Flap',4)]:
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;frames=round(duration*24)+1;ground=[]
 for frame in range(1,frames+1):
  scene.frame_set(frame);ground.append(pose(name,(frame-1)/(frames-1)*duration))
  for b in rig.pose.bones:b.keyframe_insert(data_path='rotation_quaternion',frame=frame);b.keyframe_insert(data_path='location',frame=frame);b.keyframe_insert(data_path='scale',frame=frame)
 actions.append(action);contacts[name]={'frames':frames,'minimumToeZ':min(ground),'maximumLowestToeZ':max(ground)}
rig.animation_data.action=actions[0];scene.frame_set(1);pose('Idle',0)
for o,label in objects:
 for v in o.data.vertices:assert abs(sum(g.weight for g in v.groups)-1)<.002,(o.name,v.index)
for c in contacts.values():assert c['minimumToeZ']>-.001,c
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o,label in objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(OUT/'chocobo-v1.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_merge_animation='ACTION',export_skins=True,export_def_bones=True,export_force_sampling=True,export_optimize_animation_size=True,export_yup=True);AUTHORING=ROOT/'authoring/characters/chocobo';AUTHORING.mkdir(parents=True,exist_ok=True);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(AUTHORING/'chocobo-v1.blend'))
report={'joints':len(a.bones),'meshes':len(objects),'actions':[a.name for a in actions],'allWeightsNormalized':True,'groundSamples':contacts,'scale':.88,'newImageCalls':2,'server4090Tasks':0,'training':'none','bodyBinding':'Blender heat weights on continuous sculpt','featherGeometry':'11 overlapping vanes per wing, nine tail vanes, seven crest vanes','toesPerFoot':3,'saddle':'back-curved blanket and seat with surface-projected girth'}
(EVID/'build-report.json').write_text(json.dumps(report,indent=2));print('CHOCOBO_BUILD',json.dumps(report))
