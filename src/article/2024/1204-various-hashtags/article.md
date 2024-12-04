# さまざまなハッシュタグ

汎用的なハッシュタグのコレクション

## よく使われるもの・汎用性が高いもの

<ul id="article_major_list"></ul>

## 新しいもの

<ul id="article_minor_list"></ul>

<script>
    function articleGenerateList(selector, list) {
        document.querySelector(selector).innerHTML = list
            .toSorted()
            .map(s => '<li><a href="https://x.com/hashtag/' + encodeURIComponent(s) + '" target="_blank">' + s + '</li>')
            .join('');
    }
    articleGenerateList('#article_major_list', [
        'さまざまなスターバックス',
        'さまざまな人',
        'さまざまな嵌合',
        'さまざまなサラダ',
        'さまざまな報告',
        'さまざまな料理',
        '宣言的知識',
    ]);
    articleGenerateList('#article_minor_list', [
        'さまざまなインシデント',
        'さまざまなクソゲー',
        'さまざまなやっていき',
        'さまざまな悩み',
        'さまざまな趣味',
        'さまざまな暖房',
        'さまざまなシミュレーター',
        'さまざまな文化',
        'さまざまなダイエット',
        'さまざまな怪獣',
        'さまざまなスイーツ',
        'さまざまな魚類',
        'さまざまな密輸入',
        'さまざまな溶岩',
    ]);
</script>