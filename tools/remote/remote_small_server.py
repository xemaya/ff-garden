"""Own only the experiment's loopback llama-server. Never stop shared services."""
import fcntl
import hashlib
import json
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

BASE=Path('/data/app/huanghaibin/llm/ff7-layout-poc')
MODEL=Path('/data/app/huanghaibin/llm/models/ff7-layout-poc/Qwen3-4B-Instruct-2507-Q4_K_M.gguf')
BINARY='/home/huanghaibin/llama.cpp/build/bin/llama-server'
SHA='3605803b982cb64aead44f6c1b2ae36e3acdb41d8e46c8a94c6533bc4c67e597'
PORT=8087
BASE.mkdir(parents=True,exist_ok=True)
STATE=BASE/'state.json'
args=json.load(sys.stdin)

def get_json(url):
    with urllib.request.urlopen(url,timeout=5) as r:return json.load(r)

def owned_pid():
    if not STATE.exists():return None
    info=json.loads(STATE.read_text());pid=info['pid']
    try:
        cmd=(Path('/proc')/str(pid)/'cmdline').read_bytes().split(b'\0')
        if str(MODEL).encode() not in cmd or str(PORT).encode() not in cmd:return None
    except OSError:return None
    return pid

def stop():
    pid=owned_pid()
    if pid:
        os.kill(pid,signal.SIGTERM)
        for _ in range(100):
            if owned_pid()!=pid:break
            time.sleep(.1)
        if (Path('/proc')/str(pid)).exists():
            # Only the same verified owned process can be force-stopped.
            if owned_pid()==pid:os.kill(pid,signal.SIGKILL)
    return {'stoppedPid':pid,'ownedProcessRemaining':owned_pid()}

def start():
    existing=owned_pid()
    if existing:return {'pid':existing,'reused':True,**json.loads(STATE.read_text())}
    if not MODEL.exists():raise RuntimeError('small model download incomplete')
    with socket.socket() as s:
        if s.connect_ex(('127.0.0.1',PORT))==0:raise RuntimeError('experiment port occupied by another process')
    marker=BASE/'verified-model.json'
    current={'size':MODEL.stat().st_size,'mtime':MODEL.stat().st_mtime_ns}
    if not marker.exists() or json.loads(marker.read_text()).get('file')!=current:
        h=hashlib.sha256()
        with MODEL.open('rb') as f:
            while True:
                block=f.read(8<<20)
                if not block:break
                h.update(block)
        if h.hexdigest()!=SHA:raise RuntimeError('GGUF checksum mismatch')
        marker.write_text(json.dumps({'sha256':SHA,'file':current}))
    rows=subprocess.check_output(['nvidia-smi','--query-gpu=index,memory.free','--format=csv,noheader,nounits'],text=True).strip().splitlines()
    candidates=sorted(((int(row.split(',')[0]),int(row.split(',')[1])) for row in rows),key=lambda p:-p[1])
    gpu=None
    for index,free in candidates:
        if free<4608:continue
        try:
            queue=get_json(f'http://127.0.0.1:{8188+index}/queue')
            if queue.get('queue_running') or queue.get('queue_pending'):continue
        except Exception:
            # A card with no reachable ComfyUI is eligible if it has enough free memory.
            pass
        gpu=index;break
    if gpu is None:raise RuntimeError('no card has 4.5 GiB free and an idle queue; existing services preserved')
    env=os.environ.copy();env['CUDA_VISIBLE_DEVICES']=str(gpu)
    log=(BASE/'server.log').open('ab')
    command=[BINARY,'-m',str(MODEL),'--alias','ff7-layout-4b','--host','127.0.0.1','--port',str(PORT),'-ngl','99','-c','6144','--parallel','1','-t','8','-tb','8','-fa','on','--cache-type-k','q8_0','--cache-type-v','q8_0','-b','256','-ub','128','--prio','-1','--jinja']
    proc=subprocess.Popen(command,env=env,stdout=log,stderr=log,stdin=subprocess.DEVNULL,start_new_session=True)
    info={'pid':proc.pid,'gpu':gpu,'port':PORT,'modelPath':str(MODEL),'sha256':SHA,'modelBytes':MODEL.stat().st_size,'startedAt':time.time()}
    STATE.write_text(json.dumps(info))
    for _ in range(120):
        if proc.poll() is not None:raise RuntimeError('small model server exited; inspect its experiment-only log')
        try:
            if get_json(f'http://127.0.0.1:{PORT}/health').get('status')=='ok':return info
        except Exception:pass
        time.sleep(.5)
    stop();raise RuntimeError('small model readiness timeout')

with (BASE/'control.lock').open('a') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX)
    action=args.get('action','status')
    if action=='start':result=start()
    elif action=='stop':result=stop()
    elif action=='status':result={'pid':owned_pid(),'state':json.loads(STATE.read_text()) if STATE.exists() else None}
    else:raise ValueError('unknown action')
    print(json.dumps(result))
