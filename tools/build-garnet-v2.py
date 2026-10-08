"""Dedicated Garnet rebuild: continuous softly weighted body and sleeves,
sculpted reference-sized face, tailored orange outfit and layered hair.
Reference images guide anatomy; no portrait atlas supplies the face.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
exec((ROOT/'tools/build-steiner-v4.py').read_text().split('EVID=')[0])
EVID=ROOT/'evidence/garnet-v2';EVID.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for action in list(bpy.data.actions):bpy.data.actions.remove(action)
scene=bpy.context.scene;scene.render.fps=24;objects=[]
skin=material('Garnet v2 warm skin','#d0a080');skin.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.62
skinshadow=material('Garnet v2 skin shading','#b98970');orange=material('Garnet v2 ochre orange linen','#9d5425',cloth=True);white=material('Garnet v2 ivory blouse','#e7decc',cloth=True);glove=material('Garnet v2 pale gloves','#dfd4c0');leather=material('Garnet v2 chestnut leather','#774c36');red=material('Garnet v2 oxblood ties','#783e30');gold=material('Garnet v2 antique brass','#ab8652',.45);sole=material('Garnet v2 boot sole','#403329');hair=material('Garnet v2 dark hair','#28211c');hairlight=material('Garnet v2 soft hair ridges','#43362b');ivory=material('Garnet v2 eye ivory','#e8dfd0');iris=material('Garnet v2 brown iris','#63422d');ink=material('Garnet v2 eyelashes','#2c221e');lips=material('Garnet v2 lips','#9b6658');jade=material('Garnet v2 pendant','#28685d',.20);jade.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.31

def add(o,label):objects.append((o,label));return o
def smooth(o,levels=1):
 mod=o.modifiers.new('Soft sculpted surface','SUBSURF');mod.levels=levels;apply(o,mod);return o
# A slim continuous core joins the hips, shoulders, arms and legs.
parts=[smooth(profile('Continuous tailored torso',[(.875,0,.017,.149,.10),(.958,0,.015,.174,.111),(1.05,0,.008,.144,.094),(1.105,0,.008,.122,.082),(1.23,0,.010,.159,.098),(1.31,0,.015,.176,.104),(1.365,0,.024,.190,.095),(1.405,0,.022,.126,.072),(1.462,0,.018,.047,.048),(1.55,0,.018,.041,.044)],orange,48))]
for s in [-1,1]:
 parts.append(smooth(profile('Anatomical trouser leg',[(.14,s*.095,.008,.053,.057),(.29,s*.096,.009,.056,.059),(.43,s*.097,.012,.074,.075),(.59,s*.099,.015,.061,.070),(.735,s*.095,.019,.083,.092),(.92,s*.088,.02,.108,.108),(.99,s*.080,.014,.102,.099)],orange,40,.003)))
 parts.append(smooth(profile('Joined slender arm',[(.686,s*.363,-.013,.036,.039),(.77,s*.352,-.003,.041,.044),(.97,s*.319,.014,.053,.052),(1.11,s*.273,.020,.057,.054),(1.28,s*.228,.022,.058,.059),(1.372,s*.201,.024,.069,.069)],skin,32)))
core=union(parts,'Joined Garnet shoulders waist and hips',.0055,26000);core.data.materials.clear()
for m in [orange,white,skin]:core.data.materials.append(m)
for f in core.data.polygons:
 c=f.center;neckline=1.326+.040*min(1,abs(c.x)/.16) if c.y<-.018 else 1.366;f.material_index=2 if c.z>neckline or(abs(c.x)>.205 and c.z>.67) else 1 if c.z>1.245 else 0
add(core,'BODY')
# Corset with a curved neckline and a narrow waist, not a straight cylinder.
rows=[(.944,.178,.119),(1.015,.157,.104),(1.103,.131,.093),(1.20,.157,.107),(1.293,.177,.111)]
vv=[];ff=[];n=64
for j,(z,rx,ry) in enumerate(rows):
 for k in range(n):
  a=k*math.tau/n;zz=z
  if j==len(rows)-1:zz+=.032*abs(math.cos(a))-.025*max(0,-math.sin(a))
  vv.append((rx*math.cos(a),.011+ry*math.sin(a),zz))
for j in range(len(rows)-1):
 for k in range(n):a=j*n+k;ff.append((a,j*n+(k+1)%n,(j+1)*n+(k+1)%n,a+n))
ff+=[tuple(range(n-1,-1,-1))]
corset=smooth(mesh('Tailored orange bodice',vv,ff,orange));mod=corset.modifiers.new('Tailored cloth thickness','SOLIDIFY');mod.thickness=.005;apply(corset,mod);add(corset,'TORSO')
from mathutils.bvhtree import BVHTree
bpy.context.view_layer.update();corset_surface=BVHTree.FromObject(corset,bpy.context.evaluated_depsgraph_get());core_surface=BVHTree.FromObject(core,bpy.context.evaluated_depsgraph_get())
def front_y(surface,x,z,extra=.0015):
 hit,normal,index,distance=surface.ray_cast(Vector((x,-1,z)),Vector((0,1,0)));return hit.y-extra if hit is not None else -.104
for s in [-1,1]:
 tag='L' if s<0 else 'R'
 sleeve=smooth(profile('Gathered flowing sleeve '+tag,[(.735,s*.355,-.009,.048,.054),(.771,s*.352,-.001,.063,.07),(.83,s*.345,.008,.096,.095),(.89,s*.335,.014,.104,.099),(1.01,s*.309,.015,.075,.072),(1.16,s*.260,.020,.063,.066),(1.285,s*.231,.023,.078,.080),(1.333,s*.215,.020,.065,.068)],white,48,.0035));add(sleeve,'ARM_'+tag)
 add(smooth(profile('Folded wrist cuff '+tag,[(.716,s*.359,-.011,.052,.056),(.748,s*.357,-.010,.055,.058),(.777,s*.352,-.005,.060,.064)],white,40,.002)), 'Forearm_'+tag)
 # Real flat shoulder straps trace over the shoulder toward the back.
 vv=[];ff=[];points=[(s*.126,-.090,1.258),(s*.139,-.078,1.339),(s*.154,-.033,1.385),(s*.148,.036,1.383),(s*.129,.09,1.324),(s*.120,.114,1.23)]
 for x,y,z in points:vv.extend([(x-.014,y,z),(x+.014,y,z)])
 for j in range(len(points)-1):k=j*2;ff.append((k,k+1,k+3,k+2))
 strap=smooth(mesh('Orange shoulder strap '+tag,vv,ff,orange));mod=strap.modifiers.new('Strap volume','SOLIDIFY');mod.thickness=.007;apply(strap,mod);add(strap,'TORSO')
 # Boot proportions and folded linen cuffs, with actual soles and heel blocks.
 vv=[];ff=[];rings=[(.065,.075,.057),(.018,.146,.057),(-.055,.135,.063),(-.13,.065,.066),(-.19,.027,.035),(-.207,.012,.004)]
 for y,h,w in rings:
  for j in range(20):a=math.pi*j/19;vv.append((s*.095+w*math.cos(a),y,.013+h*math.sin(a)))
 for i in range(len(rings)-1):
  for j in range(19):k=i*20+j;ff.append((k,k+1,k+21,k+20))
 ff += [tuple(range(19,-1,-1)),tuple(range(100,120)),tuple([i*20 for i in range(len(rings))]+[i*20+19 for i in range(len(rings)-1,-1,-1)])]
 add(smooth(mesh('Continuous boot vamp '+tag,vv,ff,leather)), 'Foot_'+tag)
 add(sphere('Boot sole '+tag,(s*.095,-.076,.019),(.07,.12,.015),sole),'Foot_'+tag)
 add(box('Low boot heel '+tag,(s*.095,.028,.037),(.089,.081,.065),sole,.006),'Foot_'+tag)
 add(smooth(profile('Boot ankle shaft '+tag,[(.086,s*.095,.015,.058,.067),(.17,s*.095,.015,.062,.071),(.28,s*.095,.016,.059,.067),(.325,s*.095,.018,.065,.074)],leather,40,.002)), 'Shin_'+tag)
 add(smooth(profile('Soft folded boot cuff '+tag,[(.298,s*.095,.018,.081,.085),(.318,s*.095,.018,.083,.088),(.377,s*.095,.018,.076,.084),(.390,s*.095,.018,.071,.076)],white,40,.002)), 'Shin_'+tag)
 # Connected fingers and a tapered palm rather than sphere mittens.
 handparts=[smooth(profile('Slender gloved palm '+tag,[(.608,s*.364,-.020,.025,.017),(.640,s*.364,-.021,.035,.024),(.678,s*.364,-.018,.038,.026),(.711,s*.359,-.014,.032,.023),(.732,s*.357,-.009,.028,.021)],glove,32))]
 for j in range(4):
  x=s*(.336+j*.0175);length=[.055,.073,.069,.050][j]
  handparts.append(tube('Relaxed finger '+tag+str(j),[(x,-.022,.64,.0095),(x+s*.001,-.028,.618,.0085),(x+s*.004,-.038,.64-length,.0055)],glove,10,9))
 handparts.append(tube('Relaxed thumb '+tag,[(s*.328,-.026,.698,.014),(s*.310,-.052,.672,.011),(s*.318,-.063,.651,.006)],glove,10,8))
 add(union(handparts,'Continuous graceful glove '+tag,.0028,6500),'Hand_'+tag)
 for x in [s*.109,s*.149]:
  pts=[]
  for i in range(15):
   z=1.012+i*.23/14;xx=x*(.88+.12*abs(z-1.11)/.14);pts.append((xx,front_y(corset_surface,xx,z,.001),z,.001))
  add(tube('Tailored bodice seam '+tag,pts,red,6,3),'TORSO')
# A diagonal leather belt wraps the hips and has a framed buckle and side tab.
vv=[];ff=[];n=64
for j in [-1,1]:
 for k in range(n):a=k*math.tau/n;vv.append((.183*math.cos(a),.013+.120*math.sin(a),1.005-.025*math.cos(a)+j*.020))
for k in range(n):ff.append((k,(k+1)%n,n+(k+1)%n,n+k))
belt=mesh('Diagonal hip belt',vv,ff,leather);mod=belt.modifiers.new('Belt thickness','SOLIDIFY');mod.thickness=.008;apply(belt,mod);add(belt,'Spine')
add(tube('Framed belt buckle',[(.065,-.103,.985,.004),(.11,-.087,.976,.004),(.117,-.087,1.023,.004),(.074,-.103,1.032,.004),(.065,-.103,.985,.004)],gold,12,6),'Spine')
add(box('Belt tongue',(.092,-.112,1.006),(.035,.008,.004),gold,.001),'Spine');add(box('Leather belt end',(.177,-.021,.902),(.043,.025,.13),leather,.01),'Spine')
for i in range(5):
 z=1.045+i*.039
 for s in [-1,1]:
  x=s*.028;add(sphere('Bodice eyelet',(x,front_y(corset_surface,x,z,.003),z),(.005,.003,.005),red),'TORSO')
  pts=[]
  for j in range(9):
   u=j/8;x=s*.028*(1-2*u);zz=z+.030*u;pts.append((x,front_y(corset_surface,x,zz,.005),zz,.002))
  add(tube('Fine corset cross lace',pts,red,8,3),'TORSO')
for s in [-1,1]:add(tube('Small ribbon bow',[(0,front_y(corset_surface,0,1.243,.006),1.243,.002),(s*.034,-.097,1.252,.002),(s*.025,-.105,1.232,.002),(0,-.102,1.243,.002)],red,8,9),'Chest')
neckline=[]
for i in range(33):
 x=-.144+i*.288/32;z=1.326+.04*abs(x)/.16;neckline.append((x,front_y(core_surface,x,z,.002),z,.0021))
add(tube('Soft V blouse neckline',neckline,white,10,3),'Chest')
# Neckline gathers remain shallow and connected to the blouse surface.
for i in range(13):
 x=-.115+i*.019;z=1.312+.012*abs(x)/.12
 add(tube('Fine blouse gathering',[(x,front_y(core_surface,x,z,.001),z,.001),(x*.97,front_y(core_surface,x*.97,z-.036,.001),z-.036,.0008)],white,6,5),'Chest')
cord=[]
for i in range(33):
 x=-.064+i*.128/32;z=1.356+.076*(abs(x)/.064)**1.2;cord.append((x,front_y(core_surface,x,z,.002),z,.0016))
add(tube('Pendant cord',cord,ink,8,3),'Chest');py=front_y(core_surface,0,1.345,.008)
add(smooth(profile('Green teardrop pendant',[(1.324,0,py,.001,.003),(1.333,0,py,.011,.006),(1.347,0,py,.010,.006),(1.360,0,py,.003,.003)],jade,28)), 'Chest')
# The sculpted face shares the proven surface-conforming approach, retuned for Garnet.
face_start=len(objects)
face_code=(ROOT/'tools/build-steiner-v4.py').read_text().split('# Jaw/chin form,')[1].split('# Solid bob shape')[0].split('\n',1)[1]
face_code=face_code.replace('rows=[(1.225,.080,.074),(1.245,.102,.086),(1.28,.117,.096),(1.36,.134,.102),(1.48,.153,.125),(1.57,.147,.123),(1.635,.128,.103),(1.69,.071,.061),(1.704,.009,.010)]','rows=[(1.225,.060,.059),(1.245,.080,.075),(1.28,.106,.089),(1.36,.138,.104),(1.48,.151,.117),(1.57,.140,.110),(1.635,.123,.098),(1.69,.070,.06),(1.704,.009,.010)]')
face_code=face_code.replace('Steiner sculpted head','Garnet sculpted head').replace('cheek=.008','cheek=.0045').replace("(1.391,0,-.125,.028,.023),(1.412,0,-.141,.037,.031),(1.443,0,-.132,.029,.033)","(1.391,0,-.123,.019,.019),(1.412,0,-.133,.024,.022),(1.443,0,-.124,.020,.025)")
face_code=face_code.replace('plane_co=(x,0,1.520)','plane_co=(x,0,1.527)').replace('plane_no=(-s*.18,0,1)','plane_no=(-s*.12,0,1)').replace("(.031,.010,.016)","(.033,.010,.022)").replace("(.0115,.003,.013)","(.014,.003,.016)").replace("(.007,.0018,.0095)","(.0075,.0018,.012)")
face_code=face_code.replace("brow=[(s*.030,1.534,.006),(s*.064,1.546,.007),(s*.106,1.547,.0035)]", "brow=[(s*.030,1.543,.004),(s*.064,1.555,.0045),(s*.106,1.549,.002)]")
face_code=face_code.replace("[(s*.033,1.514,.003),(s*.063,1.52,.003),(s*.096,1.526,.002)]","[(s*.033,1.52,.0025),(s*.063,1.527,.0025),(s*.096,1.524,.002)]").replace("[(s*.034,1.505,.0018),(s*.063,1.499,.002),(s*.094,1.505,.0015)]","[(s*.034,1.505,.0015),(s*.063,1.498,.0015),(s*.094,1.505,.001)]")
a=face_code.index(' furrow=');b=face_code.index('mouth=[]',a);face_code=face_code[:a]+face_code[b:]
face_code=face_code.replace('z=1.328-.006','z=1.328+.005').replace("(.007,.003,.004),skinshadow","(.005,.002,.003),skinshadow")
face_code=face_code.replace("nose=profile('Broad squared nose'","nose=smooth(profile('Delicate rounded nose'").replace("],skin,32)\nhead=union","],skin,32))\nhead=union")
assert 'rows=[(1.225,.060,.059)' in face_code and 'cheek=.0045' in face_code, 'Garnet face template mismatch'
exec(face_code)
def face_form(v):return Vector((v[0]*.64,.008+(v[1]-.008)*.64,1.485+(v[2]-1.225-.030*math.exp(-((v[2]-1.51)/.085)**2))*.52))
for o,label in objects[face_start:]:
 for v in o.data.vertices:v.co=face_form(v.co)
 o.data.update()
hair_start=len(objects)
# A coherent hair cap, broad sculpted parted locks and one low gathered ponytail.
cap=sphere('Parted hair crown',(0,.004,1.766),(.135,.122,.116),hair)
bm=bmesh.new();bm.from_mesh(cap.data)
remove=[]
for f in bm.faces:
 c=f.calc_center_median()
 if c.y<-.019 and c.z<1.80-.14*min(1,abs(c.x)/.127):remove.append(f)
bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(cap.data);bm.free()
cap=smooth(cap);mod=cap.modifiers.new('Hair cap thickness','SOLIDIFY');mod.thickness=.007;apply(cap,mod);add(cap,'Head')
bpy.context.view_layer.update();crown_surface=BVHTree.FromObject(cap,bpy.context.evaluated_depsgraph_get())
for side in [-1,1]:
 for i in range(10):
  pts=[]
  for j in range(20):
   u=j/19;z=1.865-.135*u;x=side*(.010+i*.006+(.028+i*.002)*u)
   hit,normal,index,d=crown_surface.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
   if hit is not None and hit.y<-.005 and normal.y<-.10:pts.append((x,hit.y-.0007,z,.0007))
  if len(pts)>1:add(tube('Crown hair strand',pts,hairlight,6,3),'Head')
for s in [-1,1]:
 for i in range(3):
  end=1.525+i*.031 if s<0 else 1.566+i*.027
  pts=[(s*(.008+i*.008),-.006,1.858,.014),(s*(.040+i*.021),-.083,1.822,.026),(s*(.088+i*.009),-.098+i*.008,1.74,.031),(s*(.106+i*.009),-.069+i*.012,1.643,.023),(s*(.105+i*.008),-.020+i*.011,end,.001)]
  lock=tube('Broad parted hair lock',pts,hairlight if i==2 else hair,16,18,flatten=.20);add(lock,'Head')
 add(smooth(profile('Soft side hair',[(1.518,s*.112,.012,.014,.026),(1.59,s*.121,.016,.023,.050),(1.70,s*.122,.022,.025,.076),(1.815,s*.074,.023,.035,.072)],hair,36)), 'Head')
add(smooth(profile('Gathered back of head',[(1.478,0,.112,.046,.042),(1.54,0,.102,.079,.051),(1.64,0,.082,.117,.079),(1.76,0,.027,.123,.103),(1.83,0,.025,.07,.068)],hair,48)), 'Head')
pony=smooth(profile('Long low gathered ponytail',[(1.019,0,.150,.005,.005),(1.06,0,.158,.038,.025),(1.17,0,.177,.070,.040),(1.30,0,.181,.080,.045),(1.435,0,.152,.057,.035),(1.512,0,.132,.046,.037)],hair,48));add(pony,'HairTip')
bpy.context.view_layer.update();pony_surface=BVHTree.FromObject(pony,bpy.context.evaluated_depsgraph_get())
for i in range(15):
 pts=[];a=-1.17+i*2.34/14
 for j in range(20):
  u=j/19;z=1.485-.445*u;x=math.sin(a)*(.041+.035*math.sin(math.pi*u))*(1-.62*u);hit,normal,index,d=pony_surface.ray_cast(Vector((x,1,z)),Vector((0,-1,0)))
  if hit is not None:pts.append((x,hit.y+.001,z,.0009))
 if len(pts)>1:add(tube('Carved ponytail strand',pts,hairlight,6,3),'HairTip')
for z in [1.477,1.493,1.508]:add(profile('Wrapped low hair tie',[(z-.009,0,.137,.05,.041),(z+.009,0,.137,.052,.042)],red,32), 'Head')
def hair_form(v):return Vector((v[0],v[1],1.485+(v[2]-1.515)*.86))
for o,label in objects[hair_start:]:
 for v in o.data.vertices:v.co=hair_form(v.co)
 o.data.update()
# Named, blended anatomy weights keep soft joints continuous.
bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='Garnet v2 rig';arm=rig.data;bpy.ops.object.mode_set(mode='EDIT');arm.edit_bones.remove(arm.edit_bones[0])
def bone(n,a,b,parent=None):
 q=arm.edit_bones.new(n);q.head=a;q.tail=b
 if parent:q.parent=arm.edit_bones[parent]
bone('Root',(0,.012,.9),(0,.012,1.0));bone('Spine',(0,.012,.96),(0,.012,1.2),'Root');bone('Chest',(0,.02,1.18),(0,.018,1.43),'Spine');bone('Head',(0,.016,1.505),(0,.014,1.72),'Chest');bone('HairTip',hair_form((0,.137,1.495)),hair_form((0,.175,1.11)),'Head');bone('Tail',(0,.05,1.0),(0,.05,1.04),'Root');bone('TailTip',(0,.05,1.04),(0,.05,1.07),'Tail')
for s in [-1,1]:
 t='L' if s<0 else 'R';bone('UpperArm_'+t,(s*.20,.024,1.36),(s*.319,.014,1.005),'Chest');bone('Forearm_'+t,(s*.319,.014,1.005),(s*.357,-.008,.735),'UpperArm_'+t);bone('Hand_'+t,(s*.357,-.008,.735),(s*.364,-.024,.63),'Forearm_'+t);bone('Thigh_'+t,(s*.093,.02,.94),(s*.099,.015,.60),'Root');bone('Shin_'+t,(s*.099,.015,.60),(s*.095,.015,.13),'Thigh_'+t);bone('Foot_'+t,(s*.095,.015,.13),(s*.095,-.155,.055),'Shin_'+t)
 ey=face_form((s*.063,face_y(s*.063,1.514)-.001,1.514));bone('Eye_'+t,ey,ey+Vector((0,0,.02)),'Head')
bpy.ops.object.mode_set(mode='OBJECT')
def smoothstep(a,b,x):t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def torso_weights(z):
 if z>1.445:
  h=smoothstep(1.445,1.535,z);return {'Chest':1-h,'Head':h}
 chest=smoothstep(1.105,1.28,z);root=1-smoothstep(.91,1.035,z);return {'Root':root,'Spine':(1-root)*(1-chest),'Chest':(1-root)*chest}
def limb_weights(tag,z):u=smoothstep(.944,1.14,z);return {'Forearm_'+tag:1-u,'UpperArm_'+tag:u}
def weights(label,v):
 if label.startswith('ARM_'):return limb_weights(label[-1],v.z)
 if label=='TORSO':return torso_weights(v.z)
 if label!='BODY':return {label:1}
 x,y,z=v;tag='L' if x<0 else 'R'
 if z>.66 and (abs(x)>.238 or (z>1.175 and abs(x)>.155)):
  a=smoothstep(.155,.237,abs(x));result={n:w*(1-a) for n,w in torso_weights(z).items()}
  for n,w in limb_weights(tag,z).items():result[n]=result.get(n,0)+w*a
  return result
 if z>.945:return torso_weights(z)
 root=smoothstep(.825,.965,z)
 if z>.80:root=max(root,1-smoothstep(.018,.070,abs(x)))
 thigh=smoothstep(.49,.67,z);foot=1-smoothstep(.12,.235,z)
 return {'Root':root,'Thigh_'+tag:(1-root)*thigh,'Shin_'+tag:(1-root)*(1-thigh)*(1-foot),'Foot_'+tag:(1-root)*(1-thigh)*foot}
for o,label in objects:
 groups={n:o.vertex_groups.new(name=n) for n in arm.bones.keys()}
 for v in o.data.vertices:
  ws=sorted([(n,w)for n,w in weights(label,v.co).items() if w>.00001],key=lambda t:t[1],reverse=True)[:4];total=sum(w for n,w in ws);assert total>0
  for n,w in ws:groups[n].add([v.index],w/total,'REPLACE')
 mod=o.modifiers.new('Continuous named anatomy skin','ARMATURE');mod.object=rig;o.parent=rig
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
for o,label in objects:o.select_set(True)
bpy.context.view_layer.objects.active=core;bpy.ops.object.join();body=bpy.context.object;body.name='Garnet continuous tailored character'
for b in rig.pose.bones:b.rotation_mode='QUATERNION'
rest={b.name:b.matrix_local.to_quaternion() for b in arm.bones}
def rotate(n,xyz):q=Euler(xyz,'XYZ').to_quaternion();rig.pose.bones[n].rotation_quaternion=rest[n].inverted()@q@rest[n]
def pose(clip,t):
 pb=rig.pose.bones
 for b in pb:b.location=(0,0,0);b.scale=(1,1,1);b.rotation_quaternion=(1,0,0,0)
 ph=t*math.tau/(1.2 if clip=='Walk' else 4);rotate('Chest',(math.sin(ph)*.008,0,math.sin(ph)*.006));rotate('Head',(0,math.sin(ph)*.016,0));rotate('HairTip',(math.sin(ph)*.012,0,math.sin(ph)*.015))
 if clip=='Walk':
  for s in [-1,1]:
   tag='L' if s<0 else 'R';v=math.sin(ph+(math.pi if s<0 else 0));rotate('Thigh_'+tag,(v*.23,0,0));rotate('Shin_'+tag,(-max(0,-v)*.17,0,0));rotate('Foot_'+tag,(-v*.06,0,0));rotate('UpperArm_'+tag,(-v*.12,0,0));rotate('Forearm_'+tag,(-.025,0,0))
 elif clip in ['Greet','Signature']:
  u=max(0,min(1,t/.8,(3.4-t)/.8))
  if clip=='Greet':rotate('UpperArm_R',(-.45*u,0,-.35*u));rotate('Forearm_R',(-.65*u,0,0));rotate('Hand_R',(-.04*u,0,math.sin(t*4)*.05*u));rotate('Head',(.02*u,-.03*u,0))
  else:
   rotate('Chest',(.045*u,0,0));rotate('Head',(.08*u,0,0));rotate('UpperArm_L',(-.10*u,0,.045*u));rotate('UpperArm_R',(-.10*u,0,-.045*u))
 bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();low=min((ev.matrix_world@v.co).z for v in me.vertices);ev.to_mesh_clear();pb['Root'].location.y=max(0,.003-low);bpy.context.view_layer.update()
rig.animation_data_create();actions=[]
for name,duration in [('Idle',4),('Walk',1.2),('Greet',3.4),('Signature',3.4)]:
 a=bpy.data.actions.new(name);a.use_fake_user=True;rig.animation_data.action=a;actions.append(a);frames=round(duration*24)+1
 for f in range(1,frames+1):
  scene.frame_set(f);pose(name,(f-1)/(frames-1)*duration)
  for b in rig.pose.bones:b.keyframe_insert(data_path='rotation_quaternion',frame=f);b.keyframe_insert(data_path='location',frame=f);b.keyframe_insert(data_path='scale',frame=f)
rig.animation_data.action=actions[0];scene.frame_set(1);pose('Idle',0);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'garnet-v2.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_merge_animation='ACTION',export_skins=True,export_def_bones=True,export_force_sampling=True,export_optimize_animation_size=True,export_yup=True)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(AUTHOR/'garnet-v2.blend'),compress=True)
(EVID/'build.json').write_text(json.dumps({'character':'garnet','version':2,'artAcceptance':'pending user review; v1 rejected','reference':'art-direction/royal-cast/garnet-target-v1.png','geometry':'dedicated continuous body, region-blended soft clothing, sculpted fitted face, broad parted locks and low ponytail; no face atlas','vertices':len(body.data.vertices),'faces':len(body.data.polygons),'joints':len(arm.bones),'actions':[a.name for a in actions],'binding':'named anatomical regions blended with normalized maximum four influences; rigid accessories','newImageCalls':0,'remote4090Tasks':0},indent=2)+'\n');print('GARNET_V2_COMPLETE',len(body.data.vertices),len(body.data.polygons),flush=True)
