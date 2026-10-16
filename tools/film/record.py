"""Shoot a story film frame by frame on virtual time.

Usage (dev server running: npm run dev):
  python3 tools/film/record.py lamplighter OUT_DIR [--size 1920x1080] [--every 1]
  sh tools/film/encode.sh OUT_DIR public/film/lamplighter.mp4

The shot list tools/film/<name>.js drives the page through window.__film / window.__cityQA.
Frames land in OUT_DIR as JPEGs, plus audio.wav (sfx + music rendered offline) and meta.json.
"""
import argparse, base64, json, os, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('name'); ap.add_argument('out')
ap.add_argument('--size', default='1920x1080'); ap.add_argument('--every', type=int, default=1)
ap.add_argument('--url', default='http://127.0.0.1:5209/city.html?qa&time=day')
ap.add_argument('--channel', default=None, help='Use an installed browser channel, e.g. chrome, in an isolated profile')
ap.add_argument('--preflight', action='store_true', help='Validate asset loading without recording the full film')
a = ap.parse_args()
W, H = map(int, a.size.split('x')); OUT = a.out
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.jpg'): os.remove(os.path.join(OUT, f))
with sync_playwright() as pw:
    # Metal ANGLE keeps headless Chromium on the GPU (swiftshader renders ~1 fps).
    b = pw.chromium.launch(channel=a.channel,args=['--use-angle=metal', '--ignore-gpu-blocklist'])
    p = b.new_page(viewport={'width': W, 'height': H}); p.add_init_script(path=os.path.join(HERE, 'film-init.js'))
    errs = []; failed_requests=[]
    p.on('pageerror', lambda e: errs.append({'kind':'page','message':str(e)}))
    p.on('console', lambda m: errs.append({'kind':'console','message':m.text,'location':m.location}) if m.type == 'error' else None)
    p.on('response',lambda r: failed_requests.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
    p.goto(a.url)
    t = time.time()
    while True:
        time.sleep(.05); p.evaluate('()=>__film.step(50)')
        txt = p.eval_on_selector('#city-state', 'e=>e.textContent') or ''
        if txt.startswith('{"ready":true'): break
        if time.time() - t > 120: raise SystemExit('load timeout ' + str(errs))
    for _ in range(90): p.evaluate('()=>__film.step()')
    if a.preflight:
        report={'errors':errs,'failedRequests':failed_requests,'state':json.loads(p.eval_on_selector('#city-state','e=>e.textContent'))}
        json.dump(report,open(f'{OUT}/preflight.json','w'));print(json.dumps(report));b.close();raise SystemExit(1 if errs or failed_requests else 0)
    p.add_script_tag(path=os.path.join(HERE, a.name + '.js'))
    p.evaluate("()=>{window.__filmT0=__film.vt;__runFilm().catch(e=>{console.error('FILM',e.stack||e);__film.err=String(e);__film.done=true;});}")
    cdp = p.context.new_cdp_session(p); n = 0; t = time.time()
    while True:
        r = p.evaluate('()=>__film.step()')
        if n % a.every == 0:
            shot = cdp.send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 90})
            open(f'{OUT}/{n // a.every:06d}.jpg', 'wb').write(base64.b64decode(shot['data']))
        n += 1
        if n % 900 == 0: print('frame', n, 'vt', round(p.evaluate('()=>(__film.vt-__filmT0)/1000'), 1), 'real', round(time.time() - t), 'ep', p.evaluate('()=>__cityQA.episode.snapshot().step'), flush=True)
        if r == 'done' or n > 30 * 600: break
    t0 = p.evaluate('()=>__filmT0/1000'); end = p.evaluate('()=>__film.vt/1000')
    error=p.evaluate('()=>__film.err||null')
    print('err', error, 'frames', n, 'film seconds', round(end - t0, 1), 'final', p.evaluate('()=>__cityQA.episode.snapshot()'))
    if error or not p.evaluate('()=>__film.done') or errs or failed_requests:
        raise SystemExit('Recording failed: '+str(error or errs or failed_requests or 'film did not complete'))
    info = p.evaluate(f'()=>__film.renderAudio({end})'); print('audio', info)
    size = info['bytes']; CH = 3_000_000; data = bytearray()
    for i in range(0, size, CH): data += base64.b64decode(p.evaluate(f'()=>__film.wavChunk({i},{CH})'))
    open(f'{OUT}/audio.wav', 'wb').write(data)
    json.dump({'t0': t0, 'end': end, 'frames': n, 'every': a.every,'width':W,'height':H,'fps':30/a.every,'complete':True,'errors':errs}, open(f'{OUT}/meta.json', 'w'))
    print('errors', errs[:12])
    b.close()
