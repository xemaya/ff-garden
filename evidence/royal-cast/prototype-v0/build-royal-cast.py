"""Authored stylized royal cast; continuous heat-skinned body, sculpted costume.
Concept sheets are art direction only. This script produces actual animated GLBs.
"""
import bpy,bmesh,math,json,random
from pathlib import Path
from mathutils import Vector,Euler
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/assets/characters/royal-cast';EVID=ROOT/'evidence/royal-cast';AUTHOR=ROOT/'authoring/characters/royal-cast'
for p in [OUT,EVID,AUTHOR]:p.mkdir(parents=True,exist_ok=True)
def rgb(hex):
 h=hex.lstrip('#');c=[int(h[i:i+2],16)/255 for i in [0,2,4]];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)
def material(name,color,metal=0,cloth=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb(color),1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.51 if metal else .88
 if cloth:
  n=256;im=bpy.data.images.new(name+' weave',width=n,height=n);r=random.Random(781);base=[int(color.lstrip('#')[i:i+2],16)/255 for i in [0,2,4]];pixels=[]
  for y in range(n):
   for x in range(n):
    tone=1+.022*math.sin(x*math.pi/2)*math.sin(y*math.pi/2)+r.uniform(-.017,.017)
    pixels.extend([max(0,min(1,v*tone)) for v in base]+[1])
  im.pixels.foreach_set(pixels);im.filepath_raw=str(OUT/(name.replace(' ','-')+'.png'));im.file_format='PNG';im.save();im.pack();node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
 return m
def apply(o,m):bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
def mesh(name,verts,faces,m):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free();o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);d.materials.append(m)
 for f in d.polygons:f.use_smooth=True
 return o
