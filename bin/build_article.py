#!/usr/bin/env python3

import shutil
import os
import argparse

import shapolog
from blog_article import *

parser = argparse.ArgumentParser()
parser.add_argument('-i', '--input', required=True)
parser.add_argument('-o', '--output', required=True)
parser.add_argument('-t', '--template', required=True)
args = parser.parse_args()

def main() -> None:
    # 記事(Markdown)の読み込み
    article = Article(args.input)

    # テンプレートの読み込み
    with open(args.template) as f:
        html = f.read()

    # 変数の値の設定
    vars = shapolog.get_vars(args.output)
    vars['aricle_title'] = article.title
    vars['article_description'] = article.description
    vars['date_time'] = article.date
    vars['article_body'] = article.body.to_html(depth=4)    
    vars['article_url_absolute'] = f'{vars['site_url_absolute']}/{args.output}'
    
    # 変数適用
    for k in vars.keys():
        vars['article_body'] = vars['article_body'].replace('${blog.' + k + '}', vars[k])
    for k in vars.keys():
        html = html.replace('${blog.' + k + '}', vars[k])

    # スクリプト類の URL ポストフィックス更新
    html = update_script_postfix(html, '/style.css')
    html = update_script_postfix(html, '/style.js')

    # HTML 書き出し
    with open(f'{args.output}/index.html', 'w') as f:
        f.write(html)

    # 画像等のコピー
    shutil.copytree(f'{args.input}/', f'{args.output}/', ignore=shutil.ignore_patterns('.*', '*.md'), dirs_exist_ok=True)

def update_script_postfix(html: str, script_path: str) -> str:
    script_mtime = str(int(os.stat(f'docs/{script_path}').st_mtime_ns // 1e9))
    html = html.replace(f'<link href="{script_path}"', f'<link href="{script_path}?{script_mtime}"')
    html = html.replace(f'<script src="{script_path}"', f'<script src="{script_path}?{script_mtime}"')
    return html

main()
