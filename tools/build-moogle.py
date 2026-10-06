"""Build a small reusable skinned Moogle courier and four baked glTF clips.
No remote model services, no official game assets; reproducible Blender source.
"""
import bpy, bmesh, math, json, random
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
stitch=material('Muted linen stitching',(.39,.25,.14),.94)
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
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
    if name.startswith(('Soft leaf ear','Tapered continuous arm','Soft courier pouch','Flat fitted shoulder belt')):
        bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);d.materials.append(mat)
    for f in d.polygons:f.use_smooth=True
    return o

# One welded sculpt includes head, torso, limbs and outer ears.
# Bone heat weights blend across the axilla and hip rather than separate caps.
def sculpt(parts,name,limit=18000):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    rem=o.modifiers.new('Unified sculpt','REMESH');rem.mode='VOXEL';rem.voxel_size=.008;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=o.modifiers.new('Sculpt smoothing','SMOOTH');sm.factor=.65;sm.iterations=6;bpy.ops.object.modifier_apply(modifier=sm.name)
    sub=o.modifiers.new('Soft silhouette','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
    if len(o.data.polygons)>limit:
        dec=o.modifiers.new('Game mesh','DECIMATE');dec.ratio=limit/len(o.data.polygons);bpy.ops.object.modifier_apply(modifier=dec.name)
    bm=bmesh.new();bm.from_mesh(o.data);remaining=set(bm.verts);islands=[]
    while remaining:
        pending=[remaining.pop()];island=set(pending)
        while pending:
            v=pending.pop()
            for e in v.link_edges:
                other=e.other_vert(v)
                if other in remaining:remaining.remove(other);island.add(other);pending.append(other)
        islands.append(island)
    islands.sort(key=len,reverse=True)
    # Only discard tiny voxel/decimation fragments; never an ear or a limb.
    for island in islands[1:]:
        assert len(island)<=12,('unexpected detached sculpt part',len(island))
        bmesh.ops.delete(bm,geom=list(island),context='VERTS')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    for f in o.data.polygons:f.use_smooth=True
    return o
def smooth(a,b,v):
    u=max(0,min(1,(v-a)/(b-a)));return u*u*(3-2*u)

# A thick curved leaf, with a broad root and a single softened pointed tip.
# Outer ears join the head in the same remesh; the pink inset follows the bowl.
def ear_leaf(side):
    profile=[(.945,.145,.032,.023),(.979,.163,.061,.033),(1.023,.195,.071,.032),(1.071,.229,.056,.026),(1.115,.252,.031,.018),(1.147,.264,.010,.007)]
    verts=[];faces=[];n=32
    for z,x,w,d in profile:
        for j in range(n):
            t=j*math.tau/n;verts.append((side*(x+w*math.cos(t)),-.035+d*math.sin(t),z))
    for r in range(len(profile)-1):
        for j in range(n):faces.append((r*n+j,r*n+(j+1)%n,(r+1)*n+(j+1)%n,(r+1)*n+j))
    bottom=len(verts);verts.append((side*.145,-.035,.931));top=len(verts);verts.append((side*.271,-.034,1.162))
    for j in range(n):faces.extend([(bottom,(j+1)%n,j),(top,(len(profile)-1)*n+j,(len(profile)-1)*n+(j+1)%n)])
    o=mesh('Soft leaf ear '+str(side),verts,faces,fur)
    sub=o.modifiers.new('Curved ear','SUBSURF');sub.levels=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sub.name)
    return o

