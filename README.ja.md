# Office Image Extractor

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-office-image-extractor/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-office-image-extractor/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-office-image-extractor/)

[English README](README.md)

Excel、PowerPoint、Word に埋め込まれた元画像を、選択した文書をサーバーへアップロードせず**ブラウザー内だけで抽出**できる単一HTMLアプリです。

## 🚀 デモ

### [GitHub PagesでOffice Image Extractorを開く](https://ttomohisa.github.io/htmlapps-office-image-extractor/)

GitHub Pagesから最初のHTMLを読み込んだ後、Officeファイルの解析、画像抽出、ZIP作成は端末内で処理されます。選択したOfficeファイルがこのアプリからサーバーへ送信されることはありません。

[![Office Image Extractorのデモ](assets/demo.gif)](https://ttomohisa.github.io/htmlapps-office-image-extractor/)

## 主な機能

- Officeファイル内の元画像を再圧縮・変換せずに抽出
- Excel、PowerPoint、Word の現行Open XML形式に対応
- 複数のOfficeファイルをまとめて追加・解析
- 元ファイルごとに検出した画像数を表示
- 抽出した画像を1つのZIPにまとめて保存
- SVG、EMF、WMF、TIFF、GIFなどもOfficeファイル内の形式のまま保持
- 複数文書で同名の画像があっても上書きしないファイル名処理
- 1つのHTML内で日本語・英語を切り替え
- PC・スマートフォン対応のレスポンシブUI
- SVG faviconをHTML内に埋め込み
- 固定バージョンのJSZipをHTMLへ内包
- HTML読み込み後の実行時通信なし
- 通常の単一HTML版とgzip自己解凍HTML版を生成

## 対応形式

| アプリ | 拡張子 |
| --- | --- |
| Excel | `.xlsx`, `.xlsm`, `.xltx`, `.xltm` |
| PowerPoint | `.pptx`, `.pptm`, `.potx`, `.potm`, `.ppsx`, `.ppsm` |
| Word | `.docx`, `.docm`, `.dotx`, `.dotm` |

旧形式の `.xls`、`.ppt`、`.doc` は Office Open XML のZIPパッケージではないため対象外です。

## すぐに使う

### Webで使う

[デモを開く](https://ttomohisa.github.io/htmlapps-office-image-extractor/)だけで利用できます。インストールやアカウント登録は不要です。

### ダウンロードして使う

1. リポジトリから [office-image-extractor.html](https://github.com/ttomohisa/htmlapps-office-image-extractor/blob/main/office-image-extractor.html) をダウンロードします。
2. 最新のChromium系ブラウザー、Firefox、Safariで開きます。
3. Officeファイルを追加すると、端末内だけで画像を抽出できます。

### ビルドして完全オフラインで使う（advanced）

1. このリポジトリをダウンロードまたはクローンします。
2. Windowsで `build-standalone.bat` をダブルクリックします。
3. 初回だけ、`dependencies.json` で固定された依存パッケージを取得します。
4. 生成された `dist/index.html` を任意の場所へコピーします。
5. 以降は `dist/index.html` 単体を、インターネット接続なしで開けます。

Python、Node.js、ローカルWebサーバーは不要です。Windows標準のPowerShellと `tar.exe` を使用します。

## 使い方

1. Excel、PowerPoint、Wordファイルを画面へドロップするか、端末から選択します。
2. 各ファイルの埋め込みメディア解析が完了するまで待ちます。
3. 元ファイルごとに検出された画像数を確認します。
4. 必要であればOfficeファイルを追加します。
5. **「抽出画像をZIPで保存」** を押すと、すべての画像をまとめて保存できます。
6. 選択したファイルと解析結果を消す場合は **「すべてクリア」** を使用します。

保存されるZIPは元ファイルごとにフォルダー分けされます。

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

複数の元ファイルやメディアで同じ出力パスになる場合も、上書きせず重複しない名前を自動生成します。

## 仕組み

現在のOffice Open XMLファイルはZIPパッケージです。このアプリはJSZipでパッケージを端末内で読み込み、以下の場所に格納されているメディアを抽出します。

| 種別 | Officeファイル内の場所 |
| --- | --- |
| Excel | `xl/media/` |
| PowerPoint | `ppt/media/` |
| Word | `word/media/` |

文書やスライドを描画してスクリーンショットを作る方式ではありません。Officeファイル内部に保存されているメディアファイルを直接取り出すため、可能な限り元の画像データをそのまま保持します。

`.xlsm`、`.pptm`、`.docm` などのマクロ有効ファイルも解析できますが、マクロを実行することはありません。

## GitHub Pagesで公開する

このリポジトリには、完全内包HTMLをビルドしてGitHub Pagesへ自動公開するワークフローが含まれています。

1. リポジトリ名を `htmlapps-office-image-extractor` としてGitHubへプッシュします。
2. **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。
3. `main` へプッシュするか、Actions画面から **Deploy standalone app to GitHub Pages** を手動実行します。
4. ビルド成功後、`https://ttomohisa.github.io/htmlapps-office-image-extractor/` で公開されます。

`main` へのプッシュ時には、固定バージョンの依存パッケージから `dist/index.html` を再生成し、単一HTMLの検証と自己解凍版の生成を行ってから `dist` を公開します。

従来の `/office-image-extractor.html` URLも互換用エイリアスとして生成します。

## 開発とビルド

このリポジトリは [`ttomohisa/htmlapps-template`](https://github.com/ttomohisa/htmlapps-template) に準拠しています。

```text
.
├─ src/index.template.html             # アプリ本体の編集元
├─ dependencies.json                   # JSZipの固定バージョンと内包対象
├─ app.config.json                     # アプリ情報とビルド設定
├─ build-standalone.bat                # Windows用ビルド入口
├─ build-standalone.ps1                # 単一HTMLの生成処理
├─ scripts/
│  ├─ build-self-extract.ps1           # 自己解凍HTML生成
│  ├─ check-repository.ps1             # リポジトリ全体の検証
│  ├─ verify-standalone.ps1            # 単一HTMLの検証
│  └─ verify-self-extract.ps1          # 自己解凍版の検証
├─ dist/index.html                     # 生成される公開用HTML
├─ dist/index.self-extract.html        # gzip自己解凍版
└─ .github/workflows/
   ├─ build-standalone.yml              # Pull Request時のビルド検証
   └─ deploy-pages.yml                  # mainからPagesへ自動公開
```

アプリのUIと処理の編集元は `src/index.template.html` です。ルート直下の `index.html` と `office-image-extractor.html` は生成済みの直接利用用コピーです。

### ビルドと検証

通常のビルド:

```bat
build-standalone.bat
```

リポジトリ全体を検証する場合:

```powershell
.\scripts\check-repository.ps1
```

依存パッケージのキャッシュを破棄して再取得する場合:

```bat
build-standalone.bat -ForceDownload
```

ビルド処理は以下を自動で行います。

- 必要に応じてnpm公式レジストリから固定バージョンのJSZip tarballを取得
- JSZipの必要ファイルを単一HTMLへ内包
- 依存情報とSHA-256ハッシュを記録
- 未置換プレースホルダーや外部ランタイムscript / stylesheet参照を検査
- Content Security Policyで実行時通信が遮断されていることを検証
- `dist/dependency-manifest.json` を生成
- `dist/index.self-extract.html` を生成し、展開内容が元HTMLと一致することを検証

## プライバシーと通信防止

生成されたHTMLには以下が含まれます。

- `connect-src 'none'` を含むContent Security Policy
- 外部ランタイムscript / stylesheet依存なし
- JSZipを生成HTMLへ直接内包
- Officeファイル解析とZIP生成をすべてブラウザー内で実行
- アカウント、解析、テレメトリ、トラッキング、リモートログなし

GitHub Pages版では最初のHTML配信は発生しますが、ユーザーが選択したOfficeファイルはこのアプリから外部へ送信されません。完全にネットワークを切って使う場合は、生成済みの `dist/index.html` をローカルで開いてください。

## 制限事項

- パスワード保護されたOfficeファイルや破損ファイルは読み込めない場合があります。
- 外部リンク参照の画像は取得せず、Officeファイル内に埋め込まれたメディアだけを抽出します。
- 旧形式の `.xls`、`.ppt`、`.doc` は対応していません。
- 文書、ワークシート、スライドをレンダリングするツールではなく、保存されているメディアを抽出するツールです。
- EMF、WMF、TIFF、SVG、GIFなどの形式も元のまま保存しますが、表示できるかどうかはOSやアプリに依存します。
- 非常に大きい文書や多数のファイルをまとめて処理すると、ブラウザーのメモリを多く使用する場合があります。

## 使用ライブラリ

| ライブラリ | バージョン | ライセンス | 用途 |
| --- | ---: | --- | --- |
| JSZip | 3.10.1 | MIT または GPL-3.0-or-later | Office Open XMLのZIP読み込みと出力ZIP生成 |

このプロジェクトではJSZipをMIT条項で利用しています。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を確認してください。

## コントリビューション

バグ報告や機能提案はGitHub Issuesからお願いします。開発への参加方法は [CONTRIBUTING.md](CONTRIBUTING.md) を確認してください。

## ライセンス

Copyright © 2026 ttomohisa

このプロジェクトは [MIT License](LICENSE) で公開されています。

Microsoft、Excel、PowerPoint、Word、Office は Microsoft グループ企業の商標です。本プロジェクトはMicrosoftとは独立しており、提携・承認・スポンサー関係はありません。
