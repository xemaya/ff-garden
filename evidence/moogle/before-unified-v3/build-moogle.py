"""Build a small reusable skinned Moogle courier and four baked glTF clips.
No remote model services, no official game assets; reproducible Blender source.
"""
import bpy, math, json, random
from pathlib import Path
from mathutils import Vector, Euler
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/characters/moogle'
EVID=ROOT/'evidence/moogle'
OUT.mkdir(parents=True,exist_ok=True);EVID.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=24
random.seed(71)

def material(name,color,rough=.85,texture=None):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
    if texture:
        n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(OUT/texture));m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])
    return m
fur=material('Ivory short fur',(.82,.77,.65),.97,'fur.png')
leather=material('Worn courier leather',(.34,.18,.08),.88,'leather.png')
pink=material('Ear and nose peach',(.64,.29,.22),.75)
eye=material('Warm dark eyes',(.022,.016,.013),.24)
shine=material('Eye catchlight',(.85,.80,.67),.2)
wing_mat=material('Muted plum membrane',(.23,.10,.21),.83)
rib_mat=material('Wing edges',(.16,.07,.145),.8)
red=material('Wool pompom',(.55,.042,.035),.97)
wire=material('Antenna',(.065,.040,.022),.86)
gold=material('Old brass buckle',(.38,.26,.11),.55)
paper=material('Cream folded letter',(.80,.73,.55),.9)
seal=material('Clay wax seal',(.38,.105,.071),.86)
objects=[]