def continuous_arm(side):
    # One tapered profile from shoulder to mitt: no separate wrist/paw balls.
    rows=[(.559,.164,-.017,.025),(.531,.177,-.025,.061),(.490,.191,-.039,.062),(.446,.215,-.052,.056),(.400,.235,-.066,.054),(.352,.247,-.078,.052),(.313,.253,-.084,.048),(.287,.253,-.085,.029)]
    verts=[];faces=[];n=32
    for z,x,y,r in rows:
        for j in range(n):
            t=j*math.tau/n;verts.append((side*(x+r*math.cos(t)),y+r*math.sin(t),z))
    for k in range(len(rows)-1):
        for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
    a=len(verts);verts.append((side*.164,-.017,.572));b=len(verts);verts.append((side*.253,-.085,.275))
    for j in range(n):faces.extend([(a,j,(j+1)%n),(b,(len(rows)-1)*n+(j+1)%n,(len(rows)-1)*n+j)])
    o=mesh('Tapered continuous arm '+str(side),verts,faces,fur);sub=o.modifiers.new('Soft arm profile','SUBSURF');sub.levels=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sub.name);return o

parts=[sphere('Pear torso',(0,0,.375),(.190,.150,.265),fur),sphere('Neck transition',(0,-.006,.593),(.119,.105,.112),fur),sphere('Rounded head',(0,-.015,.80),(.265,.22,.225),fur)]
for side in [-1,1]:
    parts += [sphere('Hip and leg',(side*.088,0,.157),(.078,.075,.123),fur),sphere('Small integrated foot',(side*.097,-.052,.053),(.069,.093,.052),fur),
              continuous_arm(side),ear_leaf(side)]
body=sculpt(parts,'Welded organic Moogle',24000);objects.append((body,'organic'))

# The bowl and its pink color live on the same ear surface, with a white rim.
# No inset plane can sink into the ear or detach while it bends.
ear_profile=[(.979,.163,.061),(1.023,.195,.071),(1.071,.229,.056),(1.115,.252,.031),(1.147,.264,.010)]
def ear_uv(x,z):
    for (a,xa,wa),(b,xb,wb) in zip(ear_profile,ear_profile[1:]):
        if a<=z<=b:
            t=(z-a)/(b-a);center=xa*(1-t)+xb*t;width=wa*(1-t)+wb*t
            return (abs(x)-center)/width
    return 99
for v in body.data.vertices:
    u=ear_uv(v.co.x,v.co.z)
    if abs(u)<.82 and v.co.y<-.045 and .996<v.co.z<1.142:
        rim=1-smooth(.60,.82,abs(u));base=smooth(.996,1.012,v.co.z)*(1-smooth(1.125,1.142,v.co.z))
        v.co.y+=.010*rim*base
body.data.update();body.data.materials.append(pink)
for f in body.data.polygons:
    c=f.center;u=ear_uv(c.x,c.z)
    if .997<c.z<1.139 and abs(u)<.66 and c.y<-.044 and f.normal.y<-.28:f.material_index=1
for side in [-1,1]:
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

# Rounded leather pouch with a curved flap, edge welt and proper side rings.
def rounded_pouch(name,center,axes,mat):
    verts=[];faces=[];n=48;m=24
    def power(v):return math.copysign(abs(v)**.65,v)
    for i in range(1,m):
        phi=-math.pi/2+math.pi*i/m
        for j in range(n):
            t=j*math.tau/n;verts.append((center[0]+axes[0]*power(math.cos(phi))*power(math.cos(t)),center[1]+axes[1]*power(math.cos(phi))*power(math.sin(t)),center[2]+axes[2]*power(math.sin(phi))))
    for r in range(m-2):
        for j in range(n):faces.append((r*n+j,r*n+(j+1)%n,(r+1)*n+(j+1)%n,(r+1)*n+j))
    lo=len(verts);verts.append((center[0],center[1],center[2]-axes[2]));hi=len(verts);verts.append((center[0],center[1],center[2]+axes[2]))
    for j in range(n):faces.extend([(lo,(j+1)%n,j),(hi,(m-2)*n+j,(m-2)*n+(j+1)%n)])
    return mesh(name,verts,faces,mat)

