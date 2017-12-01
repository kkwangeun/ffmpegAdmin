#!/bin/bash

CH_NAME=$1
#echo $CH_NAME
PID=`ps -ef | grep ffmpeg | grep -v ffmpegadmin | grep "$CH_NAME" | grep -v 'grep' | awk '{print $2}'`
#echo $PID
retval=""
   for val in $PID; do
     if [ $val ]; then
       retval=$val
       break
     fi
   done

if [ $retval ]
then
 echo $retval
else
 echo $CH_NAME
fi
