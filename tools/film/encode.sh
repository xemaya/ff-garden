#!/bin/sh
# Encode virtual-time frames. Optional third argument: an already aligned master
# audio/video file whose timeline and duration are unchanged (audio is stream-copied).
# Usage: sh tools/film/encode.sh OUT_DIR film.mp4 [ALIGNED_MASTER]
set -e
DIR=$1; MP4=$2; MASTER=${3:-}
FPS=$(python3 -c 'import json,sys; m=json.load(open(sys.argv[1])); print(m.get("fps",30/m.get("every",1)))' "$DIR/meta.json")
if [ -n "$MASTER" ]; then
  python3 - "$DIR" "$MASTER" "$FPS" <<'PY'
import json,sys,subprocess
from pathlib import Path
root,master,fps=Path(sys.argv[1]),sys.argv[2],float(sys.argv[3])
frames=sorted(root.glob('*.jpg'))
if not frames or any(p.name!=f'{i:06d}.jpg' for i,p in enumerate(frames)): raise SystemExit('Missing or unordered frames')
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',master]))
if abs(len(frames)/fps-float(info['format']['duration']))>2/fps: raise SystemExit('Master audio duration does not match the new frame timeline')
PY
  ffmpeg -v error -y -framerate "$FPS" -i "$DIR/%06d.jpg" -i "$MASTER" -map 0:v -map 1:a \
    -c:v libx264 -preset slower -crf 27 -pix_fmt yuv420p -tune film -c:a copy \
    -shortest -movflags +faststart -progress "$DIR/encode-progress.txt" "$MP4"
else
  T0=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["t0"])' "$DIR/meta.json")
  ffmpeg -v error -y -framerate "$FPS" -i "$DIR/%06d.jpg" -ss "$T0" -i "$DIR/audio.wav" -map 0:v -map 1:a \
    -c:v libx264 -preset slower -crf 27 -pix_fmt yuv420p -tune film \
    -af loudnorm=I=-17:TP=-1.5:LRA=11 -c:a aac -b:a 160k -ar 44100 -shortest -movflags +faststart \
    -progress "$DIR/encode-progress.txt" "$MP4"
fi
ffmpeg -v error -y -ss 205 -i "$MP4" -frames:v 1 -q:v 3 "$(dirname "$MP4")/poster.jpg"