bag=rounded_pouch('Soft courier pouch',(.245,.085,.323),(.095,.038,.098),leather);objects.append((bag,'Bag'))
verts=[];faces=[];nx=20;ny=16
for j in range(ny+1):
    v=j/ny
    for i in range(nx+1):
        u=i/nx*2-1;verts.append((.245+.084*u,.085-.048*math.sin(min(1,v/.25)*math.pi/2)+.009*u*u,.421-.148*v+.027*abs(u)**3*v**4))
for j in range(ny):
    for i in range(nx):
        k=j*(nx+1)+i;faces.append((k,k+1,k+nx+2,k+nx+1))
o=mesh('Draped U flap',verts,faces,leather);sub=o.modifiers.new('Supple flap','SUBSURF');sub.levels=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sub.name);solid=o.modifiers.new('Leather thickness','SOLIDIFY');solid.thickness=.004;bpy.ops.object.modifier_apply(modifier=solid.name);objects.append((o,'Bag'))
objects.append((sphere('Brass clasp',(.245,.033,.302),(.016,.005,.016),gold,20,12),'Bag'))
objects.append((box('Stored envelope',(.247,.082,.434),(.106,.009,.063),paper,.002),'Bag'))
welt=[]
for j in range(25):
    u=j/24*2-1;welt.append((.245+.076*u,.032+.009*u*u,.284+.022*abs(u)**3))
objects.append((tube('Flap edge stitching',welt,.0013,stitch),'Bag'))
for x in [.174,.312]:
    pts=[(x+.011*math.cos(i*math.tau/32),.060,.416+.014*math.sin(i*math.tau/32)) for i in range(33)]
    objects.append((tube('Satchel brass ring '+str(x),pts,.0028,gold),'Bag'))

# Flat leather ribbon: both ends meet bag rings, crossing the chest and back.
def ribbon(name,points,width,thickness,mat):
    samples=[]
    pp=[points[0]]+points+[points[-1]]
    for k in range(1,len(pp)-2):
        a,b,c,d=[Vector(v) for v in pp[k-1:k+3]]
        for j in range(12):
            t=j/12;samples.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    samples.append(Vector(points[-1]));verts=[];faces=[]
    surface=BVHTree.FromPolygons([v.co for v in body.data.vertices],[tuple(f.vertices) for f in body.data.polygons])
    for i,p in enumerate(samples):
        if .18<i/(len(samples)-1)<.80:
            hit,normal,face,distance=surface.find_nearest(p);samples[i]=hit+normal*.007
    for i,p in enumerate(samples):
        tangent=(samples[min(i+1,len(samples)-1)]-samples[max(0,i-1)]).normalized()
        normal=Vector((p.x/.19**2,p.y/.15**2,(p.z-.375)/.265**2)).normalized()
        across=tangent.cross(normal).normalized();normal=across.cross(tangent).normalized()
        for w,h in [(-1,-1),(1,-1),(1,1),(-1,1)]:verts.append(p+across*w*width/2+normal*h*thickness/2)
    for i in range(len(samples)-1):
        for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    faces.extend([(3,2,1,0),tuple(range(len(verts)-4,len(verts)))]);return mesh(name,verts,faces,mat)
strap_pts=[(.312,.060,.416),(.17,.123,.440),(.0,.138,.51),(-.124,.046,.562),(-.131,-.071,.552),(-.083,-.140,.501),(.016,-.162,.441),(.119,-.131,.374),(.179,-.077,.345),(.198,.002,.373),(.174,.060,.416)]
objects.append((ribbon('Flat fitted shoulder belt',strap_pts,.026,.005,leather),'belt'))
objects.append((box('Strap buckle',(-.042,-.165,.475),(.036,.008,.040),gold,.004),'Spine'))
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
    bone('Ear_'+tag,(side*.15,-.035,.967),(side*.267,-.035,1.153),'Head');bone('Eye_'+tag,(side*.107,-.214,.795),(side*.107,-.214,.845),'Head')
    bone('Wing_'+tag,(side*.14,.095,.62),(side*.34,.105,.72),'Spine');bone('WingTip_'+tag,(side*.34,.105,.72),(side*.60,.095,.555),'Wing_'+tag)
