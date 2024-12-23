# [メモ] ハッシュタグ集

ハッシュタグのメモ

<div id="article_sections"><p>読み込んでいます...</p></div>

<script>
    function articleGenerateList(category) {
        var html = ''
        html += '<h2>' + category.title + '</h2>';
        html += '<ul>';
        Array.from(category.tags).toSorted().forEach(tag => {
            html += '<li><a href="https://x.com/hashtag/' + encodeURIComponent(tag) + '" target="_blank">' + tag + '</a></li>';
        });
        html += '</ul>';
        return html;
    }
    const container = document.querySelector('#article_sections');
    fetch('./hashtags.json')
        .then(response => response.json())
        .then(json_obj => { 
            var html = '';
            json_obj.categories.forEach(category => {
                html += articleGenerateList(category);
            });
            container.innerHTML = html;
            arrangeArticleHtml(container);
        })
        .catch(error => {
            container.innerHTML = '<p>⚠ 記事の読み込みに失敗しました。</p>';
            arrangeArticleHtml(container);
        });
</script>
