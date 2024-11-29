#!/usr/bin/env python3

import shutil
import os
import argparse

import shapolog
from article_struct import *
from md_parser import *

parser = argparse.ArgumentParser()
parser.add_argument('-i', '--input', required=True)
parser.add_argument('-o', '--output', required=True)
parser.add_argument('-t', '--template', required=True)
args = parser.parse_args()

COPY_EXTS = ['png', 'gif', 'jpg', 'svg', 'js', 'css']

def main():
    # Markdown の解析
    md = parse_md(f'{args.input}/article.md')

    vars = shapolog.get_vars(args.output)
    
    # 最初のヘッダ要素の内容を記事タイトルとする
    h = md.get_1st_element_by_class(Hx, 1)
    if h:
        vars['aricle_title'] = escape_for_attr(remove_tags(h.text_content()))
        md.children.remove(h)
    else:
        vars['aricle_title'] = 'Untitled'

    # 最初の段落の内容を記事の概要とする
    p = md.get_1st_element_by_class(P, 1)
    if p:
        vars['article_description'] = escape_for_attr(remove_tags(p.text_content()))
    else:
        vars['article_description'] = vars['aricle_title']

    # 日付
    vars['date_time'] = '0000/00/00'
    m = re.search(r'/(\d{4})/?(\d{2})/?(\d{2})-[^/]+$', args.input)
    if m:
        vars['date_time'] = f'{m[1]}/{m[2]}/{m[3]}' 

    vars['article_body'] = md.to_html(depth=4)    
    vars['article_url_absolute'] = f'{vars['site_url_absolute']}/{args.output}'
    
    with open(args.template) as f:
        html = f.read()

    for k in vars.keys():
        html = html.replace('${blog.' + k + '}', vars[k])

    for k in vars.keys():
        html = html.replace('${blog.' + k + '}', vars[k])

    script_path = '/style.css'
    script_mtime = str(int(os.stat(f'docs/{script_path}').st_mtime_ns // 1e9))
    html = html.replace(f'<link href="{script_path}"', f'<link href="{script_path}?{script_mtime}"')

    script_path = '/style.js'
    script_mtime = str(int(os.stat(f'docs/{script_path}').st_mtime_ns // 1e9))
    html = html.replace(f'<script src="{script_path}"', f'<script src="{script_path}?{script_mtime}"')

    with open(f'{args.output}/index.html', 'w') as f:
        f.write(html)

    shutil.copytree(f'{args.input}/', f'{args.output}/', ignore=shutil.ignore_patterns('.*', '*.md'), dirs_exist_ok=True)

def parse_md(path: str) -> ArticleBody:
    global ctx
    lines = []
    with open(path) as f:
        for line in f:
            lines.append(line.rstrip(' 　\t\r\n'))
    return MdParser(lines).body()
    

main()