bone('Antenna',(.005,.026,.995),(.045,.036,1.23),'Head');bone('Pom',(.045,.036,1.23),(-.061,.034,1.332),'Antenna');bone('Bag',(.215,.085,.40),(.255,.085,.25),'Spine');bone('Letter',(.264,-.12,.313),(.264,-.12,.363),'Paw_R')
bpy.ops.object.mode_set(mode='OBJECT')

def add_weights(o,label):
    if label=='organic':
        excluded={'Root','Antenna','Pom','Bag','Letter','Wing_L','Wing_R','WingTip_L','WingTip_R','Eye_L','Eye_R'}
        for b in arm.bones:b.use_deform=b.name not in excluded
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        for b in arm.bones:b.use_deform=True
        # Match glTF's four skin influences before checking or exporting.
        assignments=[]
        for v in o.data.vertices:
            influences=sorted([(g.group,g.weight) for g in v.groups if g.weight>1e-6],key=lambda t:t[1],reverse=True)[:4]
            total=sum(w for g,w in influences);assert total>0,('unbound heat vertex',v.index)
            assignments.append([(g,w/total) for g,w in influences])
        for g in o.vertex_groups:g.remove(range(len(o.data.vertices)))
        for i,weights in enumerate(assignments):
            for g,w in weights:o.vertex_groups[g].add([i],w,'REPLACE')
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
        return
    groups={name:o.vertex_groups.new(name=name) for name in arm.bones.keys()}
    for v in o.data.vertices:
        x,y,z=v.co;side='L' if x<0 else 'R';weights={}
        if label=='belt':weights={'Spine':1}
        elif label.startswith('ear_'):
            tag='L' if label.endswith('-1') else 'R';u=smooth(.980,1.075,z);weights={'Ear_'+tag:u,'Head':1-u}
        elif label.startswith('eye_'):weights={'Eye_'+('L' if label.endswith('-1') else 'R'):1}
        elif label.startswith('wing_'):
            tip=max(0,min(1,(abs(x)-.30)/.23));weights={'Wing_'+side:1-tip,'WingTip_'+side:tip}
        else:weights={label:1}
        weights=dict(sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4]);total=sum(weights.values());weights={name:w/total for name,w in weights.items()}
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
    rotation('Antenna',(math.sin(base)*.045,math.sin(base)*.035,0));rotation('Pom',(math.sin(base*2+.5)*.07,math.sin(base+.4)*.055,0));rotation('Bag',(0,0,0))
    blink=1.0
    if 1.85<t%4<2.10:blink=max(.08,abs((t%4)-1.975)/.125)
    for side in ['L','R']:p['Eye_'+side].scale=(1,blink,1)
    p['Letter'].scale=(.001,.001,.001)
    if kind=='Walk':
        phase=t*math.tau/.8
        for side in [-1,1]:
            tag='L' if side<0 else 'R';s=math.sin(phase+(math.pi if side<0 else 0));rotation('Thigh_'+tag,(s*.36,0,0));rotation('Shin_'+tag,(max(0,-s)*-.22,0,0));rotation('Foot_'+tag,(-s*.11,0,0));rotation('UpperArm_'+tag,(-s*.14,0,side*.035))
        p['Root'].location.y=.016*abs(math.sin(phase));rotation('Head',(0,0,math.sin(phase)*.026));rotation('Bag',(0,0,0))
    elif kind=='Wave':
        blend=min(1,t/.45,max(0,(3.0-t)/.45));rotation('UpperArm_R',(-2.45*blend,.30*blend,0));rotation('Forearm_R',(-.30*blend,0,.08*math.sin(t*8)*blend));rotation('Paw_R',(0,.2*math.sin(t*8)*blend,0));rotation('Head',(0,.08*blend,-.12*blend))
    elif kind=='Deliver':
        u=min(1,t/.8,max(0,(3.5-t)/.7));rotation('UpperArm_R',(-1.40*u,-.30*u,0));rotation('Forearm_R',(-.26*u,0,0));rotation('Paw_R',(.1*u,0,0));rotation('Head',(.12*u,0,0));rotation('Spine',(.08*u,0,0));rotation('Letter',(1.57*u,.30*u,0));p['Letter'].scale=(1,1,1) if .18<t<2.25 else (.001,.001,.001)
    # Lift the root just enough to keep the lowest foot surface on the floor.
    bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();evaluated=body.evaluated_get(deps);me=evaluated.to_mesh();minimum=min((evaluated.matrix_world@v.co).z for v in me.vertices);evaluated.to_mesh_clear()
    if minimum<.003:p['Root'].location.y+=(.003-minimum)/.85
    bpy.context.view_layer.update();evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=evaluated.to_mesh();after=min((evaluated.matrix_world@v.co).z for v in me.vertices);evaluated.to_mesh_clear();return after

