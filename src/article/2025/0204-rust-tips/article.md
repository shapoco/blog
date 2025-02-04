# [メモ] Rust 備忘録

Rust 関連の雑多なメモ。随時追加する

## VSCode

### Cargo.toml がワークスペースのルートに無いときの設定

参考: [RustのCargo.tomlの場所がrootに無い時にVSCodeでrust-analyzerのエラーを回避する方法](https://zenn.dev/razokulover/scraps/17844b5b5c7147)

`.vscode/settings.json` に場所を記述する

```json:.vscode/settings.json
{
  "rust-analyzer.linkedProjects": [
    "${workspaceFolder}/path/to/Cargo.toml"
  ]
}
```

<!-- ## 細々したの -->

