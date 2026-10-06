"""Run on the existing web host via publish.py. Own only ff-garden paths."""
import datetime, fcntl, hashlib, io, json, os, re, subprocess, sys, tarfile
from pathlib import Path
WEB=Path('/data/app/huanghaibin/web')
BASE=WEB/'sites/ff-garden'
CONFIG=WEB/'conf/nginx.conf'
SNIPPET=WEB/'conf/sites/ff-garden.conf'
INCLUDE=f'  include {SNIPPET};'
NGINX=['/home/huanghaibin/envs/web/bin/nginx','-p',str(WEB),'-e',str(WEB/'logs/error.log'),'-c',str(CONFIG)]
release,expected=sys.argv[1:3]
if not re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{7,40}',release): raise ValueError('invalid release name')
if not re.fullmatch(r'[a-f0-9]{64}',expected): raise ValueError('invalid archive checksum')
if not (WEB/'letsencrypt/live/ff.buplayground.cn/fullchain.pem').is_file(): raise RuntimeError('provision the independent ff certificate first')
BASE.mkdir(parents=True,exist_ok=True)
with (BASE/'deploy.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX)
 payload=sys.stdin.buffer.read(160*1024*1024)
 if hashlib.sha256(payload).hexdigest()!=expected: raise ValueError('upload checksum mismatch')
 archive=tarfile.open(fileobj=io.BytesIO(payload),mode='r:gz')
 members=archive.getmembers()
 for m in members:
  p=Path(m.name)
  if p.is_absolute() or '..' in p.parts or not (m.isfile() or m.isdir()): raise ValueError('invalid archive path/type')
 target=BASE/'releases'/release
 if target.exists(): raise RuntimeError('release already exists; refusing overwrite')
 target.mkdir(parents=True)
 for m in members:
  p=target/m.name
  if m.isdir(): p.mkdir(parents=True,exist_ok=True);os.chmod(p,0o755)
  else:
   p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(archive.extractfile(m).read());os.chmod(p,0o644)
 site=target/'site'
 manifest=target/'release-manifest.json'
 if manifest.exists():
  plan=json.loads(manifest.read_text());base_release=plan['baseRelease']
  if base_release is not None and not re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{7,40}',base_release):raise ValueError('invalid base release')
  for name,digest in plan['files'].items():
   p=Path(name)
   if p.is_absolute() or '..' in p.parts or not re.fullmatch(r'[a-f0-9]{64}',digest):raise ValueError('invalid manifest entry')
   dest=site/p
   if not dest.exists():
    if base_release is None:raise RuntimeError('missing uploaded file')
    source=BASE/'releases'/base_release/'site'/p
    if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest()!=digest:raise RuntimeError('base file hash mismatch')
    dest.parent.mkdir(parents=True,exist_ok=True);os.link(source,dest)
   if hashlib.sha256(dest.read_bytes()).hexdigest()!=digest:raise RuntimeError('release file hash mismatch')
  if set(str(p.relative_to(site)) for p in site.rglob('*') if p.is_file())!=set(plan['files']):raise RuntimeError('unexpected release file')
 if not (site/'index.html').exists(): raise RuntimeError('missing entrypoint')
 (target/'archive-sha256.txt').write_text(expected+'\n')
 before=CONFIG.read_bytes();old_snippet=SNIPPET.read_bytes() if SNIPPET.exists() else None
 current=BASE/'current';previous=os.readlink(current) if current.is_symlink() else None
 if current.exists() and not current.is_symlink(): raise RuntimeError('current is not a managed symlink')
 backup=BASE/'backups'/release;backup.mkdir(parents=True)
 (backup/'nginx-before.conf').write_bytes(before)
 if old_snippet is not None: (backup/'ff-before.conf').write_bytes(old_snippet)
 (backup/'previous.json').write_text(json.dumps({'current':previous,'sharedConfigSha256':hashlib.sha256(before).hexdigest()}))
 SNIPPET.parent.mkdir(parents=True,exist_ok=True)
 snippet=(target/'ff-garden.nginx.conf').read_bytes()
 if old_snippet is not None and old_snippet!=snippet:
  # Any changed FF-only config remains reversible via this release's backup.
  pass
 text=before.decode()
 if INCLUDE not in text:
  if 'server_name ff.buplayground.cn' in text: raise RuntimeError('another FF site exists in shared config; inspect before changing')
  end=text.rfind('}')
  if end<0 or text[end+1:].strip(): raise RuntimeError('unexpected shared config layout')
  after=(text[:end]+INCLUDE+'\n'+text[end:]).encode()
 else: after=before
 tmp=BASE/'current.next'
 if tmp.is_symlink():tmp.unlink()
 os.symlink(str(site),tmp)
 if CONFIG.read_bytes()!=before:raise RuntimeError('shared config changed concurrently; retry after inspection')
 try:
  SNIPPET.write_bytes(snippet)
  if after!=before:CONFIG.write_bytes(after)
  os.replace(tmp,current)
  subprocess.run(NGINX+['-t'],check=True)
  subprocess.run(NGINX+['-s','reload'],check=True)
  # Validate trusted HTTPS against the real local nginx with correct SNI.
  for path in ['/', '/moogle.html', '/mage.html', '/chocobo.html', '/data/v4/manifest.json']:
   subprocess.run(['curl','--fail','--silent','--show-error','--retry','4','--retry-all-errors','--retry-delay','1','--max-time','15','--resolve','ff.buplayground.cn:443:127.0.0.1','https://ff.buplayground.cn'+path,'-o','/dev/null'],check=True)
 except Exception:
  CONFIG.write_bytes(before)
  if old_snippet is None:SNIPPET.unlink(missing_ok=True)
  else:SNIPPET.write_bytes(old_snippet)
  if previous is not None:
   if tmp.is_symlink():tmp.unlink()
   os.symlink(previous,tmp);os.replace(tmp,current)
  else:current.unlink(missing_ok=True)
  subprocess.run(NGINX+['-t'],check=True);subprocess.run(NGINX+['-s','reload'],check=True)
  raise
 print(json.dumps({'deployed':True,'release':release,'archiveSha256':expected,'current':str(site),'previous':previous,'configBackup':str(backup),'sharedConfigChange':'one FF include only' if after!=before else 'none','url':'https://ff.buplayground.cn'}))
