#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/assets/videos"
OUT_FILE="$OUT_DIR/persona-studio-launch-vertical.mp4"
FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
LOGO="$ROOT_DIR/public/logo.jpg"

mkdir -p "$OUT_DIR"

ffmpeg -y \
  -f lavfi -i "color=c=#080908:s=1080x1920:r=30:d=20" \
  -loop 1 -i "$LOGO" \
  -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" \
  -filter_complex "
    [0:v]
      drawbox=x='-260+36*t':y=110:w=780:h=780:color=0xc7ff6b22:t=fill,
      drawbox=x='620-20*t':y=760:w=680:h=680:color=0x74f7d522:t=fill,
      drawbox=x=70:y=70:w=940:h=1780:color=0xf7f4ea14:t=2,
      drawbox=x=86:y=86:w=908:h=1748:color=0x11130fd8:t=fill,
      drawtext=fontfile='$FONT_BOLD':text='PERSONA STUDIO':x=(w-text_w)/2:y=132:fontsize=32:fontcolor=0x74f7d5ff:enable='between(t,0,20)',
      drawtext=fontfile='$FONT_BOLD':text='Your profile photo':x=(w-text_w)/2:y=430:fontsize=78:fontcolor=0xf7f4eaff:enable='between(t,0,3.5)',
      drawtext=fontfile='$FONT_BOLD':text='is about to stop the scroll':x=(w-text_w)/2:y=525:fontsize=58:fontcolor=0xc7ff6bff:enable='between(t,0.4,3.5)',
      drawtext=fontfile='$FONT_BOLD':text='Upload one selfie':x=130:y=390:fontsize=70:fontcolor=0xf7f4eaff:enable='between(t,3.5,7.2)',
      drawtext=fontfile='$FONT_BOLD':text='Pick the vibe':x=130:y=480:fontsize=52:fontcolor=0xa9aa9fff:enable='between(t,3.8,7.2)',
      drawbox=x=130:y=650:w=820:h=720:color=0x000000aa:t=fill:enable='between(t,3.5,7.2)',
      drawbox=x=165:y=685:w=750:h=650:color=0xf7f4ea18:t=2:enable='between(t,3.5,7.2)',
      drawbox=x=250:y=800:w=580:h=380:color=0x74f7d522:t=fill:enable='between(t,3.8,7.2)',
      drawtext=fontfile='$FONT_BOLD':text='PHOTO':x=(w-text_w)/2:y=960:fontsize=44:fontcolor=0xf7f4eaff:enable='between(t,3.8,7.2)',
      drawtext=fontfile='$FONT_BOLD':text='Tap a viral preset':x=(w-text_w)/2:y=350:fontsize=64:fontcolor=0xf7f4eaff:enable='between(t,7.2,12)',
      drawbox=x=130:y=560:w=390:h=118:color=0xc7ff6b28:t=fill:enable='between(t,7.2,12)',
      drawbox=x=560:y=560:w=390:h=118:color=0x74f7d528:t=fill:enable='between(t,7.2,12)',
      drawbox=x=130:y=720:w=390:h=118:color=0xffb86b28:t=fill:enable='between(t,7.2,12)',
      drawbox=x=560:y=720:w=390:h=118:color=0xf7f4ea18:t=fill:enable='between(t,7.2,12)',
      drawtext=fontfile='$FONT_BOLD':text='Founder Glow':x=178:y=598:fontsize=34:fontcolor=0xf7f4eaff:enable='between(t,7.2,12)',
      drawtext=fontfile='$FONT_BOLD':text='Anime Reveal':x=608:y=598:fontsize=34:fontcolor=0xf7f4eaff:enable='between(t,7.2,12)',
      drawtext=fontfile='$FONT_BOLD':text='Cyber Recruiter':x=162:y=758:fontsize=31:fontcolor=0xf7f4eaff:enable='between(t,7.2,12)',
      drawtext=fontfile='$FONT_BOLD':text='Old Money':x=635:y=758:fontsize=34:fontcolor=0xf7f4eaff:enable='between(t,7.2,12)',
      drawtext=fontfile='$FONT_BOLD':text='Then generate the reveal':x=(w-text_w)/2:y=1040:fontsize=54:fontcolor=0xc7ff6bff:enable='between(t,9.1,12)',
      drawtext=fontfile='$FONT_BOLD':text='Before':x=205:y=330:fontsize=46:fontcolor=0xa9aa9fff:enable='between(t,12,16)',
      drawtext=fontfile='$FONT_BOLD':text='After':x=710:y=330:fontsize=46:fontcolor=0xc7ff6bff:enable='between(t,12,16)',
      drawbox=x=120:y=430:w=360:h=520:color=0xf7f4ea14:t=fill:enable='between(t,12,16)',
      drawbox=x=600:y=390:w=380:h=600:color=0xc7ff6b30:t=fill:enable='between(t,12,16)',
      drawbox=x=640:y=430:w=300:h=520:color=0x00000088:t=fill:enable='between(t,12.3,16)',
      drawtext=fontfile='$FONT_BOLD':text='AI AVATAR':x=655:y=670:fontsize=42:fontcolor=0xf7f4eaff:enable='between(t,12.3,16)',
      drawtext=fontfile='$FONT_BOLD':text='Copy. Download. Post.':x=(w-text_w)/2:y=1190:fontsize=58:fontcolor=0xf7f4eaff:enable='between(t,13.2,16)',
      drawtext=fontfile='$FONT_BOLD':text='Built for the profile reveal trend':x=(w-text_w)/2:y=1280:fontsize=40:fontcolor=0x74f7d5ff:enable='between(t,13.8,16)',
      drawtext=fontfile='$FONT_BOLD':text='Launch your new look':x=(w-text_w)/2:y=430:fontsize=72:fontcolor=0xf7f4eaff:enable='between(t,16,20)',
      drawtext=fontfile='$FONT_BOLD':text='Persona Studio':x=(w-text_w)/2:y=525:fontsize=82:fontcolor=0xc7ff6bff:enable='between(t,16.4,20)',
      drawtext=fontfile='$FONT_BOLD':text='AI avatars that people actually share':x=(w-text_w)/2:y=640:fontsize=38:fontcolor=0xa9aa9fff:enable='between(t,16.8,20)',
      drawbox=x=250:y=1280:w=580:h=92:color=0xf7f4eaff:t=fill:enable='between(t,17.2,20)',
      drawtext=fontfile='$FONT_BOLD':text='TRY IT NOW':x=(w-text_w)/2:y=1305:fontsize=40:fontcolor=0x080908ff:enable='between(t,17.2,20)'
      [base];
    [1:v]scale=180:180,format=rgba[logo];
    [base][logo]overlay=x=(W-w)/2:y=220:enable='between(t,16,20)',format=yuv420p[v]
  " \
  -map "[v]" -map 2:a \
  -t 20 \
  -c:v libx264 -preset medium -crf 18 \
  -c:a aac -b:a 128k -shortest \
  -movflags +faststart \
  "$OUT_FILE"

printf 'Created %s\n' "$OUT_FILE"
