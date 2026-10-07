import sys,runpy,json,argparse
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--script',required=True);parser.add_argument('--guide-image');parser.add_argument('--guide-frame',type=int);parser.add_argument('args',nargs=argparse.REMAINDER);a=parser.parse_args()
if a.script not in ['/home/huanghaibin/bin/qi21run.py','/home/huanghaibin/bin/h3run.py']:raise ValueError('unexpected shared CLI')
sys.path.insert(0,'/home/huanghaibin/bin');import director_receipt
original=director_receipt.submit
args=a.args[1:] if a.args and a.args[0]=='--' else a.args;sys.argv=[a.script]+args

def retained(call,graph,path,port):
 if a.guide_image:
  guide=next((v for v in graph.values() if v['class_type']=='BasicGuider'),None)
  sampler=next(v for v in graph.values() if v['class_type']=='SamplerCustomAdvanced')
  vae_id=next(k for k,v in graph.items() if v['class_type']=='VAELoader' and 'video_vae' in v['inputs']['vae_name'])
  image_id=str(max(int(k) for k in graph)+1);node_id=str(int(image_id)+1)
  graph[image_id]={'class_type':'LoadImage','inputs':{'image':a.guide_image}}
  graph[node_id]={'class_type':'MiniMaxH3AddGuide','inputs':{'positive':guide['inputs']['conditioning'],'latent':sampler['inputs']['latent_image'],'vae':[vae_id,0],'frame_idx':a.guide_frame,'image':[image_id,0]}}
  guide['inputs']['conditioning']=[node_id,0]
 Path(path).with_suffix('.workflow.json').write_text(json.dumps(graph,ensure_ascii=False,indent=2)+'\n')
 return original(call,graph,path,port)
director_receipt.submit=retained;runpy.run_path(a.script,run_name='__main__')
