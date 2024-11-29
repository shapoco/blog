#!/usr/bin/env python3

import shutil
import os
import glob
import json
import argparse

from blog_article import *

parser = argparse.ArgumentParser()
parser.add_argument('-o', '--output', required=True)
args = parser.parse_args()

def main() -> None:
    json_obj = {
        'articles': []
    }
    
    for dir_path in glob.glob('src/article/*/*'):
        a = Article(dir_path)
        json_obj['articles'].append({
            'title': a.title,
            'description': a.description,
            'date': a.date,
            'url': a.url,
            'twitter_card_size': a.twitter_card_size,
            'card_image_url': a.card_image_url,
        })
    
    json_obj['articles'].sort(key = lambda a: a['date'])
    
    with open(args.output, 'w') as f:
        json.dump(json_obj, f, ensure_ascii=False, indent=2)

main()
