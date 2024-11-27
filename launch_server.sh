#!/bin/bash

set -eux

arg_port=9898
while getopts p: OPT
do
  case "$OPT" in
    'p' ) arg_port="${OPTARG}" ;;
  esac
done
shift `expr $OPTIND - 1`

python3 -m http.server -d docs "${arg_port}"