# Check parts within the welded mesh without treating intentional shoulder
# or hip continuity as two surfaces crossing each other.
regions={'head':set(),'arms':set()}
for v in body.data.vertices:
    w={body.vertex_groups[g.group].name:g.weight for g in v.groups}
    if v.co.z>.595:regions['head'].add(v.index)
    if v.co.z<.49 and sum(value for name,value in w.items() if name.startswith(('UpperArm','Forearm','Paw')))> .75:regions['arms'].add(v.index)

def evaluated_bvh(o,region=None):
    ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();verts=[ev.matrix_world@v.co for v in me.vertices]
    faces=[tuple(f.vertices) for f in me.polygons if region is None or all(i in regions[region] for i in f.vertices)]
    tree=BVHTree.FromPolygons(verts,faces,all_triangles=False);ev.to_mesh_clear();return tree

def intersections():
    head=evaluated_bvh(body,'head');arms=evaluated_bvh(body,'arms');bags=[evaluated_bvh(o) for o,label in objects if label=='Bag']
    return {'armHeadSurfacePairs':len(arms.overlap(head)),'armBagSurfacePairs':sum(len(arms.overlap(b)) for b in bags),
            'letterHeadSurfacePairs':sum(len(evaluated_bvh(o).overlap(head)) for o,label in objects if label=='Letter') if rig.pose.bones['Letter'].scale.x>.1 else 0}

# Connectedness and manifold edges are evidence of a welded body, not merely
# a single object holding disconnected overlapping balls.
adjacency=[set() for _ in body.data.vertices]
for e in body.data.edges:
    a,b=e.vertices;adjacency[a].add(b);adjacency[b].add(a)
unseen=set(range(len(adjacency)));components=[]
while unseen:
    pending=[unseen.pop()];count=0
    while pending:
        i=pending.pop();count+=1;more=adjacency[i]&unseen;unseen.difference_update(more);pending.extend(more)
    components.append(count)
assert len(components)==1,components
edge_uses={tuple(sorted(e.vertices)):0 for e in body.data.edges}
for f in body.data.polygons:
    ids=list(f.vertices)
    for a,b in zip(ids,ids[1:]+ids[:1]):edge_uses[tuple(sorted((a,b)))]+=1
nonmanifold=sum(n!=2 for n in edge_uses.values());assert nonmanifold==0,nonmanifold

joint_edges=[]
for e in body.data.edges:
    a,b=e.vertices;mid=(body.data.vertices[a].co+body.data.vertices[b].co)*.5
    if (.36<mid.z<.565 and abs(mid.x)>.13) or .10<mid.z<.255:
        joint_edges.append((a,b,(body.data.vertices[a].co-body.data.vertices[b].co).length))
def joint_strain():
    ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();ratios=sorted((me.vertices[a].co-me.vertices[b].co).length/length for a,b,length in joint_edges if length>1e-6);ev.to_mesh_clear()
    return {'maxStretch':ratios[-1],'p99Stretch':ratios[int(len(ratios)*.99)],'p01Compression':ratios[int(len(ratios)*.01)]}
