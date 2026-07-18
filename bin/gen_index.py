#!/usr/bin/env python3

import shutil
import os
import glob
import json
import argparse

from blog_article import *

parser = argparse.ArgumentParser()
parser.add_argument("-o", "--output", required=True)
parser.add_argument("-d", "--defined-tags", required=True)
args = parser.parse_args()


def main() -> None:
    json_obj = {
        "articles": [],
        "tags": [],
    }

    defined_tags = []
    with open(args.defined_tags) as f:
        defined_tags = [line.strip() for line in f.readlines() if line.strip()]

    mentions = {}
    for dir_path in glob.glob("src/article/*/*"):
        a = Article(dir_path, defined_tags)
        if a.hidden:
            continue
        json_obj["articles"].append(
            {
                "title": a.title,
                "description": a.description,
                "date": a.date,
                "url": a.url,
                "twitter_card_size": a.twitter_card_size,
                "card_image_url": a.card_image_url,
                "tags": a.body.mentioned_tags,
            }
        )
        for tag in a.body.mentioned_tags:
            if tag not in mentions:
                mentions[tag] = 0
            mentions[tag] += 1

    json_obj["articles"].sort(key=lambda a: a["date"])
    json_obj["tags"] = [
        {"name": tag, "count": count} for tag, count in mentions.items()
    ]

    with open(args.output, "w") as f:
        json.dump(json_obj, f, ensure_ascii=False, indent=2)


main()
