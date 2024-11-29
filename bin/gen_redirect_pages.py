#!/usr/bin/env python3

import shutil
import os
import pathlib
import argparse

import shapolog
from blog_article import *

parser = argparse.ArgumentParser()
parser.add_argument('-t', '--template', required=True)
parser.add_argument('-o', '--output', required=True)
args = parser.parse_args()

def main() -> None:
    gen_html("2018/02/esp32devkitc4breadboard.html"     , "2018/0202-esp32devkitc4breadboard/"  , "ESP32 DevKitCをブレッドボードで扱いやすくする"                           )
    gen_html("2018/02/dont-bend-volume-pin.html"        , "2018/0214-dont-bend-volume-pin/"     , "ボリュームの端子を曲げてはならない"                                      )
    gen_html("2018/02/ime-status-to-led.html"           , "2018/0217-ime-status-to-led/"        , "WindowsのIMEの状態をLEDで表示するガジェット"                             )
    gen_html("2023/08/fdm3d.html"                       , "2023/0813-fdm-3d-printed-hv-trans/"  , "FDM式3Dプリンタで高圧トランスのボビンを作る"                             )
    gen_html("2023/08/led-lantern.html"                 , "2023/0817-led-lantern/"              , "18650 2セル駆動の LEDランタンを作った"                                   )
    gen_html("2023/08/usb-arc-lighter.html"             , "2023/0824-usb-arc-lighter/"          , "スマホ (USB) で動くプラズマアークライター"                               )
    gen_html("2023/08/smartphone-puchipuchi-bag.html"   , "2023/0826-smartphone-puchipuchi-bag/", "スマホで火花放電を撮るときのブツブツ音対策"                              )
    gen_html("2023/10/raspico-longpush-button.html"     , "2023/1017-raspico-longpush-button/"  , "ラズピコに「長押し書き込みボタン」を追加する (pico2対応)"                )
    gen_html("2023/10/smart-boiled-egg.html"            , "2023/1018-smart-boiled-egg/"         , "スマホの USB でウズラのゆで卵をつくる"                                   )
    gen_html("2024/02/bskycustomfeed.html"              , "2024/0206-bskycustomfeed/"           , "SkyFeed を使って Bluesky で自作品のフィードを公開する"                   )
    gen_html("2024/05/xpro-stop-popup.html"             , "2024/0526-xpro-stop-popup/"          , "X Pro でプロフィールなどがポップアップされたまま消えない問題の応急処置"  )

def gen_html(from_path: str, to_path: str, title: str) -> None:
    out_dir_name = os.path.dirname(f'{args.output}/{from_path}')
    os.makedirs(out_dir_name, exist_ok=True)
    
    with open(args.template) as f:
        html = f.read()
    
    html = html.replace('${to_path}', f'{to_path}')
    html = html.replace('${from_path}', f'{from_path}')
    html = html.replace('${title}', title)
    with open(f'{args.output}/{from_path}', 'w') as f:
        f.write(html)
        
main()
