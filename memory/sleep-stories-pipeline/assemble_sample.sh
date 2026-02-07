#!/bin/bash
# Sleep Stories Sample Assembly Pipeline
# Produces 1-minute sample video

set -e

PROJECT_DIR="/Users/thindery/.openclaw/workspace/memory/sleep-stories-pipeline"
OUTPUT_DIR="$PROJECT_DIR/output"
TEMP_DIR="$PROJECT_DIR/temp"

mkdir -p "$OUTPUT_DIR" "$TEMP_DIR"

# ========== CONFIGURATION ==========
SCENE_DURATION=15  # seconds per scene
TOTAL_SCENES=4
RESOLUTION="1920x1080"
FPS=24

# ========== STEP 1: Ken Burns Effect (Images to Video) ==========
echo "[1/4] Converting images to video segments with Ken Burns effect..."

for i in $(seq 1 $TOTAL_SCENES); do
  IMG="$PROJECT_DIR/images/scene${i}.png"
  if [ ! -f "$IMG" ]; then
    echo "Error: Scene $i image not found at $IMG"
    exit 1
  fi
  
  OUTPUT="$TEMP_DIR/scene${i}.mp4"
  
  # Ken Burns: slow zoom from 1.0 to 1.08 over 15 seconds
  ffmpeg -y -loop 1 -i "$IMG" -t $SCENE_DURATION \
    -vf "
      zoompan=z='min(zoom+0.00533,1.08)':
            x='iw/2-(iw/zoom/2)':
            y='ih/2-(ih/zoom/2)':
            d=$(($SCENE_DURATION * $FPS)):
            s=$RESOLUTION:
            fps=$FPS,
      fade=t=in:st=0:d=1,
      fade=t=out:st=$(($SCENE_DURATION - 1)):d=1
    " \
    -c:v libx264 -preset medium -crf 23 -r $FPS -pix_fmt yuv420p \
    -an "$OUTPUT"
  
  echo "  ✓ Scene $i rendered"
done

# ========== STEP 2: Concatenate Scenes ==========
echo "[2/4] Joining scenes..."

# Create concat list
cat > "$TEMP_DIR/scenes.txt" <<EOF
file 'scene1.mp4'
file 'scene2.mp4'
file 'scene3.mp4'
file 'scene4.mp4'
EOF

ffmpeg -y -f concat -safe 0 -i "$TEMP_DIR/scenes.txt" \
  -c:v copy \
  "$TEMP_DIR/visuals.mp4"

echo "  ✓ Visuals assembled"

# ========== STEP 3: Audio Mixing ==========
echo "[3/4] Mixing audio layers..."

NARRATION="$PROJECT_DIR/audio/narration.mp3"
TICKING="$PROJECT_DIR/audio/clock_ticking.mp3"
RAIN="$PROJECT_DIR/audio/rain_window.mp3"
PAGETURN="$PROJECT_DIR/audio/page_turn.mp3"
ROOMTONE="$PROJECT_DIR/audio/room_tone.mp3"

ffmpeg -y -i "$NARRATION" -i "$TICKING" -i "$RAIN" -i "$PAGETURN" -i "$ROOMTONE" \
  -filter_complex "
    [0:a]volume=0.8,afade=t=out:st=50:d=10[vo];
    [1:a]volume=0.35,afade=t=in:st=0:d=5,aloop=loop=-1:size=2s[ti];
    [2:a]volume=0.25,aloop=loop=-1:size=10s[ra];
    [3:a]adelay=30000|30000,volume=0.6[pt];
    [4:a]volume=0.15,aloop=loop=-1:size=5s[rt];
    [vo][ti][ra][pt][rt]amix=inputs=5:duration=shortest:dropout_transition=3[aout]
  " \
  -map "[aout]" -ac 2 -ar 48000 -b:a 192k \
  "$TEMP_DIR/audio_mixed.mp3"

echo "  ✓ Audio mixed"

# ========== STEP 4: Final Render ==========
echo "[4/4] Final render..."

ffmpeg -y -i "$TEMP_DIR/visuals.mp4" -i "$TEMP_DIR/audio_mixed.mp3" \
  -c:v libx264 -preset slow -crf 18 \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  -shortest \
  "$OUTPUT_DIR/clockmaker_library_sample.mp4"

# ========== STEP 5: Thumbnail ==========
echo "[BONUS] Generating thumbnail..."

ffmpeg -y -i "$PROJECT_DIR/images/scene1.png" -vf "
  scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,
  drawtext=text='SLEEP STORY':fontcolor=white:fontsize=48:fontfile=/System/Library/Fonts/Helvetica.ttc:x=(w-text_w)/2:y=(h-text_h)/2-30:shadowcolor=black:shadowx=2:shadowy=2,
  drawtext=text='The Clockmaker\\'s Library':fontcolor=gold:fontsize=36:fontfile=/System/Library/Fonts/Helvetica.ttc:x=(w-text_w)/2:y=(h-text_h)/2+30:shadowcolor=black:shadowx=2:shadowy=2
" "$OUTPUT_DIR/thumbnail.jpg"

echo ""
echo "✅ SAMPLE COMPLETE!"
echo "   Video: $OUTPUT_DIR/clockmaker_library_sample.mp4"
echo "   Thumbnail: $OUTPUT_DIR/thumbnail.jpg"
echo ""
echo "Duration: $(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_DIR/clockmaker_library_sample.mp4" | cut -d. -f1) seconds"
