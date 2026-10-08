"""Dedicated Steiner reconstruction from the official Bring Arts silhouette.
No generated face atlas: sculpted planes, eyes, lips and costume surfaces.
Build is a review sample, never an implicit human art acceptance.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
# Transport each tube frame continuously. Switching the reference axis mid-curve
# twisted shoulder rims and produced tiny folded triangles at the bend.
helpers=(ROOT/'tools/build-royal-cast.py').read_text().split('def build(name):')[0]
helpers=helpers.replace('verts=[];faces=[];p=[Vector(v[:3]) for v in points]', 'verts=[];faces=[];p=[Vector(v[:3]) for v in points];previous_x=None')
helpers=helpers.replace('xx=tangent.cross(cross).normalized();yy=tangent.cross(xx).normalized()', 'xx=tangent.cross(cross).normalized() if previous_x is None else (previous_x-tangent*previous_x.dot(tangent)).normalized();yy=tangent.cross(xx).normalized();previous_x=xx.copy()')
exec(helpers)
EVID=ROOT/'evidence/steiner-v4';EVID.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=24
for action in list(bpy.data.actions):bpy.data.actions.remove(action)
skin=material('Steiner v4 ochre skin','#bc9475');skin.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.66;skinshadow=material('Steiner v4 skin crease','#a37e63');steel=material('Steiner v4 pewter','#9ba5ab',.48);edge=material('Steiner v4 worn rims','#cad1cf',.40);seam=material('Steiner v4 steel recess','#4b555a',.25);cloth=material('Steiner v4 charcoal wool','#33383e',cloth=True);linen=material('Steiner v4 rolled linen','#a8ab8b',cloth=True);leather=material('Steiner v4 tooled leather','#674a40');stitch=material('Steiner v4 leather carving','#ab8b69');hair=material('Steiner v4 dark bob','#303131');hairlight=material('Steiner v4 carved locks','#474a48');ivory=material('Steiner v4 eye white','#dedfd3');ink=material('Steiner v4 ink','#24262b');iris=material('Steiner v4 iris','#5a636c');lips=material('Steiner v4 mouth','#7c5745');objects=[]
def add(o,b='Chest'):objects.append((o,b));return o
def smooth(o,levels=1):
 mod=o.modifiers.new('Sculpted surface','SUBSURF');mod.levels=levels;apply(o,mod);return o
def strip(name,rows,mat,b='Chest',half=1.20,n=32):
 # open curved armour patch; the back and underarm remain open.
 verts=[];faces=[]
 for z,x,y,rx,ry in rows:
  for j in range(n+1):a=-half+2*half*j/n;verts.append((x+rx*math.sin(a),y-ry*math.cos(a),z))
 for i in range(len(rows)-1):
  for j in range(n):k=i*(n+1)+j;faces.append((k,k+1,k+n+2,k+n+1))
 o=mesh(name,verts,faces,mat);o=smooth(o);mod=o.modifiers.new('Forged thickness','SOLIDIFY');mod.thickness=.008;apply(o,mod);return add(o,b)
# Stocky pear-shaped cuirass and short trousers, each authored for this body.
add(smooth(profile('Rounded short wool torso',[(.65,0,0,.20,.105),(.81,0,.0,.23,.13),(1.05,0,.025,.27,.15),(1.19,0,.025,.245,.125),(1.28,0,.035,.16,.10)],cloth,48,.004)),'Spine')
add(smooth(profile('Faceted domed breastplate',[(.80,0,-.018,.235,.155),(.86,0,-.03,.255,.183),(1.015,0,-.025,.292,.210),(1.20,0,.025,.303,.182),(1.245,0,.035,.225,.131)],steel,48)),'Chest')
# centre ridge and broad belly lames, following torso rather than cylinder overlays.
add(tube('Breastplate central ridge',[(0,-.148,1.24,.006),(0,-.209,1.16,.006),(0,-.24,1.00,.005),(0,-.217,.88,.004)],edge,8,12),'Chest')
for z,rx,ry in [(.875,.261,.183),(.807,.25,.17),(.75,.225,.158)]:
 strip('Overlapping waist lame',[(z-.045,0,-.009,rx,ry),(z+.02,0,-.018,rx+.010,ry+.006)],steel,'Spine',half=math.pi,n=48)
 add(tube('Waist rolled lip',[(math.sin(a)*rx,-.009-math.cos(a)*ry,z-.045,.005) for a in [j*math.tau/24 for j in range(25)]],edge,8,2),'Spine')
add(profile('High open gorget',[(1.15,0,.02,.148,.105),(1.205,0,.018,.155,.118),(1.235,0,.015,.16,.12)],linen,48),'Chest')
for s in [-1,1]:
 add(tube('Gorget dark slot',[(s*.025,-.114,1.206,.009),(s*.080,-.107,1.222,.009),(s*.115,-.089,1.218,.005)],seam,10,8),'Chest')
# Jaw/chin form, using squared cross-sections and an integrated projecting nose.
rows=[(1.225,.080,.074),(1.245,.102,.086),(1.28,.117,.096),(1.36,.134,.102),(1.48,.153,.125),(1.57,.147,.123),(1.635,.128,.103),(1.69,.071,.061),(1.704,.009,.010)]
# Extra rings sample the continuous cheek and lip relief rather than skipping it.
base_rows=list(rows);detail_heights=[1.302,1.309,1.314,1.32,1.328,1.335,1.343,1.354,1.425,1.44,1.453,1.465,1.50,1.535,1.548]
rows=[]
for z in sorted(set([r[0] for r in base_rows]+detail_heights)):
 for j in range(len(base_rows)-1):
  if base_rows[j][0]<=z<=base_rows[j+1][0]:break
 a,rx0,ry0=base_rows[j];b,rx1,ry1=base_rows[j+1];u=max(0,min(1,(z-a)/(b-a)));rows.append((z,rx0+(rx1-rx0)*u,ry0+(ry1-ry0)*u))
def front_relief(x,z):
 cheek=.008*sum(math.exp(-((x-side*.098)/.045)**2-((z-1.455)/.036)**2) for side in [-1,1])
 lip=(.0035*math.exp(-((z-1.335)/.007)**2)+.004*math.exp(-((z-1.314)/.010)**2))*math.exp(-(x/.064)**4)
 return cheek+lip
def face_y(x,z):
 for i in range(len(rows)-1):
  if rows[i][0]<=z<=rows[i+1][0]:break
 z0,rx0,ry0=rows[i];z1,rx1,ry1=rows[i+1];u=max(0,min(1,(z-z0)/(z1-z0)));rx=rx0+(rx1-rx0)*u;ry=ry0+(ry1-ry0)*u
 co=min(1,(abs(x)/rx)**(1/.90));sn=math.sqrt(max(0,1-co*co));cy=.005-.016*max(0,(1.42-z)/.195)
 return cy-ry*sn**.91-front_relief(x,z)*sn*sn
verts=[];faces=[];n=64
for z,rx,ry in rows:
 for j in range(n):
  a=j*math.tau/n;c=math.cos(a);sn=math.sin(a);cy=.005-.016*max(0,(1.42-z)/.195);x=rx*math.copysign(abs(c)**.90,c);y=cy+ry*math.copysign(abs(sn)**.91,sn)
  if sn<0:y-=front_relief(x,z)*sn*sn
  verts.append((x,y,z))
for i in range(len(rows)-1):
 for j in range(n):k=i*n+j;faces.append((k,i*n+(j+1)%n,(i+1)*n+(j+1)%n,k+n))
faces += [tuple(range(n-1,-1,-1)),tuple(range((len(rows)-1)*n,len(rows)*n))]
head=smooth(mesh('Long square jaw planes',verts,faces,skin),2)
nose=profile('Broad squared nose',[(1.391,0,-.125,.028,.023),(1.412,0,-.141,.037,.031),(1.443,0,-.132,.029,.033),(1.50,0,-.117,.019,.016),(1.543,0,-.109,.015,.010)],skin,32)
head=union([head,nose],'Steiner sculpted head',.0028,18500)
def eye_surface(o,side,cx):
 for v in o.data.vertices:v.co.y+=side*.38*(v.co.x-cx)
 o.data.update();return o
for side in [-1,1]:
 cx=side*.063;eye_y=face_y(cx,1.514)-.001
 cutter=eye_surface(sphere('Eye socket cutter',(cx,eye_y-.002,1.513),(.037,.025,.025),skin),side,cx)
 mod=head.modifiers.new('Inset orbital socket','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;apply(head,mod);bpy.data.objects.remove(cutter,do_unlink=True)
add(head,'Head')
from mathutils.bvhtree import BVHTree
bpy.context.view_layer.update();head_surface=BVHTree.FromObject(head,bpy.context.evaluated_depsgraph_get())
def skin_y(x,z):
 hit,normal,index,distance=head_surface.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
 return hit.y if hit is not None else face_y(x,z)
# Cut the upper eyeball to an angled lid line: stern rather than startled.
def eye_cut(o,s,x):
 bm=bmesh.new();bm.from_mesh(o.data)
 cut=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(x,0,1.520),plane_no=(-s*.18,0,1),clear_outer=True)
 boundary=[e for e in cut['geom_cut'] if isinstance(e,bmesh.types.BMEdge) and e.is_boundary]
 if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();return o
# Embedded eyes, upper lids and brows, no portrait pasted on the face.
for s in [-1,1]:
 x=s*.063;ey=face_y(x,1.514)-.001;tag='Eye_'+('L' if s<0 else 'R')
 add(eye_surface(sphere('Inset eye socket',(x,ey+.008,1.513),(.034,.019,.022),skinshadow),s,x),'Head')
 add(eye_cut(eye_surface(sphere('Ivory eye',(x,ey,1.514),(.031,.010,.016),ivory),s,x),s,x),tag)
 add(eye_cut(eye_surface(sphere('Steel blue iris',(x-s*.002,ey-.011,1.516),(.0115,.003,.013),iris),s,x),s,x),tag)
 add(eye_cut(eye_surface(sphere('Pupil',(x-s*.002,ey-.014,1.516),(.007,.0018,.0095),ink),s,x),s,x),tag)
 add(eye_surface(sphere('Eye highlight',(x-.0035,ey-.016,1.520),(.002,.0012,.0025),ivory),s,x),tag)
 brow=[(s*.030,1.534,.006),(s*.064,1.546,.007),(s*.106,1.547,.0035)]
 add(tube('Embedded stern brow',[(xx,skin_y(xx,zz)+.002,zz,r) for xx,zz,r in brow],hair,12,14,flatten=.60),'Head')
 for name,points in [('Upper eyelid',[(s*.033,1.514,.003),(s*.063,1.52,.003),(s*.096,1.526,.002)]),('Lower eyelid',[(s*.034,1.505,.0018),(s*.063,1.499,.002),(s*.094,1.505,.0015)])]:
  add(tube(name,[(xx,ey+s*.38*(xx-x)-.008,zz,r) for xx,zz,r in points],skin,10,10),'Head')
 add(sphere('Nostril',(s*.026,-.166,1.408),(.007,.003,.004),skinshadow),'Head')
 add(sphere('Ear',(s*.163,.006,1.466),(.024,.031,.053),skin),'Head')
 furrow=[(s*.012,1.535,.0009),(s*.016,1.553,.0009),(s*.022,1.56,.0005)]
 add(tube('Subtle brow furrow',[(xx,skin_y(xx,zz)-.0005,zz,r) for xx,zz,r in furrow],skinshadow,6,8),'Head')
mouth=[]
for i in range(25):
 x=-.067+i*.134/24;z=1.328-.006*(abs(x)/.067)**1.5;mouth.append((x,skin_y(x,z)-.0008,z,.0012))
add(tube('Embedded mouth seam',mouth,lips,10,2),'Head')
# Solid bob shape with carved sideburns, not floating hair strands.
for s in [-1,1]:
 add(smooth(profile('Squared jaw-length bob',[(1.26,s*.121,.035,.029,.043),(1.31,s*.145,.03,.035,.058),(1.47,s*.165,.034,.039,.070),(1.65,s*.142,.038,.050,.079)],hair,32)),'Head')
 for i in range(5):
  y=-.024+i*.025;add(tube('Bob carved groove',[(s*.180,y,1.59,.002),(s*.193,y,1.44,.002),(s*.14,y+.010,1.275,.0008)],hairlight,6,12),'Head')
add(smooth(profile('Back hair',[(1.27,0,.10,.135,.063),(1.44,0,.09,.185,.092),(1.63,0,.038,.178,.129),(1.70,0,.02,.10,.08)],hair,40)),'Head')
# Steiner's iconic tall pointed sallet, broad bent brim, central ridge and feather.
add(smooth(profile('Pointed sallet dome',[(1.63,0,.016,.245,.219),(1.73,0,.023,.214,.194),(1.86,0,.025,.134,.128),(1.99,0,.028,.076,.074),(2.065,0,.028,.052,.049),(2.083,0,.028,.019,.024)],steel,48)),'Head')
vv=[];ff=[];n=64
for k in range(7):
 u=k/6;rx=.205+.118*u;ry=.18+.108*u
 for j in range(n):
  a=j*math.tau/n;z=1.734-.122*u+.035*math.cos(a)**2*u-.012*math.sin(a)*u
  vv.append((rx*math.cos(a),.02+ry*math.sin(a),z))
for k in range(6):
 for j in range(n):a=k*n+j;ff.append((a,k*n+(j+1)%n,(k+1)*n+(j+1)%n,a+n))
brim=mesh('Swept wide helmet brim',vv,ff,steel);mod=brim.modifiers.new('Brim thickness','SOLIDIFY');mod.thickness=.012;apply(brim,mod);add(brim,'Head')
add(tube('Helmet perimeter roll',[(.323*math.cos(a),.02+.288*math.sin(a),1.612+.035*math.cos(a)**2-.012*math.sin(a),.005) for a in [j*math.tau/64 for j in range(65)]],edge,8,3),'Head')
add(tube('Sallet front centre crest',[(0,-.264,1.626,.015),(0,-.17,1.775,.012),(0,-.105,1.91,.010),(0,-.023,2.08,.013)],edge,12,12),'Head')
for z,rx,ry in [(1.735,.217,.195),(1.79,.18,.171)]:
 add(tube('Raised sallet arc',[(rx*math.sin(a),.02-ry*math.cos(a),z+.010*math.cos(a),.004) for a in [-1.3+j*2.6/24 for j in range(25)]],seam,8,5),'Head')
# Short swept feather: curved rachis, broad asymmetric vane and fine barbs.
feather_mat=material('Steiner v4 silver feather','#d2d5cb');feather_vein=material('Steiner v4 feather veins','#aeb9b2')
def feather_point(u):return Vector((.075+.30*u**1.5,.055+.10*u*u,1.91+.47*u-.04*u*u*u))
def feather_normal(u):
 base=Vector((-(.47-.12*u*u),0,.45*math.sqrt(max(.001,u)))).normalized();angle=.20+.80*u
 return base*math.cos(angle)+Vector((0,1,0))*math.sin(angle)
def feather_width(u):return .052*math.sin(math.pi*max(0,min(1,(u-.12)/.88)))**.78 if u>.12 else 0
add(sphere('Feather socket',(.075,.056,1.914),(.013,.013,.027),steel),'Head')
add(tube('Curved feather rachis',[(*feather_point(u),.0035*(1-u)+.0008) for u in [i/8 for i in range(9)]],feather_vein,10,8),'Head')
vv=[];ff=[]
for i in range(49):
 u=.12+.88*i/48;p=feather_point(u);normal=feather_normal(u);w=feather_width(u)
 for j in range(5):
  v=(j-2)/2;offset=w*v*(.88 if v<0 else 1.10);pos=p+normal*offset;pos.y-=.007*(1-v*v);vv.append(pos)
for i in range(48):
 for j in range(4):k=i*5+j;ff.append((k,k+1,k+6,k+5))
feather=smooth(mesh('Curved asymmetric feather vane',vv,ff,feather_mat));mod=feather.modifiers.new('Thin feather volume','SOLIDIFY');mod.thickness=.0035;apply(feather,mod);add(feather,'Head')
for side in [-1,1]:
 for i in range(13):
  u=.22+i*.055;p=feather_point(u-.039);end=feather_point(u)+feather_normal(u)*feather_width(u)*side*(.84 if side<0 else 1.06);p.y-=.010;end.y-=.003
  mid=p.lerp(end,.56);mid.y-=.002;add(tube('Fine feather barb',[(*p,.0010),(*mid,.0010),(*end,.0006)],feather_vein,6,5),'Head')
# Articulated limbs: chainmail short sleeve -> exposed elbow -> wide gauntlet.
for s in [-1,1]:
 tag='L' if s<0 else 'R';upper='UpperArm_'+tag;fore='Forearm_'+tag;hand='Hand_'+tag;thigh='Thigh_'+tag;shin='Shin_'+tag;foot='Foot_'+tag
 add(smooth(profile('Puffed charcoal short trouser',[(.375,s*.145,.003,.100,.11),(.49,s*.145,.012,.12,.128),(.64,s*.143,.028,.125,.131),(.775,s*.115,.035,.135,.134)],cloth,40,.006)),thigh)
 add(smooth(profile('Folded olive trouser hem',[(.355,s*.145,.01,.105,.113),(.383,s*.145,.009,.117,.128),(.442,s*.145,.009,.115,.125),(.465,s*.145,.01,.108,.117)],linen,40,.003)),shin)
 add(profile('Bare lower ankle',[(.13,s*.145,.014,.073,.075),(.34,s*.145,.014,.073,.075),(.375,s*.145,.014,.075,.070)],skin,32),shin)
 # pointed sabatons instead of spherical boots.
 vv=[];ff=[];rings=[(.095,.14,.108),(-.01,.17,.117),(-.14,.148,.097),(-.28,.078,.047),(-.36,.025,.002)]
 for y,h,w in rings:
  for j in range(16):a=math.pi*j/15;vv.append((s*.145+w*math.cos(a),y,.015+h*math.sin(a)))
 for i in range(len(rings)-1):
  for j in range(15):k=i*16+j;ff.append((k,k+1,k+17,k+16))
 ff.extend([tuple(range(15,-1,-1)),tuple(range(64,80))]);o=mesh('Pointed articulated sabaton',vv,ff,steel);mod=o.modifiers.new('Shoe shell','SOLIDIFY');mod.thickness=.007;apply(o,mod);add(o,foot)
 for y in [-.04,-.105,-.173]:
  add(tube('Sabatons overlapping ribs',[(s*.145-.098,y,.057,.008),(s*.145,y-.006,.186-(abs(y)*.36),.008),(s*.145+.098,y,.057,.008)],steel,12,10),foot)
 add(smooth(profile('Sabatons wrapped heel quarter',[(.092,s*.145,.028,.117,.114),(.158,s*.145,.026,.105,.100),(.238,s*.145,.019,.088,.089),(.285,s*.145,.016,.086,.087)],steel,40)),foot)
 add(tube('Ankle armour rim',[(s*.145+.086*math.cos(a),.016+.087*math.sin(a),.285,.004) for a in [j*math.tau/32 for j in range(33)]],edge,8,3),foot)
 # asymmetric curved shoulder shell and a short mail sleeve.
 add(smooth(profile('Short chainmail sleeve',[(.955,s*.432,.018,.101,.103),(1.07,s*.383,.018,.111,.113),(1.19,s*.30,.023,.095,.10)],seam,32)),upper)
 # Fine interlinked mail rings over visible sleeve rather than dotted spheres.
 for row in range(3):
  z=.983+row*.024;cx=s*(.432-(z-.955)*.455);r=.103+(z-.955)*.03
  for j in range(18):
   a=j*math.tau/18+(row%2)*.17;y=.018+r*math.sin(a);x=cx+r*math.cos(a)
   add(tube('Linked mail ring',[(x-math.sin(a)*.018*math.cos(b),y+math.cos(a)*.018*math.cos(b),z+.011*math.sin(b),.0016) for b in [k*math.tau/8 for k in range(9)]],steel,6,2),upper)
 # a single raised flaring pauldron, clearly separated from the upper arm.
 vv=[];ff=[]
 for j in range(9):
  u=j/8;x=s*(.205+.23*u);height=1.28-.18*u;ry=.127+.02*u
  for k in range(25):a=-2.05+k*4.10/24;vv.append((x,.022+ry*math.sin(a),height+.085*math.cos(a)))
 for j in range(8):
  for k in range(24):a=j*25+k;ff.append((a,a+1,a+26,a+25))
 o=smooth(mesh('Broad swept pauldron',vv,ff,steel));mod=o.modifiers.new('Pauldron forged thickness','SOLIDIFY');mod.thickness=.011;apply(o,mod);add(o,upper)
 for u in [0,1]:
  x=s*(.205+.23*u);h=1.28-.18*u;ry=.127+.02*u;add(tube('Pauldron rolled rim',[(x,.022+ry*math.sin(a),h+.085*math.cos(a),.006) for a in [-2.05+k*4.10/24 for k in range(25)]],edge,8,4),upper)
 add(smooth(profile('Exposed upper arm',[(.90,s*.462,.005,.074,.078),(1.02,s*.407,.015,.085,.082)],skin,32)),upper)
 add(sphere('Exposed elbow',(s*.46,.005,.931),(.079,.076,.10),skin),fore)
 add(smooth(profile('Forearm under armour',[(.67,s*.506,-.008,.067,.066),(.77,s*.501,.01,.071,.07),(.92,s*.46,.005,.075,.073)],skin,32)),fore)
 add(smooth(profile('Wide flared gauntlet cuff',[(.642,s*.511,-.008,.091,.094),(.705,s*.501,-.001,.093,.098),(.834,s*.484,.008,.109,.111),(.886,s*.474,.012,.111,.112)],edge,40)),fore)
 add(tube('Gauntlet rim',[(s*.474+.111*math.cos(a),.012+.112*math.sin(a),.886,.006) for a in [j*math.tau/32 for j in range(33)]],steel,8,3),fore)
 for j in range(5):
  a=-1.1+j*.55;add(sphere('Gauntlet rivet',(s*.481+.111*math.sin(a),.008-.114*math.cos(a),.842),(.008,.007,.008),seam),fore)
 palm=sphere('Large closed gauntlet',(s*.516,-.018,.591),(.098,.097,.103),edge)
 fingers=[]
 for i in range(4):fingers.append(sphere('Curled knuckle',(s*(.455+i*.04),-.098,.585),(.026,.029,.047),edge))
 fingers.append(sphere('Folded thumb',(s*.435,-.048,.615),(.034,.051,.051),edge));add(union([palm]+fingers,'Continuous clenched gauntlet',.0045,6000),hand)
 for i in range(3):
  x=s*(.475+i*.04);add(tube('Finger seam',[(x,-.120,.607,.002),(x,-.125,.575,.002),(x,-.103,.55,.001)],steel,6,6),hand)
 # Two flared tassets at each hip, riveted and layered, not generic belt boxes.
 for j in range(3):
  plate_bone='Spine' if j==0 else thigh;z=.66-j*.094;x=s*(.154+j*.001);rx=.140+j*.006
  strip('Layered hip tasset',[(z-.077,x,-.015,rx,.165),(z+.059,x,-.018,rx-.007,.159)],steel,plate_bone,half=1.90,n=36)
  add(tube('Tasset bottom rim',[(x+rx*math.sin(a),-.015-.165*math.cos(a),z-.077,.005) for a in [-1.90+k*3.80/32 for k in range(33)]],edge,8,4),plate_bone)
  for q in [-1,1]:add(sphere('Tasset rivet',(x+q*.09,-.152,z+.03),(.008,.005,.008),seam),plate_bone)
 for z in [.55,.46]:
  strip('Rear thigh guard retaining strap',[(z-.009,s*.145,.011,.132,-.141),(z+.009,s*.145,.011,.132,-.141)],leather,thigh,half=1.90,n=28)
# diagonal broad sword baldric follows the front and back cuirass.
def baldric(front=True):
 vv=[];ff=[]
 for i in range(31):
  u=i/30;x=-.24+.51*u;z=1.274-.439*u;rx=.28;ry=.215;y=(-1 if front else 1)*(ry*math.sqrt(max(.20,1-(x/rx)**2))+.017)
  for s in [-1,1]:vv.append((x+s*.032,y,z+s*.027))
 for i in range(30):k=i*2;ff.append((k,k+1,k+3,k+2))
 o=mesh('Broad leather baldric',vv,ff,leather);mod=o.modifiers.new('Baldric thickness','SOLIDIFY');mod.thickness=.009;apply(o,mod);add(o,'Chest')
 if front:
  for s in [-1,1]:
   points=[]
   for i in range(31):
    u=i/30;x=-.24+.51*u;z=1.274-.439*u;y=-(.215*math.sqrt(max(.2,1-(x/.28)**2))+.026);points.append((x+s*.025,y,z+s*.021,.0017))
   add(tube('Baldric stitched border',points,stitch,6,2),'Chest')
  for i in range(18):
   u=.05+i*.05;x=-.24+.51*u;z=1.274-.439*u;y=-(.215*math.sqrt(max(.2,1-(x/.28)**2))+.026)
   add(tube('Tooled interlaced leather',[(x-.016,y,z-.01,.0025),(x+.013,y-.002,z-.003,.0025),(x+.006,y,z+.016,.0025)],stitch,6,5),'Chest')
baldric();baldric(False)
for z,x in [(1.17,-.115),(1.095,-.032)]:
 y=-(.215*math.sqrt(1-(x/.28)**2)+.033);add(tube('Square baldric buckle',[(x-.039,y,z+.034,.008),(x+.033,y,z+.050,.008),(x+.046,y,z-.02,.008),(x-.029,y,z-.04,.008),(x-.039,y,z+.034,.008)],edge,12,5),'Chest')
# sword on the back rises over left shoulder, with an elaborate cup guard.
add(tube('Back sword scabbard',[(.26,.19,.37,.051),(0,.245,.87,.050),(-.24,.225,1.39,.055)],leather,12,14,flatten=.45),'Chest')
add(tube('Sword steel hilt',[(-.24,.225,1.39,.027),(-.30,.22,1.54,.022),(-.40,.20,1.75,.025)],leather,12,12),'Chest')
add(sphere('Sword pommel',(-.413,.20,1.78),(.037,.035,.026),steel),'Chest')
add(tube('Swept sword knuckle guard',[(-.245,.22,1.40,.01),(-.23,.24,1.66,.009),(-.37,.20,1.75,.009)],steel,12,14),'Chest')
add(sphere('Cup sword guard',(-.245,.23,1.425),(.129,.075,.044),steel),'Chest')
for i in range(9):
 u=i/8;add(tube('Grip leather wrap',[(-.305-.09*u,.196,1.56+.19*u,.002),(-.28-.09*u,.196,1.55+.19*u,.002)],stitch,6,4),'Chest')
# Unified proportion pass: the face, hair, helmet and feather share the same pivot.
def v3_head(v):return Vector((v[0]*.87,.012+(v[1]-.012)*.90,1.285+(v[2]-1.245)*.87))
def head_form(v):
 q=v3_head(v);return Vector((q.x*.88*.86,.012+(q.y-.012)*.88*.90,1.27+(q.z-1.27)*.88*.85))
def helmet_form(v):
 q=v3_head(v);return Vector((q.x*.88*.90,.012+(q.y-.012)*.88*.92,1.27+(q.z-1.27)*.88-.045))
def body_form(v):return Vector((v[0]*1.09,v[1]*1.06,.74+(v[2]-.74)*1.08 if v[2]>.74 else v[2]))
helmet_prefixes=('Pointed sallet','Swept wide helmet','Helmet perimeter','Sallet front','Raised sallet','Feather socket','Curved feather','Curved asymmetric feather','Fine feather')
for o,label in objects:
 form=helmet_form if o.name.startswith(helmet_prefixes) else head_form if label=='Head' or label.startswith('Eye_') else body_form
 for v in o.data.vertices:v.co=form(v.co)
 o.data.update()
# A dedicated skeleton matches short limbs and the larger head; armour is rigid.
bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='Steiner v4 rig';arm=rig.data;bpy.ops.object.mode_set(mode='EDIT');arm.edit_bones.remove(arm.edit_bones[0])
def bone(n,a,b,parent=None):
 form=head_form if n in ['Head','HairTip'] or n.startswith('Eye_') else body_form
 q=arm.edit_bones.new(n);q.head=form(a);q.tail=form(b)
 if parent:q.parent=arm.edit_bones[parent]
bone('Root',(0,0,.69),(0,0,.79));bone('Spine',(0,0,.75),(0,0,1.04),'Root');bone('Chest',(0,0,1.02),(0,0,1.26),'Spine');bone('Head',(0,.012,1.265),(0,.012,1.65),'Chest');bone('HairTip',(0,.10,1.50),(0,.10,1.28),'Head');bone('Tail',(0,.1,.73),(0,.1,.75),'Root');bone('TailTip',(0,.1,.75),(0,.1,.77),'Tail')
for s in [-1,1]:
 t='L' if s<0 else 'R';bone('UpperArm_'+t,(s*.30,.02,1.25),(s*.46,.005,.93),'Chest');bone('Forearm_'+t,(s*.46,.005,.93),(s*.51,-.008,.655),'UpperArm_'+t);bone('Hand_'+t,(s*.51,-.008,.655),(s*.516,-.018,.55),'Forearm_'+t);bone('Thigh_'+t,(s*.145,.02,.73),(s*.145,.01,.46),'Root');bone('Shin_'+t,(s*.145,.01,.46),(s*.145,.014,.16),'Thigh_'+t);bone('Foot_'+t,(s*.145,.014,.16),(s*.145,-.24,.04),'Shin_'+t);bone('Eye_'+t,(s*.063,face_y(s*.063,1.514)-.001,1.515),(s*.063,face_y(s*.063,1.514)-.001,1.548),'Head')
bpy.ops.object.mode_set(mode='OBJECT')
for o,label in objects:
 g=o.vertex_groups.new(name=label);g.add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Rig skin','ARMATURE');mod.object=rig;o.parent=rig
 # Export a UV layer even though colours are geometry-native except wool/linen.
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
for o,b in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0][0];bpy.ops.object.join();body=bpy.context.object;body.name='Dedicated Steiner sculpt'
for b in rig.pose.bones:b.rotation_mode='QUATERNION'
rest={b.name:b.matrix_local.to_quaternion() for b in arm.bones}
def rotate(n,xyz):q=Euler(xyz,'XYZ').to_quaternion();rig.pose.bones[n].rotation_quaternion=rest[n].inverted()@q@rest[n]
def pose(clip,t):
 pb=rig.pose.bones
 for b in pb:b.location=(0,0,0);b.scale=(1,1,1);b.rotation_quaternion=(1,0,0,0)
 ph=t*math.tau/(1.2 if clip=='Walk' else 4);rotate('Chest',(math.sin(ph)*.009,0,math.sin(ph)*.005));rotate('Head',(0,math.sin(ph)*.016,0))
 if clip=='Walk':
  for s in [-1,1]:
   tag='L' if s<0 else 'R';v=math.sin(ph+(math.pi if s<0 else 0));rotate('Thigh_'+tag,(v*.22,0,0));rotate('Shin_'+tag,(-max(0,-v)*.17,0,0));rotate('Foot_'+tag,(-v*.06,0,0));rotate('UpperArm_'+tag,(-v*.12,0,0))
 elif clip in ['Greet','Signature']:
  u=max(0,min(1,t/.8,(3.4-t)/.8));rotate('UpperArm_R',(-.62*u,0,-.12*u));rotate('Forearm_R',(-.48*u,0,0));rotate('Head',(.028*u,0,0))
  if clip=='Signature':rotate('Chest',(0,math.sin(t*1.2)*.08*u,0));rotate('Head',(0,-.17*u,0))
 bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();low=min((ev.matrix_world@v.co).z for v in me.vertices);ev.to_mesh_clear();pb['Root'].location.y=max(0,.003-low);bpy.context.view_layer.update()
actions=[]
rig.animation_data_create()
for name,duration in [('Idle',4),('Walk',1.2),('Greet',3.4),('Signature',3.4)]:
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;actions.append(action);frames=round(duration*24)+1
 for f in range(1,frames+1):
  scene.frame_set(f);pose(name,(f-1)/(frames-1)*duration)
  for b in rig.pose.bones:b.keyframe_insert(data_path='rotation_quaternion',frame=f);b.keyframe_insert(data_path='location',frame=f);b.keyframe_insert(data_path='scale',frame=f)
rig.animation_data.action=actions[0];scene.frame_set(1);pose('Idle',0);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'steiner-v4.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_merge_animation='ACTION',export_skins=True,export_def_bones=True,export_force_sampling=True,export_optimize_animation_size=True,export_yup=True)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(AUTHOR/'steiner-v4.blend'),compress=True)
(EVID/'build.json').write_text(json.dumps({'character':'steiner','version':4,'artAcceptance':'pending user review; v1 rejected','reference':'https://na.finalfantasy.com/news/1130','geometry':'face rebuilt with tapered jaw, cheekbones, narrow eyes and sculpted lips; face about 25 percent smaller than v3; helmet fitted closer; v3 body retained; no face atlas','vertices':len(body.data.vertices),'faces':len(body.data.polygons),'joints':len(arm.bones),'actions':[a.name for a in actions]},indent=2)+'\n')
print('STEINER_V4_COMPLETE',len(body.data.vertices),len(body.data.polygons),flush=True)