def sphere(name,loc,scale,mat,segments=32,rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(mat)
    for f in o.data.polygons:f.use_smooth=True
    return o

def box(name,loc,scale,mat,bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(mat)
    if bevel:
        m=o.modifiers.new('Soft crafted edges','BEVEL');m.width=bevel;m.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
    for f in o.data.polygons:f.use_smooth=True
    return o

def tube(name,points,r,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,v in zip(s.bezier_points,points):p.co=v;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.data.materials.append(mat)
    for f in o.data.polygons:f.use_smooth=True
    return o

def mesh(name,verts,faces,mat):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);d.materials.append(mat)
    for f in d.polygons:f.use_smooth=True
    return o

# Smooth head without overlapping cheek lobes. Arms have their own continuous
# topology; a hidden rounded shoulder socket avoids stretching torso polygons.
def sculpt(parts,name,limit=18000):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    rem=o.modifiers.new('Unified sculpt','REMESH');rem.mode='VOXEL';rem.voxel_size=.008;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=o.modifiers.new('Sculpt smoothing','SMOOTH');sm.factor=.65;sm.iterations=4;bpy.ops.object.modifier_apply(modifier=sm.name)
    sub=o.modifiers.new('Soft silhouette','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
    if len(o.data.polygons)>limit:
        dec=o.modifiers.new('Game mesh','DECIMATE');dec.ratio=limit/len(o.data.polygons);bpy.ops.object.modifier_apply(modifier=dec.name)
    for f in o.data.polygons:f.use_smooth=True
    return o
parts=[sphere('Pear torso',(0,0,.37),(.175,.135,.27),fur),sphere('Rounded head',(0,-.015,.80),(.265,.22,.225),fur)]
for side in [-1,1]:
    parts += [sphere('Leg',(side*.085,0,.155),(.071,.070,.11),fur),sphere('Foot',(side*.105,-.064,.057),(.080,.112,.058),fur)]
body=sculpt(parts,'Continuous head and torso');objects.append((body,'organic'))
arm_meshes=[]
for side in [-1,1]:
    tag='L' if side<0 else 'R'
    pieces=[sphere('Shoulder',(side*.180,-.012,.486),(.051,.050,.071),fur),sphere('Tapered arm',(side*.229,-.029,.400),(.046,.047,.103),fur),sphere('Small paw',(side*.257,-.05,.304),(.047,.050,.049),fur)]
    limb=sculpt(pieces,'Continuous arm '+tag,3000);objects.append((limb,'arm_'+tag));arm_meshes.append(limb)

# Rounded pointed ears, with an inset peach surface and separate ear bones.
for side in [-1,1]:
    xs=[side*.14,side*.27,side*.315,side*.21];zs=[.92,1.195,1.20,.94]
    verts=[]
    for y in [-.070,.018]:
        verts.extend([(x,y,z) for x,z in zip(xs,zs)])
        verts.append((side*.227,y-(.020 if y<0 else 0),1.055))
    faces=[]
    for k in range(4):faces.append((k,(k+1)%4,4));faces.append((5+k,9,5+(k+1)%4));faces.append((k,5+k,5+(k+1)%4,(k+1)%4))
    o=mesh('Ear '+str(side),verts,faces,fur);bev=o.modifiers.new('Ear rim','BEVEL');bev.width=.015;bev.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bev.name);objects.append((o,'ear_'+str(side)))
    o=mesh('Ear inner '+str(side),[(side*.179,-.089,.963),(side*.278,-.079,1.163),(side*.274,-.081,1.15),(side*.224,-.103,.984)],[(0,1,2,3)],pink);solid=o.modifiers.new('Inset thickness','SOLIDIFY');solid.thickness=.006;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=solid.name);objects.append((o,'ear_'+str(side)))
    o=sphere('Eye '+str(side),(side*.107,-.214,.795),(.044,.022,.055),eye);objects.append((o,'eye_'+str(side)))
    o=sphere('Eye light '+str(side),(side*.097,-.233,.817),(.010,.006,.010),shine,16,10);objects.append((o,'eye_'+str(side)))
objects.append((sphere('Peach nose',(0,-.243,.734),(.049,.039,.037),pink),'Head'))


# Curved, thick bat membranes and fine ribs, weighted separately from the body.
for side in [-1,1]:
    segments=[((0,0),(.02,.13),(.11,.17)),((.11,.17),(.17,.195),(.24,.14)),((.24,.14),(.38,.105),(.46,-.065)),((.46,-.065),(.35,.04),(.28,-.105)),((.28,-.105),(.165,.04),(.075,-.12)),((.075,-.12),(.025,-.02),(0,-.075)),((0,-.075),(0,-.035),(0,0))]
    contour=[]
    for a,c,b in segments:
        for j in range(5):
            t=j/5;contour.append(((1-t)**2*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)**2*a[1]+2*(1-t)*t*c[1]+t*t*b[1]))
    verts=[]
    for layer in [0,1]:
        for u,z in contour:verts.append((side*(.14+u),.095+layer*.012+math.sin(u*4)*.018,.62+z))
    n=len(contour);faces=[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]
    for i in range(n):faces.append((i,n+i,n+(i+1)%n,(i+1)%n))
    o=mesh('Bat membrane '+str(side),verts,faces,wing_mat);objects.append((o,'wing_'+str(side)))
    for i,end in enumerate([(.11,.17),(.24,.14),(.46,-.065),(.28,-.105),(.075,-.12)]):
        u,z=end;o=tube('Wing rib '+str(side)+' '+str(i),[(side*.14,.083,.62),(side*(.14+u*.55),.088,.68+z*.48),(side*(.14+u),.090,.62+z)],.0048,rib_mat);objects.append((o,'wing_'+str(side)))

# Antenna secondary motion is skeletal, so it survives GLB export and cloning.
objects.append((tube('Curved antenna',[(.005,.026,.995),(.046,.035,1.11),(.045,.036,1.27),(-.035,.034,1.32)],.009,wire),'Antenna'))
objects.append((sphere('Red wool pompom',(-.061,.034,1.332),(.104,.104,.104),red),'Pom'))

bag=box('Leather satchel',(.215,.175,.325),(.19,.09,.20),leather,.035);objects.append((bag,'Bag'))
objects.append((box('Rounded flap',(.215,.120,.373),(.177,.025,.125),leather,.025),'Bag'))
objects.append((sphere('Brass clasp',(.215,.102,.328),(.019,.008,.019),gold,16,10),'Bag'))
# Strap follows the chest and shoulder without using wood texture.
strap_pts=[(-.104,-.100,.545),(-.038,-.143,.477),(.076,-.153,.39),(.204,.113,.338)]
objects.append((tube('Shoulder strap',strap_pts,.014,leather),'Spine'))
objects.append((box('Strap buckle',(-.037,-.156,.477),(.047,.010,.046),gold,.006),'Spine'))
objects.append((box('Stored envelope',(.216,.168,.448),(.125,.012,.087),paper,.002),'Bag'))
for off in [-.079,.079]:objects.append((tube('Bag stitch '+str(off),[(.215+off,.103,.392),(.215+off,.094,.346),(.215+off*.75,.096,.304)],.002,shine),'Bag'))
letter=box('Delivery envelope',(.36,-.12,.340),(.20,.008,.13),paper,.003);objects.append((letter,'Letter'))
objects.append((sphere('Wax stamp',(.397,-.126,.340),(.013,.004,.013),seal,16,10),'Letter'))
objects.append((tube('Envelope fold',[(.262,-.127,.401),(.36,-.129,.327),(.458,-.127,.401)],.0017,leather),'Letter'))

