#!/usr/bin/env python3
"""Switch ff-garden/current to an existing immutable release on its host."""
import argparse, shlex, subprocess
p=argparse.ArgumentParser();p.add_argument('release');p.add_argument('--host',default='shouyun-4090');args=p.parse_args()
source=r'''
import fcntl,json,os,re,subprocess,sys
from pathlib import Path
name=sys.argv[1]
if not re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{7,40}',name):raise ValueError('invalid release')
base=Path('/data/app/huanghaibin/web/sites/ff-garden')
with (base/'deploy.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX)
 target=base/'releases'/name/'site'
 if not (target/'index.html').is_file():raise RuntimeError('release not found')
 current=base/'current';previous=os.readlink(current);tmp=base/'current.next'
 if tmp.is_symlink():tmp.unlink()
 os.symlink(str(target),tmp);os.replace(tmp,current)
 try:
  subprocess.run(['curl','--fail','--silent','--show-error','--resolve','ff.buplayground.cn:443:127.0.0.1','https://ff.buplayground.cn/','-o','/dev/null'],check=True)
 except Exception:
  os.symlink(previous,tmp);os.replace(tmp,current);raise
 print(json.dumps({'rolledBack':True,'release':name,'previous':previous}))
'''
command='python3 -c '+shlex.quote(source)+' '+shlex.quote(args.release)
subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=15','-o','ControlMaster=no','-o','ControlPath=none','-o','UpdateHostKeys=no',args.host,command],check=True)
