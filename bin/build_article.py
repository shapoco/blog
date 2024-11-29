#!/usr/bin/env python3

import shutil
import os
import argparse

import shapolog
from articles import *
from article_struct import *
from md_parser import *

parser = argparse.ArgumentParser()
parser.add_argument('-i', '--input', required=True)
parser.add_argument('-o', '--output', required=True)
parser.add_argument('-t', '--template', required=True)
args = parser.parse_args()

COPY_EXTS = ['png', 'gif', 'jpg', 'svg', 'js', 'css']

def main():
    # Markdown の読み込み
    article = Article(args.input)

    vars = shapolog.get_vars(args.output)
    vars['aricle_title'] = article.title
    vars['article_description'] = article.description
    vars['date_time'] = article.date
    vars['article_body'] = article.body.to_html(depth=4)    
    vars['article_url_absolute'] = f'{vars['site_url_absolute']}/{args.output}'
    
    with open(args.template) as f:
        html = f.read()

    for k in vars.keys():
        vars['article_body'] = vars['article_body'].replace('${blog.' + k + '}', vars[k])

    for k in vars.keys():
        html = html.replace('${blog.' + k + '}', vars[k])

    html = update_script_postfix(html, '/style.css')
    html = update_script_postfix(html, '/style.js')

    with open(f'{args.output}/index.html', 'w') as f:
        f.write(html)

    shutil.copytree(f'{args.input}/', f'{args.output}/', ignore=shutil.ignore_patterns('.*', '*.md'), dirs_exist_ok=True)

def update_script_postfix(html: str, script_path: str) -> str:
    script_mtime = str(int(os.stat(f'docs/{script_path}').st_mtime_ns // 1e9))
    html = html.replace(f'<link href="{script_path}"', f'<link href="{script_path}?{script_mtime}"')
    html = html.replace(f'<script src="{script_path}"', f'<script src="{script_path}?{script_mtime}"')
    return html

main()