# One armature shared by all parts, with real glTF JOINTS/WEIGHTS attributes.
arm=bpy.data.armatures.new('Courier skeleton');rig=bpy.data.objects.new('MoogleCourierRig',arm);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bones={}
def bone(name,head,tail,parent=None):
    b=arm.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=bones[parent]
    bones[name]=b
bone('Root',(0,0,0),(0,0,.14));bone('Spine',(0,0,.15),(0,0,.60),'Root');bone('Head',(0,0,.58),(0,0,.93),'Spine')
for side in [-1,1]:
    tag='L' if side<0 else 'R';bone('UpperArm_'+tag,(side*.155,-.005,.50),(side*.23,-.025,.395),'Spine');bone('Forearm_'+tag,(side*.23,-.025,.395),(side*.257,-.05,.30),'UpperArm_'+tag);bone('Paw_'+tag,(side*.257,-.05,.30),(side*.267,-.105,.30),'Forearm_'+tag)
    bone('Thigh_'+tag,(side*.08,0,.20),(side*.09,-.006,.115),'Root');bone('Shin_'+tag,(side*.09,-.006,.115),(side*.105,-.04,.061),'Thigh_'+tag);bone('Foot_'+tag,(side*.105,-.04,.061),(side*.105,-.13,.049),'Shin_'+tag)
    bone('Ear_'+tag,(side*.18,0,.96),(side*.278,0,1.18),'Head');bone('Eye_'+tag,(side*.107,-.214,.795),(side*.107,-.214,.845),'Head')
    bone('Wing_'+tag,(side*.14,.095,.62),(side*.34,.105,.72),'Spine');bone('WingTip_'+tag,(side*.34,.105,.72),(side*.60,.095,.555),'Wing_'+tag)
bone('Antenna',(.005,.026,.995),(.045,.036,1.23),'Head');bone('Pom',(.045,.036,1.23),(-.061,.034,1.332),'Antenna');bone('Bag',(.19,.194,.40),(.23,.174,.24),'Spine');bone('Letter',(.264,-.12,.313),(.264,-.12,.363),'Paw_R')
bpy.ops.object.mode_set(mode='OBJECT')

def add_weights(o,label):
    groups={name:o.vertex_groups.new(name=name) for name in arm.bones.keys()}
    for v in o.data.vertices:
        x,y,z=v.co;side='L' if x<0 else 'R';weights={}
        if label=='organic':
            if z>.635:weights={'Head':1}
            elif z>.555:
                u=(z-.555)/.08;weights={'Head':u,'Spine':1-u}
            elif z<.21:
                if z<.090:weights={'Foot_'+side:1}
                else:
                    u=max(0,min(1,(z-.095)/.10));weights={'Thigh_'+side:u,'Shin_'+side:1-u}
            else:weights={'Spine':1}
        elif label.startswith('arm_'):
            side=label[-1]
            # Smooth blends only around elbow and wrist; torso never inherits
            # an arm rotation and the head never shares these vertices.
            def smooth(a,b,v):
                u=max(0,min(1,(v-a)/(b-a)));return u*u*(3-2*u)
            fore=1-smooth(.375,.430,z);paw=1-smooth(.307,.350,z)
            weights={'UpperArm_'+side:1-fore,'Forearm_'+side:fore*(1-paw),'Paw_'+side:fore*paw}
        elif label.startswith('ear_'):weights={'Ear_'+('L' if label.endswith('-1') else 'R'):1}
        elif label.startswith('eye_'):weights={'Eye_'+('L' if label.endswith('-1') else 'R'):1}
        elif label.startswith('wing_'):
            tip=max(0,min(1,(abs(x)-.30)/.23));weights={'Wing_'+side:1-tip,'WingTip_'+side:tip}
        else:weights={label:1}
        for name,w in weights.items():
            if w>.00001:groups[name].add([v.index],w,'REPLACE')
    mod=o.modifiers.new('Courier skin','ARMATURE');mod.object=rig;o.parent=rig
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    if not o.data.uv_layers:
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
    o.select_set(False)
