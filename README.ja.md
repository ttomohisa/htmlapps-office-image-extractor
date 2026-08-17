# Office Image Extractor

![Office Image Extractor Social Preview](assets/social-preview.png)

Excel、PowerPoint、Word に埋め込まれた**元画像をブラウザー内だけで抽出**し、まとめて ZIP 保存できる単一 HTML アプリです。

Office ファイルのアップロード、アカウント、サーバー処理、CDN、実行時通信はありません。画像はスクリーンショット化や再圧縮をせず、Office ファイル内に保存されているデータをそのまま取り出します。

[English README](README.md)

![Office Image Extractor demo](assets/demo.gif)

## オンラインで使う

GitHub Pages: <https://ttomohisa.github.io/htmlapps-office-image-extractor/>

従来の `office-image-extractor.html` URL も互換用のエイリアスとして維持します。選択した Office ファイルはこのアプリから外部へ送信されません。

## 特長

- **ローカル処理** — Office ファイルはブラウザーのメモリ内で読み取ります。
- **配布物は単一 HTML** — `dist/index.html` にアプリ本体と固定バージョンの依存ライブラリを内包します。
- **元画像を保持** — 画像を再圧縮・変換せず、そのまま抽出します。
- **Excel / PowerPoint / Word 対応** — Office Open XML とマクロ・テンプレート系の形式に対応します。
- **複数ファイル対応** — まとめて解析し、抽出画像を 1 つの ZIP に保存できます。
- **メモリ負荷を抑制** — Office パッケージの同時解析数を制限しています。
- **日本語 / 英語 UI** — ページを再読み込みせず切り替えられます。
- **スマホ向け UI** — `htmlapps-template` と同じモバイルファーストの UI / アクセシビリティ方針です。
- **自己解凍版** — 通常版とは別に gzip 圧縮した自己解凍 HTML も生成します。

## 対応形式

| アプリ | 拡張子 |
|---|---|
| Excel | `.xlsx`, `.xlsm`, `.xltx`, `.xltm` |
| PowerPoint | `.pptx`, `.pptm`, `.potx`, `.potm`, `.ppsx`, `.ppsm` |
| Word | `.docx`, `.docm`, `.dotx`, `.dotm` |

旧形式の `.xls`、`.ppt`、`.doc` は Office Open XML の ZIP パッケージではないため対象外です。

## 仕組み

現在の Office Open XML ファイルは ZIP パッケージです。このアプリは JSZip でローカルに読み込み、以下の場所にあるメディアを抽出します。

| 種別 | Office ファイル内の場所 |
|---|---|
| Excel | `xl/media/` |
| PowerPoint | `ppt/media/` |
| Word | `word/media/` |

出力 ZIP は元ファイルごとに整理されます。

```text
extracted-office-images.zip
├── quarterly-report/
│   ├── image1.png
│   └── image2.jpeg
├── project-slides/
│   └── image1.png
└── proposal/
    └── image1.svg
```

同名ファイルが重なっても上書きせず、重複しない出力名を自動生成します。

## ローカルで使う

すぐ使う場合は、以下の生成済み HTML をブラウザーで直接開けます。

- `index.html`
- `office-image-extractor.html`

正式なリリース成果物は `dist/index.html` です。

## ソースからビルド

このリポジトリは [`ttomohisa/htmlapps-template`](https://github.com/ttomohisa/htmlapps-template) の構成に準拠しています。

編集元は次のファイルです。

```text
src/index.template.html
```

Windows でビルド:

```powershell
.\build-standalone.ps1
```

または:

```bat
build-standalone.bat
```

ビルド時には以下を行います。

1. `app.config.json` と `dependencies.json` を読み込み
2. キャッシュがなければ固定バージョンの JSZip を取得
3. JSZip を HTML 内に埋め込み
4. 依存情報・ビルド情報を記録
5. 単一 HTML の検証
6. `dist/index.self-extract.html` を生成
7. ルート直下の HTML と旧 Pages URL 用エイリアスを更新

リポジトリ全体のチェック:

```powershell
.\scripts\check-repository.ps1
```

依存キャッシュを取り直す場合は `-ForceDownload` を指定します。

## リポジトリ構成

```text
.
├── src/
│   └── index.template.html
├── scripts/
│   ├── build-self-extract.ps1
│   ├── check-repository.ps1
│   ├── verify-self-extract.ps1
│   └── verify-standalone.ps1
├── schemas/
├── docs/
├── dist/                         # 生成物
├── app.config.json
├── dependencies.json
├── build-standalone.ps1
├── build-standalone.bat
├── index.html                    # 生成済みの直接利用版
└── office-image-extractor.html   # 互換用の直接利用版
```

将来の変更方針と受入条件は `AGENTS.md` と `APP_SPEC.md` にまとめています。

## プライバシーとセキュリティ

- ファイル処理はブラウザー内だけで完結します。
- 文書内容をアップロードしません。
- アカウント、解析、テレメトリ、トラッキング、リモートログはありません。
- CSP で `connect-src 'none'` を指定し、実行時通信を遮断します。
- JSZip はバージョンを固定し、ビルド時に HTML へ内包します。
- Office マクロは実行しません。ZIP / XML / メディアデータとして読み取るだけです。

詳細は [SECURITY.md](SECURITY.md) と [VERIFY_OFFLINE.md](VERIFY_OFFLINE.md) を参照してください。

## 制限事項

- パスワード保護されたファイルや破損ファイルは読み込めない場合があります。
- 外部リンク参照の画像は取得せず、Office ファイル内に埋め込まれた画像だけを抽出します。
- 文書ページやスライドを描画するツールではありません。
- EMF、WMF、TIFF、SVG、GIF なども元形式のまま抽出します。表示できるかどうかは OS やアプリに依存します。
- 非常に大きい文書ではブラウザーのメモリを多く使用する場合があります。

## サードパーティー

リリース HTML には **JSZip 3.10.1** を内包します。JSZip は MIT または GPLv3 のデュアルライセンスで、このプロジェクトでは MIT 条項を利用します。DEFLATE 処理には pako が含まれます。

通知文は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) に保持しています。

## ライセンス

MIT License。詳細は [LICENSE](LICENSE) を参照してください。

Microsoft、Excel、PowerPoint、Word、Office は Microsoft グループ企業の商標です。本プロジェクトは Microsoft とは独立しており、提携・承認・スポンサー関係はありません。
