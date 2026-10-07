from pathlib import Path
import subprocess,json,hashlib
root=Path(__file__).resolve().parent
files=[root/'clips'/(f'seg-{i:02d}.mp4' if i<4 else f'repair-seg-{i:02d}.mp4') for i in range(1,7)]
records=[]
for file in files:
 if not file.exists():raise RuntimeError('Missing clip '+file.name)
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration','-of','json',str(file)],text=True));video=next(s for s in data['streams'] if s.get('codec_name')=='h264')
 assert [video['width'],video['height']]==[864,480] and video['r_frame_rate']=='24/1'
 records.append({'file':file.name,'frames':int(video['nb_frames']),'duration':int(video['nb_frames'])/24})
filters=[]
for i in range(6):filters.append(f'[{i}:v]settb=AVTB,setpts=PTS-STARTPTS[v{i}]')
filters.append(''.join(f'[v{i}]' for i in range(6))+'concat=n=6:v=1:a=0[joined]')
filters.append('[joined]settb=1/24,setpts=N[out]')
cmd=['ffmpeg','-hide_banner','-loglevel','error','-y']
for file in files:cmd+=['-i',str(file)]
output=root/'FF9-LongTour-B.mp4';cmd+=['-filter_complex',';'.join(filters),'-map','[out]','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-r','24','-fps_mode','cfr','-movflags','+faststart',str(output)];subprocess.run(cmd,check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=width,height,nb_frames,nb_read_frames,r_frame_rate:format=duration','-of','json',str(output)],text=True));expected=sum(x['frames'] for x in records);actual=int(probe['streams'][0]['nb_frames']);assert actual==expected,(actual,expected);assert int(probe['streams'][0]['nb_read_frames'])==expected
result={'passed':True,'clips':records,'frames':actual,'seconds':actual/24,'fps':24,'size':[864,480],'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'audio':'muted display version; native audio retained in source clips','joins':'native AV motion context for 1→2→3 and 4→5→6; 3→4 uses exact decoded previous last frame with fresh first-frame conditioning; no fades or filler','noCrossfadesOrLoopFiller':True};(root/'media-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
