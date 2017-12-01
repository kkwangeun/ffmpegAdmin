#!/bin/bash
_HOME_=/home/willfonk/service/KR
nohup /root/bin/ffmpeg -i rtmp://localhost/klive/$1 \
-vcodec copy -acodec copy -threads 0 -hls_time 10 -hls_list_size 5 -hls_flags delete_segments -hls_segment_filename $_HOME_/FHD/$1_FHD-%d.ts -f hls $_HOME_/FHD/$1.m3u8 \
-acodec copy -c:v libx264 -threads 0 -b:v 2M -preset veryfast -hls_time 10  -hls_list_size 5 -hls_flags delete_segments -hls_segment_filename $_HOME_/HD/$1_HD-%d.ts -f hls $_HOME_/HD/$1.m3u8 \
-acodec copy -c:v libx264 -threads 0 -b:v 1M -s 960x540 -preset veryfast -hls_time 10 -hls_list_size 5 -hls_flags delete_segments -hls_segment_filename $_HOME_/SD/$1_SD-%d.ts -f hls $_HOME_/SD/$1.m3u8 \
-acodec copy -c:v libx264 -threads 0 -b:v 500K -s 800x450 -preset medium -hls_time 10 -hls_list_size 5 -hls_flags delete_segments -hls_segment_filename $_HOME_/ZM/$1_ZM-%d.ts -f hls $_HOME_/ZM/$1.m3u8 1> /dev/null 2>&1  &
