# ブラウザから画面の点滅で無理矢理 I2C してみた

1 ビットの送信毎に 2～3 回の信号変化点が必要なので、頑張ってもモニタのリフレッシュレートの 1/3～1/2、フレーム落ちを考慮するとさらにその数分の一のビットレートになります。

<blockquote class="twitter-tweet" data-media-max-width="560"><p lang="ja" dir="ltr">ブラウザから画面の点滅で無理矢理I2Cしてみた <a href="https://twitter.com/hashtag/shapolab?src=hash&amp;ref_src=twsrc%5Etfw">#shapolab</a> <a href="https://t.co/PQHOCMhLbP">pic.twitter.com/PQHOCMhLbP</a></p>&mdash; シャポコ🌵 (@shapoco) <a href="https://twitter.com/shapoco/status/1371862918006939648?ref_src=twsrc%5Etfw">March 16, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

動画では信号変化点が 20 回/秒になるようにしてますので、ビットレートとしては 6.7～10Hz くらいです (通信内容により変化します)。

## 関連記事 / 関連ポスト

- [紙テープで I2C してみた](/2021/0321-paper-tape-i2c/)
