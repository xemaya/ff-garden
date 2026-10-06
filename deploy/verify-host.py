import hashlib,json,os,subprocess
from pathlib import Path
web=Path('/data/app/huanghaibin/web');base=web/'sites/ff-garden';site=base/'current'
if not site.is_symlink():raise RuntimeError('release is not active yet')
release=site.resolve().parent.name
checks=[]
def request(host,path,method='GET',scheme='https'):
 port=443 if scheme=='https' else 80
 cmd=['curl','--silent','--show-error','--max-time','25','--resolve',f'{host}:{port}:127.0.0.1','-o','/dev/null','-w','%{http_code}|%{content_type}',scheme+'://'+host+path]
 if method=='HEAD':cmd.insert(1,'--head')
 out=subprocess.check_output(cmd,text=True).split('|');return {'host':host,'path':path,'status':int(out[0]),'type':out[1]}
for p in ['/', '/?district=royal', '/theater.html', '/theater.html?ship=1', '/?street=residential','/?street=market','/?street=workshops&cast=1','/moogle.html','/mage.html','/chocobo.html','/data/v4/manifest.json']:
 r=request('ff.buplayground.cn',p);assert r['status']==200,r;checks.append(r)
for path in ['assets/theater/poster.svg','assets/theater/ticket.svg','assets/v3/plaster.png','assets/characters/moogle/moogle-courier-v3.glb','assets/characters/mage/black-mage-v2.glb','assets/characters/chocobo/chocobo-v1.glb']:
 r=request('ff.buplayground.cn','/'+path,'HEAD');assert r['status']==200,r;assert 'text/html' not in r['type'],r;checks.append(r)
assets={p:hashlib.sha256((site/p).read_bytes()).hexdigest() for p in ['assets/characters/moogle/moogle-courier-v3.glb','assets/characters/mage/black-mage-v2.glb','assets/characters/chocobo/chocobo-v1.glb']}
for p in ['/_not_a_real_asset_.png','/authoring/characters/moogle/moogle-courier-v3.blend']:
 r=request('ff.buplayground.cn',p);assert r['status']==404,r;checks.append(r)
r=request('ff.buplayground.cn','/.env');assert r['status'] in [403,404],r;checks.append(r)
r=request('ff.buplayground.cn','/',scheme='http');assert r['status']==301,r;checks.append(r)
for host in ['ai.buplayground.cn','files.buplayground.cn','director.buplayground.cn']:
 r=request(host,'/');assert r['status']==302,r;checks.append(r)
before=(base/'backups'/release/'nginx-before.conf').read_bytes()
current=(web/'conf/nginx.conf').read_bytes()
include=b'  include /data/app/huanghaibin/web/conf/sites/ff-garden.conf;\n'
assert (current==before if include in before else current.replace(include,b'')==before),'unrelated shared nginx edits'
assert '127.0.0.1:5207' not in (site/'index.html').read_text(),'production contains localhost link'
plan=json.loads((site.resolve().parent/'release-manifest.json').read_text())
for name,sha in plan['files'].items():assert hashlib.sha256((site/name).read_bytes()).hexdigest()==sha,name+' hash mismatch'
cron=subprocess.run(['crontab','-l'],text=True,capture_output=True).stdout
print(json.dumps({'passed':True,'release':release,'url':'https://ff.buplayground.cn','checks':checks,'servedModelHashes':assets,'sharedNginxOnlyAddedFFInclude':True,'sharedAppsPreserved':True,'existingRenewCronCoversCertificate':'web.sh renew' in cron},indent=2))
