#!/usr/bin/env python3

import re
import hashlib
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('-f', '--target_file', required=True)
parser.add_argument('-s', '--script', required=True)
args = parser.parse_args()

def main() -> None:
    with open(f'docs/{args.script}', 'rb') as f:
        script_postfix = hashlib.sha256(f.read()).hexdigest()[:8]
    
    with open(args.target_file) as f:
        html = f.read()
    
    html = re.sub(f'<link href="{args.script}\\?\\w+"', f'<link href="{args.script}?{script_postfix}"', html)
    html = re.sub(f'<script src="{args.script}\\?\\w+"', f'<script src="{args.script}?{script_postfix}"', html)
    
    with open(args.target_file, 'w') as f:
        f.write(html)

main()
