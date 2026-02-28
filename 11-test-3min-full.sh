#!/bin/bash
# SLEEP-001: TRUE 3-Minute Test Video with Chatterbox Calm Voice
# This version uses enough text to reach approximately 3 minutes.

set -e

PROJECT_DIR="$HOME/projects/sleep-stories"
AUDIO_DIR="$PROJECT_DIR/audio"
OUTPUT_DIR="$PROJECT_DIR/output"
CLIPS_DIR="$PROJECT_DIR/clips"
TEMP_DIR="$OUTPUT_DIR/temp_test_full"

echo "🎬 SLEEP-001: TRUE 3-Minute Test Video"
echo "======================================="
echo ""

mkdir -p "$TEMP_DIR"

# Check Chatterbox
if [ ! -d "$HOME/.openclaw/workspace/temp/chatterbox_venv" ]; then
    echo "❌ Chatterbox not installed!"
    exit 1
fi

# Define segments
SEG1="seg01-opening"
SEG2="seg02-intro"
SEG3="seg09-sleep"

# Text for each segment (aiming for ~60s each)
TEXT1="Close your eyes now and let the weight of the day begin to dissolve. You are no longer tethered to the ground, but floating in the vast, velvet expanse of the cosmos. Above you, the stars are brilliant points of light, each one a sun from a distant past, whispering secrets across the emptiness. Feel the cool, quiet energy of the universe wrapping around you like a protective blanket. There is no noise here, only the rhythmic hum of existence. You are drifting on a current of infinite peace, moving through time as easily as a leaf on a calm river. Let your mind expand, filling the space between the stars, as you become one with the eternal flow of the universe. Breathe in the stillness, and breathe out the noise of the world left behind."

TEXT2="In the autumn of the year 2000, a strange voice emerged on the digital frontier. A man calling himself John Titor claimed to be a soldier from the year 2036, sent back in time to retrieve an ancient computer. He spoke of a world transformed by conflict, of a future that felt both alien and hauntingly familiar. Titor described his time machine in scientific detail—a heavy unit mounted in a 1967 Chevrolet. He shared stories of a society that had rebuilt itself from the ashes, emphasizing community and survival. He warned of diverging timelines and the fragility of our own history. Was he a master of fiction, or a genuine traveler from a tomorrow we cannot yet see? His legacy remains a ghost in the machine, a mystery that challenges our understanding of time itself, leaving us to wonder if the future is already written, or if we are the ones holding the pen."

TEXT3="Now, it is time to let the stories go. The mysteries of the future and the echoes of the past are fading into a soft, grey mist. Your journey through the stars is bringing you home to the quiet sanctuary of your own breath. Feel the gentle rise and fall of your chest, a steady anchor in the drifting tide. The world outside is still and silent, respecting your need for rest. You are sinking deeper into the softness of the present moment, where nothing is required of you but to simply be. Let the silence embrace you, washing away the last traces of thought. Tomorrow will wait. The universe will continue its dance without you for a while. Close your eyes, let go of the tiller, and allow yourself to be carried into the deep, restorative ocean of sleep. Sleep now, traveler. Sleep."

# Approximate Target durations for video looping
DUR1=60
DUR2=60
DUR3=60

echo "🎙️  Generating ~3 minutes of narration with Chatterbox..."
echo ""

source ~/.openclaw/workspace/temp/chatterbox_venv/bin/activate
cd "$PROJECT_DIR"
mkdir -p "$AUDIO_DIR/test-full"

# Generate Segment 1
echo "[$SEG1] Generating (~60s)..."
echo "$TEXT1" > "$AUDIO_DIR/test-full/${SEG1}.txt"
python generate-chatterbox-audio-config.py "$AUDIO_DIR/test-full/${SEG1}.txt" "$AUDIO_DIR/test-full/${SEG1}.mp3" --preset calm_narrator 2>/dev/null
D1=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_DIR/test-full/${SEG1}.mp3")
echo "  ✅ Generated: ${D1}s"

