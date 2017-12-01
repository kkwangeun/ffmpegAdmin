#!/bin/bash

CH_NAME=$1
#echo $CH_NAME
PID=`ps -ef | grep -v /bin/sh | grep ffmpeg | grep -v ffmpegadmin | grep $CH_NAME | grep -v 'grep' | awk '{print $2}'`
#echo $PID
  for val in $PID; do
    if [ $val ]; then
      kill -9 $val
     echo -n "Shutting down ffmpeg-"$CH_NAME
    else
     echo "It seems that the process isn't running!!!"
    fi
 done
