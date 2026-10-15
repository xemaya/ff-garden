from pathlib import Path
import sys,json,subprocess,time,urllib.request
folder=Path('/data/app/huanghaibin/input/ff9-longtour-20261007');out=Path('/data/app/huanghaibin/output/batches/ff9-longtour-20261007');py='/home/huanghaibin/envs/comfy/bin/python';native='/home/huanghaibin/bin/h3run.py'
start=int(sys.argv[1]) if len(sys.argv)>1 else 4;end=int(sys.argv[2]) if len(sys.argv)>2 else 6
records=json.loads((out/'repair-video-times.json').read_text()) if (out/'repair-video-times.json').exists() else []
for i in range(start,end+1):
 receipt=out/f'repair-seg-{i:02d}-receipt.json'
 if receipt.exists() and json.loads(receipt.read_text()).get('phase')=='completed':print('SKIP completed',i,flush=True);continue
 q=json.load(urllib.request.urlopen('http://127.0.0.1:8188/queue',timeout=10))
 if q['queue_running'] or q['queue_pending']:raise RuntimeError('Other task queued; preserve it, then resume')
 nativeargs=['--port','8188','--unet','minimax_h3_fl2va_pruned_fp8_scaled.safetensors','--lora','minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors:1','--last',f'ff9-longtour-20261007/key-{i*10:02d}.png','--prompt-file',str(folder/'prompts'/f'repair-video-{i:02d}.txt'),'--w','864','--h','480','--sec','10' if i==4 else '9.5','--steps','8','--seed',str(15026+i),'--sampler','res_multistep','--scheduler','simple','--prefix',f'batches/ff9-longtour-20261007/repair-seg-{i:02d}','--save-latent',f'batches/ff9-longtour-20261007/context/repair-seg{i:02d}','--receipt',str(receipt)]
 if i==4:nativeargs+=['--first','ff9-longtour-20261007/repair-start-30.png']
 else:
  previous=f'batches/ff9-longtour-20261007/context/repair-seg{i-1:02d}_00001.safetensors'
  if not (Path('/data/app/huanghaibin/output')/previous).is_file():raise RuntimeError('Previous AV latent missing')
  nativeargs+=['--prev-latent',previous]
 wrapper=[py,str(folder/'capture-workflow.py'),'--script',native]
 wrapper+=['--guide-image',f'ff9-longtour-20261007/key-{i*10-5:02d}.png','--guide-frame',str(121 if i==4 else 141)]
 before=time.time();print('START VIDEO',i,flush=True);subprocess.run(wrapper+['--']+nativeargs,check=True)
 record={'segment':i,'seconds':round(time.time()-before,2),'receipt':str(receipt),'outputs':json.loads(receipt.read_text()).get('outputs',[])};records.append(record);(out/'repair-video-times.json').write_text(json.dumps(records,indent=2));print('FINISH VIDEO',i,record['seconds'],flush=True)
