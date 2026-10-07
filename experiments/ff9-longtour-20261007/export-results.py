from pathlib import Path
import tarfile,json,urllib.request,subprocess
root=Path('/data/app/huanghaibin/output/batches/ff9-longtour-20261007')
queues={}
for port in [8188,8189,8190,8191,8192,8193,8194]:
 try:
  q=json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/queue',timeout=5));queues[str(port)]={'running':len(q['queue_running']),'pending':len(q['queue_pending'])}
 except Exception as e:queues[str(port)]={'unavailable':type(e).__name__}
receipts=[json.loads(p.read_text()) for p in root.glob('*receipt.json')]
records=[{'prompt_id':r.get('prompt_id'),'phase':r.get('phase'),'seconds':round(r['finished']-r['created'],2),'outputs':r.get('outputs',[])} for r in receipts if r.get('finished') and r.get('created')]
record={'gpu':0,'port':8188,'existingComfyInstanceReused':True,'newServicesStarted':0,'sharedServicesStopped':0,'gpuMemoryCacheReleased':False,'queuesAfter':queues,'modelTasks':records,'totalModelTaskWallSeconds':round(sum(x['seconds'] for x in records),2),'note':'Includes rejected image and excluded original video segments. Receipt elapsed is model task wall time, not a GPU utilization integral.'}
(root/'resource-record.json').write_text(json.dumps(record,indent=2)+'\n')
with tarfile.open(root/'review-export.tar','w') as tar:
 for p in sorted(root.glob('*.json')):tar.add(p,arcname='receipts/'+p.name)
 for i in [5,6]:
  p=root/f'repair-seg-{i:02d}_00001_.mp4'
  if not p.exists():raise RuntimeError('Missing completed repair '+str(i))
  tar.add(p,arcname=f'clips/repair-seg-{i:02d}.mp4')
print('export ready',record['totalModelTaskWallSeconds'],queues,flush=True)