for o,label in objects:add_weights(o,label)
# Uniform scale makes the full creature including antenna comfortably small.
rig.scale=(.85,.85,.85)

for b in rig.pose.bones:b.rotation_mode='QUATERNION'
rest={b.name:b.matrix_local.to_quaternion() for b in arm.bones}
def rotation(name,angles):
    q=Euler(angles,'XYZ').to_quaternion();rig.pose.bones[name].rotation_quaternion=rest[name].inverted()@q@rest[name]
def reset_pose():
    for b in rig.pose.bones:b.location=(0,0,0);b.rotation_quaternion=(1,0,0,0);b.scale=(1,1,1)

def pose(kind,t):
    reset_pose();p=rig.pose.bones;loop_t=t*(4.0/.8) if kind=='Walk' else t;base=loop_t*math.tau/4
    rotation('Spine',(math.sin(base)*.025,0,math.sin(base)*.02));rotation('Head',(math.sin(base)*.02,math.sin(base)*.07,math.sin(base)*.11))
    for side in [-1,1]:
        tag='L' if side<0 else 'R';rotation('Ear_'+tag,(0,side*math.sin(base*2+side)*.035,side*math.sin(base*2)*.035));rotation('Wing_'+tag,(side*math.sin(base*2)*.05,0,side*math.sin(base*2)*.07));rotation('WingTip_'+tag,(0,0,side*math.sin(base*2+.7)*.08))
    rotation('Antenna',(math.sin(base)*.045,math.sin(base)*.035,0));rotation('Pom',(math.sin(base*2+.5)*.07,math.sin(base+.4)*.055,0));rotation('Bag',(math.sin(base*2)*.018,0,0))
    blink=1.0
    if 1.85<t%4<2.10:blink=max(.08,abs((t%4)-1.975)/.125)
    for side in ['L','R']:p['Eye_'+side].scale=(1,blink,1)
    p['Letter'].scale=(.001,.001,.001)
    if kind=='Walk':
        phase=t*math.tau/.8
        for side in [-1,1]:
            tag='L' if side<0 else 'R';s=math.sin(phase+(math.pi if side<0 else 0));rotation('Thigh_'+tag,(s*.48,0,0));rotation('Shin_'+tag,(max(0,-s)*-.32,0,0));rotation('Foot_'+tag,(-s*.11,0,0));rotation('UpperArm_'+tag,(-s*.22,0,side*.035))
        p['Root'].location.y=.016*abs(math.sin(phase));rotation('Head',(0,0,math.sin(phase)*.026));rotation('Bag',(math.sin(phase)*.09,0,0))
    elif kind=='Wave':
        blend=min(1,t/.45,max(0,(3.0-t)/.45));rotation('UpperArm_R',(-2.45*blend,.30*blend,0));rotation('Forearm_R',(-.30*blend,0,.08*math.sin(t*8)*blend));rotation('Paw_R',(0,.2*math.sin(t*8)*blend,0));rotation('Head',(0,.08*blend,-.12*blend))
    elif kind=='Deliver':
        u=min(1,t/.8,max(0,(3.5-t)/.7));rotation('UpperArm_R',(-1.40*u,-.30*u,0));rotation('Forearm_R',(-.26*u,0,0));rotation('Paw_R',(.1*u,0,0));rotation('Head',(.12*u,0,0));rotation('Spine',(.08*u,0,0));rotation('Letter',(1.57*u,.30*u,0));p['Letter'].scale=(1,1,1) if .18<t<2.25 else (.001,.001,.001)
    # Lift the root just enough to keep the lowest foot surface on the floor.
    bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();evaluated=body.evaluated_get(deps);me=evaluated.to_mesh();minimum=min((evaluated.matrix_world@v.co).z for v in me.vertices);evaluated.to_mesh_clear()
    if minimum<.003:p['Root'].location.y+=(.003-minimum)/.85
    bpy.context.view_layer.update();evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=evaluated.to_mesh();after=min((evaluated.matrix_world@v.co).z for v in me.vertices);evaluated.to_mesh_clear();return after