rig.animation_data_create();actions=[];contacts={};clearance={};strain={}

for name,duration in [('Idle',4.0),('Walk',.8),('Wave',3.0),('Deliver',3.5)]:
    action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
    frames=round(duration*24)+1;foot_samples=[];collision_samples=[];strain_samples=[]
    for frame in range(1,frames+1):
        scene.frame_set(frame);foot_samples.append(pose(name,(frame-1)/(frames-1)*duration));collision_samples.append(intersections());strain_samples.append(joint_strain())
        for b in rig.pose.bones:b.keyframe_insert(data_path='rotation_quaternion',frame=frame);b.keyframe_insert(data_path='location',frame=frame);b.keyframe_insert(data_path='scale',frame=frame)
    action['clip_seconds']=duration;actions.append(action);contacts[name]={'minimumBodyZ':min(foot_samples),'maximumBodyZ':max(foot_samples)}
    clearance[name]={'frames':frames,**{k:max(c[k] for c in collision_samples) for k in collision_samples[0]}}
    strain[name]={k:(min if k=='p01Compression' else max)(c[k] for c in strain_samples) for k in strain_samples[0]}
rig.animation_data.action=actions[0];scene.frame_set(1);pose('Idle',0)

# Fail the rebuild before replacing the runtime GLB if the checked parts cross.
for clip,c in clearance.items():
    assert all(value==0 for key,value in c.items() if key!='frames'),(clip,c)
    assert strain[clip]['p99Stretch']<2.0,(clip,strain[clip])
    assert strain[clip]['p01Compression']>.45,(clip,strain[clip])

# Validate every vertex has normalized bone weights before exporting.
for o,label in objects:
    for v in o.data.vertices:
        total=sum(g.weight for g in v.groups);assert abs(total-1)<.002,(o.name,v.index,total)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o,label in objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'moogle-courier-v3.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_merge_animation='ACTION',export_skins=True,export_def_bones=True,export_force_sampling=True,export_optimize_animation_size=True,export_materials='EXPORT',export_yup=True)
import struct
blob=(OUT/'moogle-courier-v3.glb').read_bytes();json_len=struct.unpack_from('<I',blob,12)[0];document=json.loads(blob[20:20+json_len]);binary=blob[20+json_len+8:]
fur_tex=next(m for m in document['materials'] if m['name']=='Ivory short fur')['pbrMetallicRoughness']['baseColorTexture']
red_pbr=next(m for m in document['materials'] if m['name']=='Wool pompom')['pbrMetallicRoughness'];red_pbr['baseColorTexture']=fur_tex;red_pbr['baseColorFactor']=[.55,.042,.035,1]
js=json.dumps(document,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
rebuilt=struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\x00')+binary
(OUT/'moogle-courier-v3.glb').write_bytes(rebuilt)
AUTHORING=ROOT/'authoring/characters/moogle';AUTHORING.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(AUTHORING/'moogle-courier-v3.blend'))
report={'boneCount':len(arm.bones),'meshCount':len(objects),'bodyVertices':len(body.data.vertices),'polygons':sum(len(o.data.polygons) for o,label in objects),'actions':[a.name for a in actions],'allWeightsNormalized':True,'sampledGroundContacts':contacts,'sampledSurfaceIntersections':clearance,'revision':'v3 welded sculpt, leaf ears and fitted satchel','bodyConnectedComponents':len(components),'bodyNonmanifoldEdges':nonmanifold,'sampledJointStrain':strain,'strapEndCentersMatchRingCenters':True,'bodyBinding':'Blender bone heat normalized to four influences','beltBinding':'Spine, rigid leather anchored to hip pouch','scale':.85,'source':'authored Blender sculpt/rig with generated material references','training':'none'}
(EVID/'build-report.json').write_text(json.dumps(report,indent=2));print('MOOGLE_BUILD',json.dumps(report))
