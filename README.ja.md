# Office Image Extractor

ヘッダーのバージョンは v1.0.3。プライバシーバッジは「完全ローカル処理」、言語ボタンは日本語表示中に EN、英語表示中に JA と表示します。切替先と言語に合ったヘルプの説明を表示します。

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-office-image-extractor/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-office-image-extractor/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-office-image-extractor/)

[English README](README.md)

Excel、PowerPoint、Word に埋め込まれた元画像を、選択した文書をサーバーへアップロードせず**ブラウザー内だけで抽出**できる単一HTMLアプリです。

## 画像を選んで保存

解析後、選択画像数の横にある「全画像を選択」「全画像の選択を解除」で、読み込み済みのすべての文書をまとめて操作できます。各文書の「画像を選択」を開くと、埋め込み画像のファイル名と形式を確認でき、個別のチェックや文書ごとの「すべて選択」「選択を解除」も使えます。「選択した画像をZIPで保存」でまとめて保存し、各画像の「保存」ではチェック状態に関係なく元画像を1枚保存します。選択状態は現在のセッション内だけに保持され、全画像の選択を解除した後でも、新しく追加した文書の画像はすべて選択された状態で始まります。

OOXMLの `[Content_Types].xml` で画像を判別し、音声・動画などは除外して件数を表示します。明示的に画像以外と宣言された項目は除外します。メタデータがない・壊れている場合は既知の画像拡張子で判別し、未知の形式は除外します。画像の元バイト列や形式は変更しません。

回帰テストは `node --test tests/extraction.test.cjs` で実行できます。完全なリポジトリ検証にはNode.js 18以降が必要です（HTML生成のみの場合は不要）。実際に内包されたJSZip 3.10.1を利用しますが、DOM/XMLの軽量テスト用アダプターだけではブラウザーの動作確認を代替できません。手動確認項目は後述の「回帰テストとブラウザー確認」を参照してください。

## 🚀 デモ

### [GitHub PagesでOffice Image Extractorを開く](https://ttomohisa.github.io/htmlapps-office-image-extractor/)

GitHub Pagesから最初のHTMLを読み込んだ後、Officeファイルの解析、画像抽出、ZIP作成は端末内で処理されます。選択したOfficeファイルがこのアプリからサーバーへ送信されることはありません。

[![Office Image Extractorのデモ](assets/demo.gif)](https://ttomohisa.github.io/htmlapps-office-image-extractor/)

## 主な機能

- Officeファイル内の元画像を再圧縮・変換せずに抽出
- Excel、PowerPoint、Word の現行Open XML形式に対応
- 複数のOfficeファイルをまとめて追加・解析
- 元ファイルごとに検出した画像数を表示
- 画像の個別選択、文書ごと・読み込み済みの全画像の一括選択と解除、選択した画像のZIP保存
- 元画像をチェック状態に関係なく1枚ずつ保存
- 文書の重複は端末内でバイト列を比較して確認し、名前・サイズ・更新日時が同じでも内容が異なる文書は保持
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
2. 重複確認と埋め込みメディア解析が完了するまで待ちます。
3. 選択画像数の横の **「全画像を選択」** / **「全画像の選択を解除」** で、読み込み済みのすべての文書の画像をまとめて選択・解除できます。
4. 各文書の **「画像を選択」** を開くと、ファイル名と形式を確認し、個別のチェックや文書ごとの **「すべて選択」** / **「選択を解除」** で調整できます。後から追加した文書も、画像がすべて選択された状態で始まります。
5. **「選択した画像をZIPで保存」** でまとめて保存するか、各画像の **「保存」** で元画像を1枚保存します。
6. 選択したファイルと解析結果を消す場合は **「すべてクリア」** を使用します。

ファイルの追加・重複確認・解析中は、全画像の一括選択・解除とZIP保存を使用できません。ZIPまたは個別画像の保存処理中も全画像の一括選択・解除は使用できません。選択を解除しても文書は削除されず、ZIP保存には少なくとも1枚の選択が必要です。

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

追加する文書のファイル名・バイト数・更新日時が、セッション内に残っている先行文書と一致する場合は、端末内でバイト列が完全に一致することを確認してから重複としてスキップします。内容が異なる文書は別文書として保持し、メタデータが異なる文書同士の内容比較は行いません。比較は最大256 KiBずつ読み込み、文書解析と共通の最大2タスクのキューで処理します。同じメタデータの文書を受け入れるかどうかは、追加操作が重なった場合も順番に判定します。比較に失敗した場合は警告を表示し、スキップせず通常の解析へ進みます。

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
- 非常に大きい文書や多数のファイルをまとめて処理すると、JSZipとアプリがブラウザーのメモリを多く使用する場合があります。重複比較を256 KiBずつ、解析を最大2タスクに制限しても、ZIP解析がストリーミング方式になるわけではなく、全体のメモリ使用量に上限を設けるものでもありません。

### 回帰テストとブラウザー確認

`node --test tests/extraction.test.cjs` は、実際に内包されたJSZip 3.10.1と合成Officeファイルでアプリのスクリプトを検証します。以下は手動確認のチェックリストであり、ブラウザー検証の完了記録ではありません。

- 合成Officeファイルを実際のファイル選択とドラッグ＆ドロップで読み込み、画像以外のメディア件数、画像0件、エラー状態を確認します。
- 3文書以上で全画像の一括選択・解除、文書ごとの操作、個別選択を試します。選択画像数、展開状態、キーボードフォーカス、処理中・保存中の一括操作の無効化を確認します。一括解除後に追加した文書の画像は、すべて選択された状態で始まることを確認します。
- 名前・バイト数・更新日時が同じで内容が異なる合成文書と、メタデータもバイト列も同一のコピーを読み込みます。異なる2文書は保持され、コピーだけがスキップされることと、保存したZIPのパス・画像の元バイト列を確認します。
- 個別の **「保存」** でZIPの選択状態が変わらないこと、日本語・英語の切り替え、PCと幅360pxでの表示を確認します。
- 処理中に文書を削除、または **「すべてクリア」** を確定してから再追加し、以前の結果が復活しないことを確認します。キャンセル・Esc・閉じる・背景タップではセッションが保持されることを確認します。
- 対応ブラウザーで通常版・自己解凍版を `file://` から直接開き、処理中に文書データの送信や実行時通信が発生しないことを確認します。

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
