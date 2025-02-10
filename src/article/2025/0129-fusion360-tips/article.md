# [メモ] Fusion360 備忘録

Fusion360 関連の雑多なメモ。随時追加する

## 三脚・雲台用のネジとネジ穴

[Fusion360で三脚・雲台用のインチネジ(W1/4)の設定 #3Dプリンタ - Qiita](https://qiita.com/2019Shun/items/ccba3b541a2798bcdf82)

### インストール

1. 上記記事に添付された XML ファイルを `%LOCALAPPDATA%\Autodesk\webdeploy\production\(長い16進数)\Fusion\Server\Fusion\Configuration\ThreadData\` に作成する

    - `(長い16進数)` のとこはバージョンアップ時に新しく作られるっぽくて、そのたびに XML ファイルを移動させる必要があるかも

2. 上記記事では W1/4 規格 (ネジ山の角度 = 55°) で作成されているようだけど、厳密には UNC1/4 (60°) にした方がいいかも (参考記事参照)

    ```diff:WhitWorthThead(External).xml
    :
    - <Angle>55</Angle>
    + <Angle>60</Angle>
    :
    - <CTD>W1/4</CTD>
    + <CTD>UNC1/4</CTD>
    :
    ```

### 使用方法 (穴)

穴を開けるときにネジ穴を設定する

- ねじ穴のタイプ: `ねじ穴`
- ねじのタイプ: `WhitWorthThead`
- モデル化: チェックする (STL や STEP にエクスポートする場合)

![](./unc1p4-ss.png)

### 参考記事

- [カメラの三脚についてるボルトの規格｜unc1/4はw1/4で代用できる？ | スローホーム](https://slowhome-diy.com/diy/material-comparison/make-your-own-camera-peripherals)

----

## 三面図の作り方

[Fusion 360で3Dデータから2D図面を作成する方法 | モデログ](https://3d-modely.com/blog/3d-software/fusion-360-drawing/)

- 左上の `デザイン` → `図面` → `デザインから` → `OK` で作成開始する
- 投影面の追加

    1. 左上の `図面` → `投影ビュー` 
    2. 最初に作成された投影ビューを上下左右にドラッグする

        - 斜めにドラッグすると等角投影になる

----

## モデリング時のパースをきつくする

[解決済み: モデリング中のカメラ設定（パース）につきまして - Autodesk Community](https://forums.autodesk.com/t5/fusion-ri-ben-yu/moderingu-zhongnokamera-she-ding-pasu-nitsukimashite/m-p/10366840)

### インストール

上記回答に添付された `SetCameraAoV.zip` の中身を `%APPDATA%\Autodesk\Autodesk Fusion 360\API\Scripts\` に展開する

### 使用方法

1. パースビューに切り替える
2. `ユーティリティ` → `アドイン` → `スクリプトとアドイン`
3. `SetCameraAoV` をダブルクリック → `はい`
4. 画角を入力

----

## 細々したの

### 操作方法

- 面と面をくっつけたり面を接地させる: `修正` → `位置合わせ`
