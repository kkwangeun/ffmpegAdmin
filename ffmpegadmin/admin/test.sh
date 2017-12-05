#!/bin/bash

str="$(cat channel_list.json | grep "channel_list" )"
echo $str
readarray -t array <<<"$(jq -r '.[]' <<<"$str")"

echo $readarray