def sphere(name,loc,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def box(name,loc,scale,m,bevel=.01):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(m)
 if bevel:mod=o.modifiers.new('Soft crafted edge','BEVEL');mod.width=bevel;mod.segments=3;apply(o,mod)
 return o
def profile(name,rows,m,n=32,fold=0):
 verts=[];faces=[]
 for i,(z,x,y,rx,ry)in enumerate(rows):
  for j in range(n):
   a=j*math.tau/n;f=fold*math.sin(a*9+z*7)*math.sin(i/(len(rows)-1)*math.pi);verts.append((x+(rx+f)*math.cos(a),y+(ry+f)*math.sin(a),z))
 for i in range(len(rows)-1):
  for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
 faces.extend([tuple(range(n-1,-1,-1)),tuple(range((len(rows)-1)*n,len(rows)*n))]);return mesh(name,verts,faces,m)
def tube(name,points,m,n=10,steps=12):
 verts=[];faces=[];p=[Vector(v[:3]) for v in points]
 for i in range((len(points)-1)*steps+1):
  index=min(len(p)-2,i//steps);u=min(1,(i-index*steps)/steps);a=p[max(0,index-1)];b=p[index];c=p[index+1];d=p[min(len(p)-1,index+2)]
  pos=(b*2+(c-a)*u+(a*2-b*5+c*4-d)*u*u+(-a+b*3-c*3+d)*u*u*u)*.5
  tangent=((c-a)+(a*2-b*5+c*4-d)*2*u+(-a+b*3-c*3+d)*3*u*u).normalized();cross=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((0,1,0));xx=tangent.cross(cross).normalized();yy=tangent.cross(xx).normalized();r=points[index][3]*(1-u)+points[index+1][3]*u
  for j in range(n):ang=j*math.tau/n;verts.append(pos+xx*r*math.cos(ang)+yy*r*math.sin(ang))
 rings=len(verts)//n
 for i in range(rings-1):
  for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
 faces.extend([tuple(range(n-1,-1,-1)),tuple(range((rings-1)*n,rings*n))]);return mesh(name,verts,faces,m)
def union(parts,name,voxel=.008,limit=17000):
 bpy.ops.object.select_all(action='DESELECT')
 for p in parts:p.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;rem=o.modifiers.new('Continuous anatomy','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel;apply(o,rem);sm=o.modifiers.new('Smooth forms','SMOOTH');sm.factor=.55;sm.iterations=4;apply(o,sm)
 if len(o.data.polygons)>limit:dec=o.modifiers.new('Game sculpt','DECIMATE');dec.ratio=limit/len(o.data.polygons);apply(o,dec)
 for f in o.data.polygons:f.use_smooth=True
 return o
def build(name):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for action in list(bpy.data.actions):bpy.data.actions.remove(action)
 scene=bpy.context.scene;scene.render.fps=24;objects=[]
 skin=material(name+' skin','#d9af90');blue=material(name+' indigo','#345b79',cloth=True);white=material(name+' linen','#e6dfcb',cloth=True);orange=material(name+' orange','#d98732',cloth=True);leather=material(name+' leather','#6d4933',cloth=True);olive=material(name+' olive','#777e54',cloth=True);steel=material(name+' brushed steel','#9aabab',.67);darksteel=material(name+' steel seams','#536b71',.54);gold=material(name+' brass','#aa8850',.55);hair=material(name+' hair','#b6954f' if name=='zidane' else '#302d28');hairlight=material(name+' hair lights','#d0b16b' if name=='zidane' else '#464239');red=material(name+' burgundy','#85432f',cloth=True);iris=material(name+' iris','#47769c' if name=='zidane' else '#70533b');black=material(name+' pupils','#20292d');eye=material(name+' eye ivory','#e9e4d6');jade=material(name+' jade','#527c67',.20)
 def add(o,bone):objects.append((o,bone));return o
 stocky=name=='steiner';hip=.78 if stocky else .82;chest=1.23 if stocky else 1.22;shoulder=.29 if stocky else .215;wrist=.44 if stocky else .345;bodymat=blue if name!='garnet' else orange
 parts=[profile('Body torso',[(hip-.09,0,0,.21 if stocky else .145,.145 if stocky else .095),(hip+.05,0,0,.245 if stocky else .16,.145 if stocky else .11),(1.02,0,0,.275 if stocky else .14,.17 if stocky else .105),(1.15,0,0,.28 if stocky else .19,.16 if stocky else .12),(1.26,0,0,.22 if stocky else .15,.13 if stocky else .10),(1.34,0,0,.075,.066)],bodymat)]
 for side in [-1,1]:
  parts.append(profile('Leg',[(.07,side*.11,0,.067,.072),(.24,side*.115,0,.071 if stocky else .065,.074),(.43,side*.12,0,.090 if stocky else .082,.085),(.64,side*.115,0,.11 if stocky else .10,.115 if stocky else .095),(hip+.07,side*.10,0,.13 if stocky else .10,.13 if stocky else .105)],bodymat,32,.004))
  parts.append(profile('Joined sleeve arm',[(.71,side*wrist,-.012,.054,.057),(.80,side*(wrist-.012),0,.071 if name=='garnet' else .065,.069),(.95,side*(shoulder+.075),0,.10 if name=='garnet' else .077,.085),(1.12,side*(shoulder+.02),0,.088,.082),(1.22,side*(shoulder-.04),0,.093,.093)],bodymat,32,.003))
 body=union(parts,'Continuous torso shoulders and legs',.0085,16500);body.data.materials.clear()
 for m in [bodymat,white,skin,leather]:body.data.materials.append(m)
 for f in body.data.polygons:
  c=f.center if hasattr(f,'center') else sum((body.data.vertices[i].co for i in f.vertices),Vector())/len(f.vertices)
  x,y,z=c;index=0
  if z<.28:index=3
  elif z>1.265:index=2
  elif abs(x)>shoulder*.91 and z>.72:index=2 if name=='zidane' else 1 if name=='garnet' else 0
  elif name=='garnet' and z>1.14:index=1
  f.material_index=index
 # Sculpted head with a tapered jaw, cheeks and flattened face plane.
 headz=1.52 if stocky else 1.51;scale=1.12 if stocky else 1.0
 head=profile('Human face volume',[(1.32,0,-.026,.075*scale,.073),(1.38,0,-.022,.113*scale,.106),(1.48,0,-.003,.147*scale,.129),(1.59,0,.003,.154*scale,.137),(1.70,0,.016,.127*scale,.113),(1.755,0,.018,.067*scale,.062),(1.775,0,.018,.007,.007)],skin,48)
 sm=head.modifiers.new('Soft face surface','SUBSURF');sm.levels=1;apply(head,sm)
 head=union([head,sphere('Nose bridge',(0,-.136,1.49),(.025 if not stocky else .036,.039,.055),skin),sphere('Nose tip',(0,-.169,1.47),(.028 if not stocky else .040,.034,.023),skin)],'Sculpted face and nose',.0045,10500);add(head,'Head')
 for side in [-1,1]:
  tag='L' if side<0 else 'R';add(sphere('Ear',(side*.147*scale,.003,1.50),(.024,.031,.051),skin),'Head');add(sphere('Inner ear',(side*.163*scale,-.009,1.50),(.010,.014,.029),red),'Head')
  x=side*.066*scale;y=-.125;z=1.552
  add(sphere('Almond eye',(x,y,z),(.039,.016,.026),eye),'Eye_'+tag);add(sphere('Iris',(x,y-.015,z),(.015,.006,.020),iris),'Eye_'+tag);add(sphere('Pupil',(x,y-.020,z),(.0075,.003,.0125),black),'Eye_'+tag);add(sphere('Eye highlight',(x-.004,y-.023,z+.007),(.004,.002,.004),eye),'Eye_'+tag)
  add(tube('Upper eyelid',[(x-.041,y, z,.005),(x,z*0- .139,z+.029,.007),(x+.041,y,z,.005)],hair if stocky else skin,8,8),'Head')
  brow=[(x-.037,-.137,z+.052,.008),(x,-.139,z+.067+(.014 if stocky else 0),.012),(x+.038,-.129,z+.054,.008)];add(tube('Sculpted eyebrow',brow,hair,8,8),'Head')
 add(tube('Mouth line',[(-.043,-.119,1.410,.004),(0,-.130,1.402 if stocky else 1.412,.004),(.043,-.119,1.410,.004)],red,8,8),'Head');add(sphere('Lower lip',(0,-.119,1.397),(.033,.009,.009),skin),'Head')
 # Hands have separate sculpted fingers rather than sphere mitts.
 handmat=steel if stocky else olive if name=='zidane' else red
 for side in [-1,1]:
  tag='L' if side<0 else 'R';add(sphere('Palm '+tag,(side*wrist,-.014,.674),(.048,.034,.064),handmat),'Hand_'+tag)
  for j in range(4):
   x=side*(wrist-.031+j*.020);length=[.069,.082,.078,.061][j];add(tube('Finger '+tag+str(j),[(x,-.012,.657,.0115),(x,-.019,.625,.011),(x,-.028,.657-length,.006)],handmat,8,8),'Hand_'+tag)
  add(tube('Thumb '+tag,[(side*(wrist-.046),-.020,.69,.018),(side*(wrist-.071),-.050,.657,.014),(side*(wrist-.065),-.064,.638,.009)],handmat,10,8),'Hand_'+tag)
  bootmat=steel if stocky else olive if name=='zidane' else red
  add(sphere('Foot boot '+tag,(side*.115,-.064,.082),(.094 if stocky else .080,.143,.072),bootmat),'Foot_'+tag);add(sphere('Dark sole '+tag,(side*.115,-.064,.025),(.096 if stocky else .082,.145,.021),leather),'Foot_'+tag)
  add(profile('Boot shaft '+tag,[(.11,side*.115,0,.076,.079),(.22,side*.115,0,.075,.074),(.32 if stocky else .29,side*.115,0,.083,.083)],bootmat,32),'Shin_'+tag)
  if not stocky:add(profile('Folded pale boot cuff '+tag,[(.27,side*.115,0,.092,.09),(.32,side*.115,0,.103,.097),(.34,side*.115,0,.106,.101)],white,32,.002),'Shin_'+tag)
  if stocky:
   for zz in [.26,.32,.38]:add(profile('Overlapping shin plate '+tag,[(zz,side*.115,-.026,.103,.092),(zz+.08,side*.115,-.017,.10,.10)],steel,32),'Shin_'+tag)
   add(sphere('Knee cup '+tag,(side*.12,-.068,.45),(.114,.072,.097),steel),'Shin_'+tag)
 # Costume seams, hems and true accessories are individually bound to rig bones.
 add(profile('Waist leather belt',[(hip+.035,0,0,.256 if stocky else .166,.16 if stocky else .119),(hip+.095,0,0,.25 if stocky else .164,.155 if stocky else .117)],leather,48),'Spine');add(box('Belt buckle',(0,-(.164 if stocky else .126),hip+.067),(.062,.021,.070),gold,.008),'Spine')
 if name=='zidane':
  for side in [-1,1]:
   tag='L' if side<0 else 'R';add(tube('Vest tailored edge',[(side*.016,-.118,.88,.014),(side*.146,-.118,1.0,.014),(side*.123,-.115,1.2,.014),(side*.077,-.08,1.285,.014)],leather,8,10),'Chest')
   add(tube('Shoulder leather harness',[(side*.11,-.108,1.1,.020),(side*.13,-.07,1.25,.022),(side*.13,.07,1.26,.022),(side*.10,.11,1.07,.020)],leather,10,10),'Chest')
   add(profile('Detached big blue cuff '+tag,[(.755,side*wrist,-.01,.102,.094),(.83,side*(wrist-.008),0,.110,.098),(.87,side*(wrist-.017),0,.09,.085)],blue,32,.002),'Forearm_'+tag)
   add(profile('Ivory ruffled cuff '+tag,[(.73,side*wrist,-.01,.102,.093),(.756,side*wrist,-.01,.108,.099)],white,32,.008),'Forearm_'+tag)
  add(profile('Cream waist sash',[(.77,0,0,.173,.126),(.825,0,0,.169,.12),(.854,0,0,.164,.119)],white,48,.002),'Spine')
  add(mesh('Ivory shirt front',[(-.10,-.124,1.01),(.10,-.124,1.01),(.08,-.122,1.26),(-.08,-.122,1.26)],[(0,1,2,3)],white),'Chest')
  for side in [-1,1]:add(tube('Teal neck ribbon',[(0,-.09,1.28,.018),(side*.025,-.128,1.23,.019),(side*.05,-.136,1.16,.012)],blue,10,10),'Chest')
  tail=tube('Monkey tail',[(0,.12,.81,.034),(.08,.32,.65,.031),(.32,.40,.43,.028),(.45,.35,.50,.032),(.41,.25,.67,.018)],hair,12,16);add(tail,'Tail');add(sphere('Soft tail tip',(.41,.25,.67),(.035,.025,.068),hairlight),'TailTip')
 if name=='garnet':
  for side in [-1,1]:
   add(tube('Orange shoulder strap',[(side*.10,-.102,1.11,.017),(side*.115,-.072,1.27,.018),(side*.13,.077,1.24,.017),(side*.115,.117,1.05,.016)],orange,10,10),'Chest')
   for z in [.92,1.0,1.08]:add(tube('Bodice crossed tie',[(side*.035,-.114,z,.007),(-side*.035,-.12,z+.065,.007)],red,8,6),'Spine')
   tag='L' if side<0 else 'R';add(profile('Gathered sleeve cuff '+tag,[(.72,side*wrist,-.01,.067,.066),(.76,side*wrist,-.01,.086,.083)],white,32,.003),'Forearm_'+tag)
  add(tube('Pendant cord',[(-.10,-.07,1.30,.006),(0,-.148,1.22,.006),(.10,-.07,1.30,.006)],leather,8,10),'Chest');add(sphere('Green pendant',(0,-.154,1.204),(.017,.009,.028),jade),'Chest')
 if stocky:
  add(profile('Rounded articulated breastplate',[(.81,0,0,.261,.16),(.90,0,-.003,.286,.193),(1.04,0,-.005,.301,.197),(1.19,0,0,.291,.175),(1.27,0,0,.247,.141)],steel,64,.002),'Chest')
  for z in [.83,.90]:add(profile('Waist plate lip',[(z,0,0,.272,.175),(z+.025,0,0,.273,.178)],darksteel,48),'Spine')
  add(profile('High gorget',[(1.27,0,0,.12,.105),(1.34,0,0,.113,.104)],steel,48),'Chest')
  for side in [-1,1]:
   tag='L' if side<0 else 'R'
   for i in range(3):add(sphere('Layered shoulder lames '+tag+str(i),(side*(.28+i*.035),0,1.205-i*.073),(.12,.153,.066),steel),'UpperArm_'+tag)
   add(profile('Forearm vambrace '+tag,[(.725,side*wrist,-.01,.088,.088),(.80,side*(wrist-.012),0,.094,.086),(.91,side*(shoulder+.12),0,.085,.089)],steel,32),'Forearm_'+tag)
   add(box('Hip tasset '+tag,(side*.19,-.12,.795),(.16,.06,.16),steel,.015),'Spine')
  add(tube('Chest cross belt',[(-.20,-.16,1.24,.025),(0,-.21,1.08,.025),(.23,-.17,.87,.025)],leather,10,14),'Chest')
  # Helmet is open in front; face remains visible underneath the raised visor.
  verts=[];faces=[];n=48
  for j in range(15):
   u=j/14;z=1.65+.30*u;r=.218*(1-u)**.45+.002
   for i in range(n):a=i/n*math.tau;front=max(0,-math.sin(a));verts.append((r*math.cos(a),r*math.sin(a)+.025,z+.10*front*(1-u)**2))
  for j in range(14):
   for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
  helmet=mesh('Open face steel helmet',verts,faces,steel);solid=helmet.modifiers.new('Helmet thickness','SOLIDIFY');solid.thickness=.012;apply(helmet,solid);add(helmet,'Head')
  add(tube('Helmet brow rim',[(-.22,-.08,1.76,.018),(0,-.226,1.78,.018),(.22,-.08,1.76,.018)],darksteel,12,14),'Head')
  for side in [-1,1]:add(sphere('Helmet hinge',(side*.21,-.005,1.73),(.028,.035,.036),gold),'Head');add(profile('Long sideburn',[(1.39,side*.16,.01,.027,.023),(1.49,side*.17,-.012,.034,.040),(1.68,side*.16,.0,.037,.048)],hair,24),'Head')
  for i in range(7):add(tube('Silver crest feather '+str(i),[(0,.035,1.93,.010),((i-3)*.013,.025,2.10+(i%2)*.013,.008),((i-3)*.007,.008,2.18-abs(i-3)*.013,.001)],white,8,8),'Head')
 else:
  cap=sphere('Sculpted hair cap',(0,.016,1.67),(.160,.150,.130),hair)
  # Keep the face open by deleting lower-front cap faces.
  bm=bmesh.new();bm.from_mesh(cap.data);bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.calc_center_median().y<-.05 and f.calc_center_median().z<1.685],context='FACES');bm.to_mesh(cap.data);bm.free();add(cap,'Head')
  for side in [-1,1]:
   for i in range(6):
    x=side*(.024+i*.019);start=(side*.014,-.01,1.79,.017);mid=(x,-.13,1.70,.019);end=(side*(.09+i*.013),-.137+i*.008,1.48+(i%3)*.048,.002)
    add(tube('Parted hair lock', [start,mid,end],hairlight if i%3==0 else hair,10,12),'Head')
  if name=='zidane':
   for i in range(12):
    a=i*math.tau/12;add(tube('Layered back hair',[(math.cos(a)*.11,.025+math.sin(a)*.10,1.74,.022),(math.cos(a)*.16,.035+abs(math.sin(a))*.12,1.57,.020),(math.cos(a)*.14,.065+abs(math.sin(a))*.13,1.48,.003)],hairlight if i%4==0 else hair,10,10),'Head')
   add(profile('Short blond ponytail',[(1.34,0,.15,.03,.024),(1.44,0,.17,.046,.048),(1.53,0,.14,.047,.056)],hair,32,.002),'HairTip');add(box('Ponytail tie',(0,.16,1.465),(.073,.025,.033),blue,.008),'Head')
  else:
   rows=[(.85,0,.125,.033,.038),(.95,0,.15,.067,.055),(1.13,0,.15,.14,.056),(1.35,0,.15,.165,.075),(1.56,0,.08,.164,.12),(1.71,0,.027,.12,.11)];add(profile('Long gathered hair',rows,hair,48,.003),'HairTip')
   for i in range(17):
    x=-.14+i*.0175;add(tube('Carved long hair strand',[(x,.12,1.64,.005),(x*.96,.21,1.39,.005),(x*.72,.207,1.09,.004),(x*.28,.17,.88,.001)],hairlight,6,10),'HairTip')
   add(box('Low hair ribbon',(0,.183,.952),(.125,.02,.035),blue,.008),'HairTip')
 if name!='garnet':
  for side in ([-1] if stocky else [-1,1]):
   x=side*(.30 if stocky else .20);scabbard=add(box('Sword scabbard' if stocky else 'Dagger scabbard',(x,.01,.61),(.10,.075,.59 if stocky else .39),leather,.025),'Spine');scabbard.rotation_euler.y=side*.20
   add(box('Weapon crossguard',(x,-.015,.945 if stocky else .835),(.22,.08,.03),gold,.01),'Spine');add(box('Leather grip',(x,-.01,1.025 if stocky else .91),(.051,.058,.14),leather,.014),'Spine');add(sphere('Weapon pommel',(x,-.01,1.10 if stocky else .99),(.038,.032,.032),gold),'Spine')
 # One anatomical armature; the continuous body uses Blender bone heat.
 arm=bpy.data.armatures.new(name+' skeleton');rig=bpy.data.objects.new(name+'Rig',arm);scene.collection.objects.link(rig);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT');bones={}
 def bone(n,h,t,parent=None):
  b=arm.edit_bones.new(n);b.head=h;b.tail=t
  if parent:b.parent=bones[parent]
  bones[n]=b
 bone('Root',(0,0,0),(0,0,.18));bone('Spine',(0,0,.73),(0,0,1.08),'Root');bone('Chest',(0,0,1.08),(0,0,1.33),'Spine');bone('Head',(0,0,1.32),(0,0,1.76),'Chest');bone('HairTip',(0,.12,1.5),(0,.15,1.05),'Head');bone('Tail',(0,.12,.81),(.18,.34,.55),'Root');bone('TailTip',(.25,.39,.46),(.41,.25,.67),'Tail')
 for side in [-1,1]:
  tag='L' if side<0 else 'R';bone('UpperArm_'+tag,(side*shoulder,0,1.21),(side*(shoulder+.08),0,.96),'Chest');bone('Forearm_'+tag,(side*(shoulder+.08),0,.96),(side*wrist,-.01,.74),'UpperArm_'+tag);bone('Hand_'+tag,(side*wrist,-.01,.74),(side*wrist,-.025,.615),'Forearm_'+tag);bone('Thigh_'+tag,(side*.11,0,hip),(side*.12,0,.45),'Root');bone('Shin_'+tag,(side*.12,0,.45),(side*.115,0,.12),'Thigh_'+tag);bone('Foot_'+tag,(side*.115,0,.12),(side*.115,-.145,.04),'Shin_'+tag);bone('Eye_'+tag,(side*.066*scale,-.14,1.552),(side*.066*scale,-.14,1.58),'Head')
 bpy.ops.object.mode_set(mode='OBJECT')
 for b in arm.bones:b.use_deform=not(b.name.startswith('Eye') or b.name in ['HairTip','Tail','TailTip'])
 bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.parent_set(type='ARMATURE_AUTO')
 for b in arm.bones:b.use_deform=True
 for o,label in objects:
  g=o.vertex_groups.new(name=label);g.add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Rig skin','ARMATURE');mod.object=rig;o.parent=rig
 objects.insert(0,(body,'heat'))
 for o,label in objects:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
 bpy.ops.object.select_all(action='DESELECT')
 for o,label in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=body;bpy.ops.object.join();body=bpy.context.object;body.name=name+' continuous character';objects=[(body,'all')]
 for v in body.data.vertices:
  groups=sorted(list(v.groups),key=lambda g:g.weight,reverse=True);total=sum(g.weight for g in groups[:4]);assert total>0,(name,v.index,'No skin weight')
  weights=[(g.group,g.weight/total) for g in groups[:4]]
  for index in [g.group for g in v.groups]:body.vertex_groups[index].remove([v.index])
  for index,weight in weights:body.vertex_groups[index].add([v.index],weight,'REPLACE')
 assert max(len(v.groups) for v in body.data.vertices)<=4
 for b in rig.pose.bones:b.rotation_mode='QUATERNION'
 rest={b.name:b.matrix_local.to_quaternion() for b in arm.bones}
 def rotate(n,xyz):q=Euler(xyz,'XYZ').to_quaternion();rig.pose.bones[n].rotation_quaternion=rest[n].inverted()@q@rest[n]
 def reset():
  for b in rig.pose.bones:b.location=(0,0,0);b.scale=(1,1,1);b.rotation_quaternion=(1,0,0,0)
 def pose(kind,t):
  reset();pb=rig.pose.bones;phase=t*math.tau/(1.1 if kind=='Walk' else 4);rotate('Chest',(math.sin(phase)*.011,0,math.sin(phase)*.009));rotate('Head',(0,math.sin(phase)*.024,0));rotate('HairTip',(math.sin(phase)*.015,0,math.sin(phase)*.010));rotate('Tail',(0,math.sin(phase)*.055,0));rotate('TailTip',(math.sin(phase)*.08,0,0))
  blink=max(0,1-abs((t%4)-2.7)/.08);pb['Eye_L'].scale.z=pb['Eye_R'].scale.z=1-blink*.91
  if kind=='Walk':
   for side in [-1,1]:
    tag='L' if side<0 else 'R';v=math.sin(phase+(math.pi if side<0 else 0));rotate('Thigh_'+tag,(v*.29,0,0));rotate('Shin_'+tag,(-max(0,-v)*.20,0,0));rotate('Foot_'+tag,(-v*.09,0,0));rotate('UpperArm_'+tag,(-v*.18,0,0));rotate('Forearm_'+tag,(-.05,0,0))
  elif kind in ['Greet','Signature']:
   u=max(0,min(1,t/.7,(3.3-t)/.7));angle=.78 if stocky else 1.02;rotate('UpperArm_L',(-angle*u,-.14*u,0));rotate('Forearm_L',(-.30*u,0,math.sin(t*5)*.08*u));rotate('Head',(.045*u,0,0))
   if kind=='Signature':rotate('Chest',(0,math.sin(t*1.4)*.13*u,-.03*u));rotate('UpperArm_R',(-.30*u,0,-.15*u));rotate('Forearm_R',(-.4*u,0,0))
  bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();low=min((ev.matrix_world@v.co).z for v in me.vertices);ev.to_mesh_clear()
  if low<.003:pb['Root'].location.y+=.003-low
  bpy.context.view_layer.update();return low
 rig.animation_data_create();actions=[];ground={}
 for clip,duration in [('Idle',4),('Walk',1.1),('Greet',3.3),('Signature',3.3)]:
  action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data.action=action;n=round(duration*24)+1;lows=[]
  for f in range(1,n+1):
   scene.frame_set(f);lows.append(pose(clip,(f-1)/(n-1)*duration))
   for b in rig.pose.bones:b.keyframe_insert(data_path='rotation_quaternion',frame=f);b.keyframe_insert(data_path='location',frame=f);b.keyframe_insert(data_path='scale',frame=f)
  actions.append(action);ground[clip]={'frames':n,'minimumBeforeRootCorrection':min(lows)}
 rig.animation_data.action=actions[0];scene.frame_set(1);pose('Idle',0);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'-v1.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_merge_animation='ACTION',export_skins=True,export_def_bones=True,export_force_sampling=True,export_optimize_animation_size=True,export_yup=True)
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(AUTHOR/(name+'-v1.blend')),compress=True)
 report={'character':name,'joints':len(arm.bones),'vertices':len(body.data.vertices),'faces':len(body.data.polygons),'actions':[a.name for a in actions],'maxWeightsPerVertex':max(len(v.groups) for v in body.data.vertices),'ground':ground,'binding':'continuous body bone heat; rigid sculpted costume details bound to named bones; joined mesh for draw-call economy','source':'authored Blender mesh and procedural woven material; imagegen turnaround is reference only','humanArtAcceptance':'pending'};(EVID/(name+'-build.json')).write_text(json.dumps(report,indent=2));print('ROYAL_BUILD',json.dumps(report),flush=True)
for name in ['steiner','zidane','garnet']:build(name)
