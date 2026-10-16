#!/bin/sh
# Encode frames + offline audio from tools/film/record.py into a web mp4.
# Usage: sh tools/film/encode.sh OUT_DIR public/film/<name>.mp4
set -e
DIR=$1; MP4=$2
# Audio starts at virtual time 0; the film starts at t0, so skip that much audio.
T0=$(python3 -c "import json;print(json.load(open('$DIR/meta.json'))['t0'])")
ffmpeg -v error -y -framerate 30 -i "$DIR/%06d.jpg" -ss "$T0" -i "$DIR/audio.wav" -map 0:v -map 1:a \
  -c:v libx264 -preset slower -crf 27 -pix_fmt yuv420p -tune film \
  -af loudnorm=I=-17:TP=-1.5:LRA=11 -c:a aac -b:a 160k -ar 44100 -shortest -movflags +faststart "$MP4"
ffmpeg -v error -y -ss 205 -i "$MP4" -frames:v 1 -q:v 3 "$(dirname "$MP4")/poster.jpg"
