# [メモ] Fusion360 備忘録

Fusion360 関連の雑多なメモ。随時追加する

## 三面図の作り方

[Fusion 360で3Dデータから2D図面を作成する方法 | モデログ](https://3d-modely.com/blog/3d-software/fusion-360-drawing/)

- 左上の `デザイン` → `図面` → `デザインから` → `OK` で作成開始する
- 投影面の追加

    1. 左上の `図面` → `投影ビュー` 
    2. 最初に作成された投影ビューを上下左右にドラッグする

        - 斜めにドラッグすると等角投影になる

## モデリング時のパースをきつくする

[解決済み: モデリング中のカメラ設定（パース）につきまして - Autodesk Community](https://forums.autodesk.com/t5/fusion-ri-ben-yu/moderingu-zhongnokamera-she-ding-pasu-nitsukimashite/m-p/10366840)

- インストール

    - 上記回答に添付された `SetCameraAoV.zip` の中身を `%APPDATA%\Autodesk\Autodesk Fusion 360\API\Scripts\` に展開する

- 使用方法

    1. パースビューに切り替える
    2. `ユーティリティ` → `アドイン` → `スクリプトとアドイン`
    3. `SetCameraAoV` をダブルクリック → `はい`
    4. 画角を入力

## 細々したの

- 面と面をくっつけたり面を接地させる: `修正` → `位置合わせ`