def evaluated_bvh(o,head_only=False):
    ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh()
    verts=[ev.matrix_world@v.co for v in me.vertices]
    faces=[tuple(f.vertices) for f in me.polygons if not head_only or all(body.data.vertices[i].co.z>.590 for i in f.vertices)]
    tree=BVHTree.FromPolygons(verts,faces,all_triangles=False);ev.to_mesh_clear();return tree

def intersections():
    head=evaluated_bvh(body,True)
    bags=[evaluated_bvh(o) for o,label in objects if label=='Bag']
    arms=[evaluated_bvh(o) for o in arm_meshes]
    return {'armHeadSurfacePairs':sum(len(a.overlap(head)) for a in arms),
            'armBagSurfacePairs':sum(len(a.overlap(b)) for a in arms for b in bags),
            'letterHeadSurfacePairs':sum(len(evaluated_bvh(o).overlap(head)) for o,label in objects if label=='Letter') if rig.pose.bones['Letter'].scale.x>.1 else 0}

rig.animation_data_create();actions=[];contacts={};clearance={}

for name,duration in [('Idle',4.0),('Walk',.8),('Wave',3.0),('Deliver',3.5)]:
    action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
    frames=round(duration*24)+1;foot_samples=[];collision_samples=[]
    for frame in range(1,frames+1):
        scene.frame_set(frame);foot_samples.append(pose(name,(frame-1)/(frames-1)*duration));collision_samples.append(intersections())
        for b in rig.pose.bones:b.keyframe_insert(data_path='rotation_quaternion',frame=frame);b.keyframe_insert(data_path='location',frame=frame);b.keyframe_insert(data_path='scale',frame=frame)
    action['clip_seconds']=duration;actions.append(action);contacts[name]={'minimumBodyZ':min(foot_samples),'maximumBodyZ':max(foot_samples)}
    clearance[name]={'frames':frames,**{k:max(c[k] for c in collision_samples) for k in collision_samples[0]}}
rig.animation_data.action=actions[0];scene.frame_set(1);pose('Idle',0)

# Fail the rebuild before replacing the runtime GLB if the checked parts cross.
for clip,c in clearance.items():
    assert all(value==0 for key,value in c.items() if key!='frames'),(clip,c)

# Validate every vertex has normalized bone weights before exporting.
for o,label in objects:
    for v in o.data.vertices:
        total=sum(g.weight for g in v.groups);assert abs(total-1)<.002,(o.name,v.index,total)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o,label in objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'moogle-courier-v2.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_merge_animation='ACTION',export_skins=True,export_def_bones=True,export_force_sampling=True,export_optimize_animation_size=True,export_materials='EXPORT',export_yup=True)
import struct
blob=(OUT/'moogle-courier-v2.glb').read_bytes();json_len=struct.unpack_from('<I',blob,12)[0];document=json.loads(blob[20:20+json_len]);binary=blob[20+json_len+8:]
fur_tex=next(m for m in document['materials'] if m['name']=='Ivory short fur')['pbrMetallicRoughness']['baseColorTexture']
red_pbr=next(m for m in document['materials'] if m['name']=='Wool pompom')['pbrMetallicRoughness'];red_pbr['baseColorTexture']=fur_tex;red_pbr['baseColorFactor']=[.55,.042,.035,1]
js=json.dumps(document,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
rebuilt=struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\x00')+binary
(OUT/'moogle-courier-v2.glb').write_bytes(rebuilt)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'moogle-courier-v2.blend'))
report={'boneCount':len(arm.bones),'meshCount':len(objects),'bodyVertices':len(body.data.vertices),'polygons':sum(len(o.data.polygons) for o,label in objects),'actions':[a.name for a in actions],'allWeightsNormalized':True,'sampledGroundContacts':contacts,'sampledSurfaceIntersections':clearance,'revision':'v2 slim silhouette and isolated arm weights','scale':.85,'source':'authored Blender sculpt/rig with generated material references','training':'none'}
(EVID/'build-report.json').write_text(json.dumps(report,indent=2));print('MOOGLE_BUILD',json.dumps(report))
