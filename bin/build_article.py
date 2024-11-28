#!/usr/bin/env python3

import argparse
import shapolog
from article_struct import *
from md_parser import *
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('-i', '--input', required=True)
parser.add_argument('-o', '--output', required=True)
parser.add_argument('-t', '--template', required=True)
args = parser.parse_args()

COPY_EXTS = ['png', 'gif', 'jpg', 'svg', 'js', 'css']

def main():
    vars = shapolog.get_vars(args.output)

    # Markdown の解析
    md = parse_md(f'{args.input}/article.md')

    vars['article_body'] = md.to_html(depth=2)
    vars['aricle_title'] = escape_for_attr(md.first_header_text())
    vars['article_description'] = escape_for_attr(md.first_paragraph_text())
    vars['article_url_absolute'] = f'{vars['site_url_absolute']}/{args.output}'

    with open(args.template) as f:
        html = f.read()

    for k in vars.keys():
        html = html.replace('${blog.' + k + '}', vars[k])

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
