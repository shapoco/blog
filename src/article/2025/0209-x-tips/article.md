# [メモ] X (旧Twitter) 備忘録

X 関連の雑多なメモ。随時追加する

## 検索クエリ (検索コマンド)

### 演算式

|式|説明|例|
|:--|:--|:--|
|`hoge piyo`|`hoge` と `piyo` を両方含む|[カレー うどん](https://x.com/search?q=%E3%82%AB%E3%83%AC%E3%83%BC+%E3%81%86%E3%81%A9%E3%82%93)|
|`hoge OR piyo`|`hoge` または `piyo` を含む|[ラーメン OR うどん](https://x.com/search?q=%E3%83%A9%E3%83%BC%E3%83%A1%E3%83%B3+OR+%E3%81%86%E3%81%A9%E3%82%93)|
|`"hogepiyo"`|`hogepiyo` に完全一致|["カレーうどん"](https://x.com/search?q=%22%E3%82%AB%E3%83%AC%E3%83%BC%E3%81%86%E3%81%A9%E3%82%93%22)<br>(`カレーうどん` のみにヒットし `カレーとうどん` などにはヒットしない)|
|`-hoge`|`hoge` を含まない|[カレー うどん -"カレーうどん"](https://x.com/search?q=%E3%82%AB%E3%83%AC%E3%83%BC+%E3%81%86%E3%81%A9%E3%82%93+-%22%E3%82%AB%E3%83%AC%E3%83%BC%E3%81%86%E3%81%A9%E3%82%93%22)<br>(`カレー` と `うどん` を両方含むが `カレーうどん` は含まない)|

### オプション

|オプション|説明|例|
|:--|:--|:--|
|`from:ID`|`@ID` による投稿|[from:shapoco](https://x.com/search?q=from%3Ashapoco)|
|`to:ID`|`@ID` への返信|[to:shapoco](https://x.com/search?q=to%3Ashapoco)|
|`filter:media`|メディア付き (※1)|[from:shapoco filter:media](https://x.com/search?q=from%3Ashapoco+filter%3Amedia)|
|`filter:images`|画像付き|[from:shapoco filter:images](https://x.com/search?q=from%3Ashapoco+filter%3Aimages)|
|`filter:videos`|動画付き (※1)|[from:shapoco filter:videos](https://x.com/search?q=from%3Ashapoco+filter%3Avideos)|
|`filter:links`|メディア (※1) またはリンク付き|[from:shapoco filter:links](https://x.com/search?q=from%3Ashapoco+filter%3Alinks)|
|`lang:言語コード`|[言語コード](https://so-zou.jp/web-app/tech/data/code/language.htm) による言語指定|[lang:ja](https://x.com/search?q=lang%3Aja), [lang:en](https://x.com/search?q=lang%3Aen)|
|`since:YYYY-MM-DD`|投稿日が `YYYY-MM-DD` 以降|[from:shapoco since:2025-1-1](https://x.com/search?q=from%3Ashapoco+since%3A2025-1-1)|
|`until:YYYY-MM-DD`|投稿日が `YYYY-MM-DD` 以前|[from:shapoco until:2024-12-31](https://x.com/search?q=from%3Ashapoco+until%3A2024-12-31)|
|`min_retweets:N`|リポスト数が `N` 以上|[from:shapoco min_retweets:1000](https://x.com/search?q=from%3Ashapoco+min_retweets%3A1000)|
|`min_faces:N`|いいね数が `N` 以上|[from:shapoco min_faves:1000](https://x.com/search?q=from%3Ashapoco+min_faves%3A1000)|
|`near:場所 within:距離km`|`場所` から `距離` km 以内|(2025/2/9: 機能してない？)|
|`geocode:緯度,経度,距離km`|[ジオコード](https://www.geosense.co.jp/map/tool/geoconverter.php) の場所から `距離` km 以内|[geocode:45.522192,141.936642,1km filter:media](https://x.com/search?q=geocode%3A45.522192%2C141.936642%2C1km%20filter%3Amedia&f=live)<br>(「最新」タブでないと機能しない？)|

※1 「メディア」や「動画」には YouTube リンクも含まれる

## ユーザー ID

一般的に「ID」と呼ばれているもの (`@shapoco` など) は正式には screen name という。

ユーザー ID は screen name と関係無くアカウントを一意に識別する数字。例えば [@shapoco](https://x.com/shapoco) のユーザー ID は `858142314849378304`。screen name は変更できるが、ユーザー ID は変更できない。

何のためか分からないが `https://x.com/i/user/ユーザーID` がそのユーザーのプロフィールページへ転送されるようになっているので、ユーザー ID から screen name は簡単に分かる ([例](https://x.com/i/user/858142314849378304))。

screen name からユーザー ID を得るのは以前は API を使うことができたが、今は有料化されてやや難しくなっている。

### 外部サービス利用してユーザー ID を取得する

- [X(Twitter) IDチェッカー](https://develop.tools/x-idcheck/)<br>※ なぜか取得できない場合もある

### プロフィールページの DOM からユーザー ID を取得する (PC用)

1. `data-testid="UserProfileSchema-test"` なる属性を持つ `script` 要素を見つける (複数存在する場合がある)。
2. `innerText` を JSON としてパースする。
3. `(JSON obj).mainEntity.additionalName` が目的の screen name に一致することを確認し、一致しない場合は次の `script` 要素を調べる。
4. screen name が一致する場合、`(JSON obj).mainEntity.identifier` にユーザー ID が格納されている。

上記手順をブックマークレット化した。

1. 以下のコードを URL としてブックマークレットを作成する

    ```js
    javascript:(function(){try{const sn=window.location.href.match(/x\.com\/(\w+)(\/(with_replies|media)\/?)?(\?.+)?$/)[1];const ss=Array.from(document.querySelectorAll('script')).filter(elem=>elem.dataset&&elem.dataset.testid==='UserProfileSchema-test');for(const s of ss){const e=JSON.parse(s.innerText).mainEntity;if(e.additionalName!==sn) continue;const url=`https://x.com/i/user/${e.identifier}#${sn}`;console.log(`URL: '${url}'`);navigator.clipboard.writeText(url).then(function(){window.alert(`URL copied to clipboard:\n${url}`);},function(){window.alert(`URL: '${url}'\n(Failed to copy to clipboard)`);});return;}throw new Error(`User ID not found for ${sn}.`);}catch(e){window.alert(`Failed. (${e})`);}})()
    ```

2. 対象ユーザのプロフィールページを開く
3. 作成したブックマークレットを開く<br>( `https://x.com/i/user/<user ID>#<screen name>` の形式でクリップボードにコピーされる)

(2025/03/18 更新)

### フォローボタンの属性からユーザー ID を得る (PC用)

フォローボタン (`button` 要素) の `data-testid` 属性が正規表現 `/(\d+)-(un)?(follow|block)/` にマッチする場合、`(\d+)` の部分がユーザー ID にあたる。

こちらの方法だと、フォロー一覧/フォロワー一覧/アカウント検索結果などのページから、そこに表示されているユーザーの ID をまとめて得られる。

(2025/03/18 更新)

## 通知を送らずに引用する

例えば対象ポストの URL が [https://x.com/shapoco/status/1897261591160328414](https://x.com/shapoco/status/1897261591160328414) の場合は [https://x.com/i/web/status/1897261591160328414](https://x.com/i/web/status/1897261591160328414) のような URL に整形して引用する。ポストのプレビューは表示されない。(2025/03/09)

## 細々したの

### Twitter Card Validator

[Card Validator | Twitter Developers](https://cards-dev.x.com/validator)

プレビューは機能していないが、OGP 画像の更新自体は機能する。(2025/02/22)

### メディア欄の空白は YouTube のリンク

メディア欄にところどころある空白は YouTube のリンクの投稿。

`from:自分のID filter:media` で検索すると、メディア欄で空白だったところに YouTube のリンクが貼られた投稿があるのが分かる。

### 「自分がメンバーとなっているリスト」が数件しか表示されない (PC)

どれかのリストを開いたあとブラウザバックすると続きが表示される
