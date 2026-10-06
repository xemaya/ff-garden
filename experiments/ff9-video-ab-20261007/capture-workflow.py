"""Host wrapper: retain exact Comfy graphs without modifying shared CLI scripts."""
import sys,runpy,json,hashlib
from pathlib import Path
sys.path.insert(0,'/home/huanghaibin/bin')
import director_receipt
script=sys.argv[1]
if script not in ['/home/huanghaibin/bin/qi21run.py','/home/huanghaibin/bin/h3run.py']:raise ValueError('unexpected CLI')
sys.argv=[script]+sys.argv[2:]
original=director_receipt.submit
def retained(call,graph,path,port):
 target=Path(path).with_suffix('.workflow.json');target.write_text(json.dumps(graph,ensure_ascii=False,indent=2)+'\n')
 return original(call,graph,path,port)
director_receipt.submit=retained
runpy.run_path(script,run_name='__main__')
