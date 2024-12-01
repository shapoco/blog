import os

import shapolog
from md_parser import *

class Article:
    def __init__(self, dir_path: str):
        self.title = 'Untitled'
        self.description = ''
        self.date = ''
        self.body = None
        self.url = dir_path.replace('src/article/', '/')
        self.github_url = f'https://github.com/shapoco/blog/commits/main/{dir_path}/article.md'
        self.twitter_card_size = 'summary'
        self.card_image_url = '/image/default_card_summary.png'

        # 日付
        m = re.search(r'/(\d{4})/?(\d{2})/?(\d{2})-[^/]+$', dir_path)
        if m:
            self.date = f'{m[1]}/{m[2]}/{m[3]}' 
        
        # Markdown の解析
        with open(f'{dir_path}/article.md') as f:
            self.body = MdParser(f.readlines()).body()
        
        # 最初のヘッダ要素の内容を記事タイトルとする
        h = self.body.get_1st_element_by_class(Hx, 1)
        if h:
            self.title = escape_for_attr(remove_tags(h.text_content()))
            
            # 記事タイトルはページの先頭に別途挿入するので削除
            self.body.children.remove(h)

        # 最初の段落の内容を記事の概要とする
        p = self.body.get_1st_element_by_class(P, 1)
        if p:
            self.description = escape_for_attr(remove_tags(p.text_content()))
        else:
            self.description = self.title

        # カード画像
        if os.path.isfile(f'{dir_path}/cover.png'):
            self.twitter_card_size = 'summary_large_image'
            self.card_image_url = f'{self.url}/cover.png'
        elif os.path.isfile(f'{dir_path}/cover.jpg'):
            self.twitter_card_size = 'summary_large_image'
            self.card_image_url = f'{self.url}/cover.jpg'
