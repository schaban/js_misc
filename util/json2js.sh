#!/bin/sh

if [ "$#" -eq 0 ]; then
	echo "./json2js.sh <inpath.json> <outpath.js>"
	exit 1
fi

IN_PATH=$1
IN_FNAME="$(basename $IN_PATH)"
IN_NAME="${IN_FNAME%%.*}"
OUT_PATH="${IN_PATH}.js"
if [ "$#" -gt 1 ]; then
	OUT_PATH=$2
fi
VAR_NAME="json_${IN_NAME}"

echo "var ${VAR_NAME} =" > $OUT_PATH
sed 's:\r::g; s:\\:\\\\:g; s:":\\":g; s:\t:\\t:g; s:.*:\t"&\\n" +:' $IN_PATH >> $OUT_PATH
echo "\"\";" >> $OUT_PATH
