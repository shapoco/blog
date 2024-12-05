#!/usr/bin/env python3

import re
import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('-f', '--file', required=True)
args = parser.parse_args()

def main() -> None:
    last_curdir = os.getcwd()
    
    with open(args.file) as f:
        in_md = f.read()
    
    os.chdir(os.path.dirname(args.file))
    
    out_md = ''
    work_md = in_md
    while len(work_md) > 0:
        mstart = re.search(r'^([　 \t]*)```([^:]+)?(:[^\s]+)?[　 \t]*\r?\n', work_md, flags=re.MULTILINE)
        if not mstart:
            break
        
        indent = mstart[1]
        lang = mstart[2]
        title = mstart[3]
        if title:
            title = title[1:]
        
        out_md += work_md[:mstart.end(0)]
        
        work_md = work_md[mstart.end(0):]
        
        mend = re.search(r'^' + indent + r'```[　 \t]*\r?\n', work_md, flags=re.MULTILINE)
        if not mend:
            raise Exception(f'End of code block not found: "{title}" (lang={lang})')
        
        code = work_md[:mend.start(0)]
        
        if title and os.path.isfile(title):
            with open(title) as f:
                new_code = f.read()
            #if not new_code.endswith('\n'):
            #    new_code += '\n'
            if code != new_code:
                print(f'  Code block updated: "{title}" (lang={lang})')
                code = new_code
        
        out_md += code
        out_md += mend[0]
        
        work_md = work_md[mend.end(0):]
        
    out_md += work_md

    os.chdir(last_curdir)

    if out_md != in_md:
        with open(args.file, 'w') as f:
            f.write(out_md)

main()
