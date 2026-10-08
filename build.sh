#!/bin/zsh
# Full pipeline: frames -> score/SFX -> -14 LUFS -> H.264 yuv420p CRF 16
set -e
cd "$(dirname "$0")"
node render.mjs full
node audio.mjs
# two-pass loudness normalisation to -14 LUFS
M=$(ffmpeg -hide_banner -i out/mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$M" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -y -hide_banner -loglevel error -i out/mix_raw.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" -ar 48000 out/mix.wav
ffmpeg -y -hide_banner -loglevel error -framerate 30 -i out/frames/f%05d.jpg -i out/mix.wav \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 192k -shortest jl-ausbildung-entwurf2.mp4
ffmpeg -hide_banner -i jl-ausbildung-entwurf2.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A3 "Integrated loudness" | head -4
echo "done: jl-ausbildung-entwurf2.mp4"
