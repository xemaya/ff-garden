#!/usr/bin/env python3
"""Build locally, upload a checksummed release, switch one site atomically."""
import argparse, datetime, hashlib, json, shlex, subprocess, tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--host',default='shouyun-4090',help='Existing SSH config alias; credentials never enter this repo')
p.add_argument('--skip-build',action='store_true',help='Use a build already checked by npm run check && npm run build')
a=p.parse_args()
if not a.skip_build:
 subprocess.run(['npm','run','check'],cwd=ROOT,check=True)
 subprocess.run(['npm','run','build'],cwd=ROOT,check=True)
commit=subprocess.check_output(['git','rev-parse','--short=12','HEAD'],cwd=ROOT,text=True).strip()
if subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip(): raise RuntimeError('Commit source before deployment to make releases traceable')
release=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ-')+commit
scratch=ROOT/'.deploy';scratch.mkdir(exist_ok=True)
archive=scratch/(release+'.tar.gz')
with tarfile.open(archive,'w:gz') as tf:
 for file in sorted((ROOT/'dist').rglob('*')):
  if file.is_file():tf.add(file,arcname='site/'+str(file.relative_to(ROOT/'dist')),recursive=False)
 tf.add(ROOT/'deploy/ff-garden.nginx.conf',arcname='ff-garden.nginx.conf')
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
source=(ROOT/'deploy/install-release.py').read_text()
command='python3 -c '+shlex.quote(source)+' '+shlex.quote(release)+' '+shlex.quote(sha)
with archive.open('rb') as f:
 result=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=15','-o','ControlMaster=no','-o','ControlPath=none','-o','UpdateHostKeys=no',a.host,command],stdin=f,text=False,stdout=subprocess.PIPE,check=True)
record=json.loads(result.stdout.decode().strip().splitlines()[-1]);record['commit']=commit;record['localArchive']=str(archive)
(scratch/'last-release.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