# Generate Segment 2
echo "[$SEG2] Generating (~60s)..."
echo "$TEXT2" > "$AUDIO_DIR/test-full/${SEG2}.txt"
python generate-chatterbox-audio-config.py "$AUDIO_DIR/test-full/${SEG2}.txt" "$AUDIO_DIR/test-full/${SEG2}.mp3" --preset calm_narrator 2>/dev/null
D2=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_DIR/test-full/${SEG2}.mp3")
echo "  ✅ Generated: ${D2}s"

# Generate Segment 3
echo "[$SEG3] Generating (~60s)..."
echo "$TEXT3" > "$AUDIO_DIR/test-full/${SEG3}.txt"
python generate-chatterbox-audio-config.py "$AUDIO_DIR/test-full/${SEG3}.txt" "$AUDIO_DIR/test-full/${SEG3}.mp3" --preset calm_narrator 2>/dev/null
D3=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_DIR/test-full/${SEG3}.mp3")
echo "  ✅ Generated: ${D3}s"

# Combine audio
echo "🎵 Combining audio..."
CONCAT_LIST="$AUDIO_DIR/test-full/concat.txt"
> "$CONCAT_LIST"
echo "file '$AUDIO_DIR/test-full/seg01-opening.mp3'" >> "$CONCAT_LIST"
echo "file '$AUDIO_DIR/test-full/seg02-intro.mp3'" >> "$CONCAT_LIST"
echo "file '$AUDIO_DIR/test-full/seg09-sleep.mp3'" >> "$CONCAT_LIST"

FINAL_AUDIO="$OUTPUT_DIR/sleep-001-3min-full-narration.mp3"
ffmpeg -y -f concat -safe 0 -i "$CONCAT_LIST" -c:a libmp3lame -q:a 2 "$FINAL_AUDIO" 2>/dev/null
TOTAL_A=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$FINAL_AUDIO")
echo "📊 Total audio duration: ${TOTAL_A}s"

# Process video segments
echo "🎬 Processing video clips to match audio..."

# Video 1
SRC1=$(ls "$CLIPS_DIR"/seg01-opening*.mp4 | head -1)
ffmpeg -y -stream_loop -1 -i "$SRC1" -t "$D1" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p "$TEMP_DIR/seg1.mp4" 2>/dev/null

# Video 2
SRC2=$(ls "$CLIPS_DIR"/seg02-intro*.mp4 | head -1)
ffmpeg -y -stream_loop -1 -i "$SRC2" -t "$D2" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p "$TEMP_DIR/seg2.mp4" 2>/dev/null

# Video 3
SRC3=$(ls "$CLIPS_DIR"/seg09-sleep*.mp4 | head -1)
ffmpeg -y -stream_loop -1 -i "$SRC3" -t "$D3" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p "$TEMP_DIR/seg3.mp4" 2>/dev/null

# Combine video
echo "🎞️  Assembling final 3-minute video..."
echo "file '$TEMP_DIR/seg1.mp4'" > "$TEMP_DIR/v.txt"
echo "file '$TEMP_DIR/seg2.mp4'" >> "$TEMP_DIR/v.txt"
echo "file '$TEMP_DIR/seg3.mp4'" >> "$TEMP_DIR/v.txt"

ffmpeg -y -f concat -safe 0 -i "$TEMP_DIR/v.txt" -c:v libx264 -preset medium -crf 23 -r 30 -pix_fmt yuv420p "$TEMP_DIR/combined.mp4" 2>/dev/null

# Final assembly
OUTPUT_FILE="$OUTPUT_DIR/sleep-001-3min-full-test.mp4"
ffmpeg -y -i "$TEMP_DIR/combined.mp4" -i "$FINAL_AUDIO" -c:v copy -c:a aac -b:a 192k -shortest "$OUTPUT_FILE" 2>/dev/null

rm -rf "$TEMP_DIR"
echo "✅ 3-MINUTE FULL TEST COMPLETE!"
echo "📁 File: $OUTPUT_FILE"
echo "⏱️  Duration: $(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE")s"
