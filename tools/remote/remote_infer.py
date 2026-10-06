"""Input {endpoint,model,messages,seed}; secrets are read only on the host.
Print raw result and safe metadata. No prompt logging to shared services/files.
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

args=json.load(sys.stdin)
endpoint=args['endpoint']
if endpoint not in ['http://127.0.0.1:8080','http://127.0.0.1:8087']:
    raise ValueError('Only experiment/local writer endpoints are allowed')
headers={'Content-Type':'application/json'}
if endpoint.endswith(':8080'):
    headers['Authorization']='Bearer '+Path('/data/app/huanghaibin/llm/api_key').read_text().strip()
payload={'model':args['model'],'messages':args['messages'],'temperature':0.55,'seed':args['seed'],'max_tokens':3500,'response_format':{'type':'json_object'},'chat_template_kwargs':{'enable_thinking':False}}
if args.get('schema'):
    payload['response_format']={'type':'json_schema','json_schema':{'name':'ff7_street_layout','strict':True,'schema':args['schema']}}
start=time.monotonic()
try:
    request=urllib.request.Request(endpoint+'/v1/chat/completions',data=json.dumps(payload).encode(),headers=headers)
    with urllib.request.urlopen(request,timeout=180) as r: result=json.load(r)
    print(json.dumps({'ok':True,'content':result['choices'][0]['message']['content'],'finishReason':result['choices'][0].get('finish_reason'),'elapsedSeconds':round(time.monotonic()-start,3),'usage':result.get('usage',{}),'model':result.get('model',args['model'])},ensure_ascii=False))
except Exception as error:
    print(json.dumps({'ok':False,'error':type(error).__name__,'elapsedSeconds':round(time.monotonic()-start,3)}))
    sys.exit(1)
