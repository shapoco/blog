# VLConfig: ディスプレイの点滅でデバイスに設定を書き込む

IoT デバイスのような、リッチな入力インタフェースを持たないデバイスに対し、WiFi 設定等を書き込むためのプロトコルと C++ ライブラリを作りました。

## 動作の様子

<iframe width="560" height="315" src="https://www.youtube.com/embed/GITFharvHWY?si=IT4DUiYEcTCEbnF4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## リポジトリ

- [VLConfig](https://github.com/shapoco/vlconfig)
- [VLConfig for Arduino Platform](https://github.com/shapoco/vlconfig-arduino)

## プロトコル

送信側では設定内容を Key Value Pair にし、それを [CBOR](https://www.rfc-editor.org/rfc/rfc8949) にエンコードし、4b/5b 変換、シリアル化して画面を点滅させます。

受信側は光センサで明暗の変化を検出し、5b/4b 変換して CBOR オブジェクトを復元します。

CRC32 による誤り検出はありますが訂正は無いので、エラー発生時は最初から送信し直す必要があります。

![](./protocol_stack.svg)

## 送信ツール

送信はブラウザから行います。

- [デモページ](https://shapoco.github.io/vlconfig/#demo)

フォームの項目は、URL のハッシュ部分に JSON 風の文字列を与えることで指定できます。

- 例: [https://shapoco.github.io/vlconfig/#form:\{t:WiFi%20Setup,e:\[\{k:s,t:t,l:SSID\},\{k:p,t:p,l:Password\}\]\}](https://shapoco.github.io/vlconfig/#form:%7Bt%3AWiFi%20Setup%2Ce%3A%5B%7Bk%3As%2Ct%3At%2Cl%3ASSID%7D%2C%7Bk%3Ap%2Ct%3Ap%2Cl%3APassword%7D%5D%7D)

```
https://shapoco.github.io/vlconfig/#form:{
    t:タイトル,
    e:[
        {k:キー, t:タイプ, l:ラベル, v:デフォルト値},
        {k:キー, t:タイプ, l:ラベル, v:デフォルト値},
        {k:キー, t:タイプ, l:ラベル, v:デフォルト値},
                        :
                        :
    ]
}
```

- `キー`: CBOR オブジェクトのキーとして使用されます。
- `タイプ`: 形式 (今後追加するかも)。

    |設定値|UI|CBOR 形式|
    |:--:|:--|:--|
    |`t`|テキストボックス|テキスト文字列|
    |`p`|パスワードボックス|テキスト文字列|
    |`i`|IP アドレス|バイト列|
    |`n`|数値入力|整数値|
    |`c`|チェックボックス|真偽値|

- `ラベル`: UI のラベル。
- `デフォルト値`: 入力欄に予め設定する値 (省略可)。

URL を短くするため、`[`、`]`、`{`、`}`、`:`、`,` のうちいずれも含まない文字列リテラルについてはダブルクォーテーション (`"`) を省略できます。

送信ボタンを押すと、`キー` の値とフォームの入力値のペアが CBOR オブジェクトとして送信されます。

## 受信回路

### ADC を使用する場合

ADC 入力が空いていれば、次のようにするのが簡単です。ある程度の信号振幅が得られればセンサは何でもいいです。ディスプレイによっては輝度が PWM 制御されているため、C1 で平滑化する必要があります。

![](./schematic_input_with_adc.svg)

### デジタル入力を使用する場合

デジタル入力を使用する場合は、明暗を判別する回路を外付けする必要があります。DC オフセットを検出してそれと比較する構成にすると、環境やデバイス特性の違いに対してある程度ロバストになります。

![](./schematic_input_with_gpio.svg)

## 受信ソフトウェア

受信処理はライブラリ化されています。ライブラリ自体は特定のプラットフォームに依存しません。その代わり ADC 入力処理やサンプリングタイミングの保証はユーザ側で行う必要があります。

### デモプログラム

- [Raspberry Pi Pico](https://github.com/shapoco/vlconfig/tree/main/cpp/example/pico)
- [Arduino プラットフォーム](https://github.com/shapoco/vlconfig-arduino)

### ライブラリ使用方法

1. 設定項目リストを `vlcfg::ConfigEntry` の配列として定義します。配列の最後の要素はゼロ埋めして配列の終端を示します。

    ```c++
    // 設定項目のキー
    const char *KEY_TEXT = "t";
    const char *KEY_PASS = "p";
    const char *KEY_NUMBER = "n";
    const char *KEY_IP_ADDR = "i";
    const char *KEY_LED_ON = "l";
    // 設定値が格納されるバッファ変数
    char text_buff[32 + 1];
    char pass_buff[32 + 1];
    int32_t number_buff;
    uint8_t ip_buff[6];
    uint8_t bool_buff;
    // 設定項目リスト
    vlcfg::ConfigEntry configEntries[] = {
        {KEY_TEXT   , text_buff   , vlcfg::ValueType::TEXT_STR, sizeof(text_buff)  },
        {KEY_PASS   , pass_buff   , vlcfg::ValueType::TEXT_STR, sizeof(pass_buff)  },
        {KEY_NUMBER , &number_buff, vlcfg::ValueType::INT     , sizeof(number_buff)},
        {KEY_IP_ADDR, ip_buff     , vlcfg::ValueType::BYTE_STR, sizeof(ip_buff)    },
        {KEY_LED_ON , &bool_buff  , vlcfg::ValueType::BOOLEAN , sizeof(bool_buff)  },
        {nullptr, nullptr, vlcfg::ValueType::NONE, 0},  // terminator
    };
    ```

2. `vlcfg::Receiver` をインスタンスします。コンストラクタの引数には CBOR オブジェクトのバッファサイズを指定します。

    ```c++
    vlcfg::Receiver receiver(256);
    ```

3. 受信開始時に `vlcfg::Receiver::init()` をコールします。

    ```c++
    receiver.init(configEntries);
    ```

4. 可能な限り正確に 10 ミリ秒間隔で ADC 値を取得し、`vlcfg::Receiver::update()` をコールします。

    ```c++
    vlcfg::RxState rx_state;
    auto ret = receiver.update(adc_read(), &rx_state);
    ```

    デジタル入力を使用する場合はデジタル値を適当な振幅のアナログ値に変換して引数に与えます (例: Low=0, High=2048)。

    `rx_state` が `vlcfg::RxState::COMPLETED` になったら受信完了です。`rx_state` が `vlcfg::RxState::ERROR` になるか、`ret` が `vlcfg::Result::SUCCESS` 以外になったら受信失敗です。

5. 受信されたデータは設定項目リストに指定したバッファ変数に格納されます。

    入力フォームで空欄にした項目は送受信されません。ある項目が送受信されたかどうかは `vlcfg::ConfigEntry::was_received()` メソッドで分かります。

詳細はデモプログラムを参照してください。

## SNS 投降

- [X (Twitter)](https://x.com/shapoco/status/1976593650911248689)
- [Misskey.io](https://misskey.io/notes/ado8ofmtxrqt0bnp)
- [Bluesky](https://bsky.app/profile/shapoco.net/post/3m2tfxjac7c2g)
