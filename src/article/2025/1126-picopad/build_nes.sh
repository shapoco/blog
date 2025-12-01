#!/bin/bash

set -eu

DEVICE=picopad20

# ROM ファイルをリストアップ
pushd nes_rom
  NES_DIR=`pwd`
  NES_LIST=`ls -1 *.nes`
popd

UF2_DIR=`pwd`/nes_uf2
mkdir -p "${UF2_DIR}"

mkdir -p nes_build
pushd nes_build
  if [ ! -e PicoLibSDK ]; then
    # PicoLibSDK をクローン
    git clone https://github.com/Panda381/PicoLibSDK
  fi
  pushd PicoLibSDK
    # スクリプトに実行権限を付与
    find . -type f -name "*.sh" -exec chmod +x {} \;
    
    # 必要なツールをビルド
    pushd _tools/elf2uf2
      g++ -o elf2uf2 main.cpp
    popd
    pushd _tools/PicoPadLoaderCrc
      g++ -o LoaderCrc LoaderCrc.cpp
    popd
    pushd PicoPad/EMU/NES/NESprep
      g++ -o NESprep NESprep.cpp
    popd
    pushd PicoPad/EMU/NES/NESprep/MapperNo
      g++ -o MapperNo MapperNo.cpp
    popd
    
    pushd PicoPad/EMU/NES
      set +e
      ./d.sh
      set -e
      
      # ROM 毎に UF2 を作成
      for nes_filename in $NES_LIST; do
        nes_path="${NES_DIR}/${nes_filename}"
        nes_title=`basename "${nes_filename}" .nes`
        
        # 古いファイルを削除
        rm -f \
          src/program.cpp \
          src/setup.h
        rm -f \
          build/program.o \
          build/main.o \
          build/InfoNES.o \
          build/K6502_rw.o
        
        # ソースコード生成
        ./NESprep/NESprep "${nes_path}" src/program.cpp ${nes_title}
        cp setup.h src/setup.h
        
        # ビルド
        ./c.sh ${DEVICE}
        
        # ファイルをコピー
        cp NES.uf2 "${UF2_DIR}/${nes_title}.uf2"
      done
    popd
  popd
popd

