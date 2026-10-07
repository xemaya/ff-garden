from pathlib import Path
import subprocess,json,urllib.request,shutil,time
folder=Path('/data/app/huanghaibin/input/ff9-longtour-20261007');out=Path('/data/app/huanghaibin/output/batches/ff9-longtour-20261007');py='/home/huanghaibin/envs/comfy/bin/python';records=[]
for t in [35,45,55]:
 target=out/f'key-{t:02d}.png'
 if target.exists():continue
 q=json.load(urllib.request.urlopen('http://127.0.0.1:8188/queue',timeout=10))
 if q['queue_running'] or q['queue_pending']:raise RuntimeError('Another task is queued; preserve it and resume later')
 start=time.time();print('START polish',t,flush=True)
 args=[py,str(folder/'capture-workflow.py'),'--script','/home/huanghaibin/bin/qi21run.py','--','--port','8188','--ref',f'ff9-longtour-20261007/raw-frames/frame-{t:02d}.png','--ref','ff9-longtour-20261007/B-style.png','--ref-res','0','--prompt-file',str(folder/'prompts'/f'polish-{t:02d}.txt'),'--steps','25','--denoise','1.0','--seed',str(14027+t),'--prefix',f'batches/ff9-longtour-20261007/polish-{t:02d}','--receipt',str(out/f'polish-{t:02d}-receipt.json')]
 subprocess.run(args,check=True)
 receipt=json.loads((out/f'polish-{t:02d}-receipt.json').read_text());source=Path(receipt['outputs'][0]);shutil.copyfile(source,target);shutil.copyfile(target,folder/f'key-{t:02d}.png');records.append({'time':t,'seconds':round(time.time()-start,2),'file':str(target)});(out/'mid-polish-times.json').write_text(json.dumps(records,indent=2))
 print('FINISH polish',t,records[-1]['seconds'],flush=True)
