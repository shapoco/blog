import re

SITE_TITLE = 'シャポログ'
SITE_URL_ABSOLUTE = 'https://shapoco.github.io/blog'

def get_vars(path: str):
    return {
        'site_keywords': f'{SITE_TITLE}',
        'site_title': SITE_TITLE,
        'site_url_absolute': SITE_URL_ABSOLUTE,
        'site_url_relative': '/'.join(['..'] * (len(re.sub(path, r'^\./', '').split('/')) - 2))
    }
