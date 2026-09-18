# RelicVault

Warframe のレリックと Prime パーツの所持状況を管理する。

- レリックを **名前でも報酬パーツ名でも** 検索できる（「Saryn」で 28 件など）
- パーツごとに **未所持 / 所持中 / 作成済み** を記録し、セット単位で完成度を集計する
- **フレンドの所持状況も並べて見られる**ので、一緒にレリックを開けるとき誰の分が足りないか分かる

本体は `web/` の Web アプリ。`ios/` には最初に作った SwiftUI 版が残してある。

## web — Web アプリ（こちらが本体）

React + TypeScript + Vite。通信なしで動き、データはブラウザの中だけに保存される。

```sh
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ に出力
npm run typecheck
npx vitest run     # 共有コードの往復テスト
```

画面は 4 つ。

| タブ | 役割 |
| --- | --- |
| レリック | 772 件を層・Vaulted で絞り込み。行には「まだ手に入れていない報酬の数」が出る |
| Prime | 160 セットを完成度つきで一覧。「完成が近い順」に並べ替えられる |
| 検索 | 596 パーツを横断検索。「未所持のみ」で必要なものだけ残せる |
| フレンド | 表示名・ルーム同期・共有コードのやりとり |

所持状態は、行の右端の丸をタップすると 未所持 → 所持中 → 作成済み と巡回する。
パーツ詳細の Picker からも選べる。

### フレンドと状況を共有する 2 つの方法

**共有コード（seed）** — サーバー不要。自分の状況を 1 本の文字列にして渡す。
596 パーツ分を 1 パーツ 2 ビットで詰め、deflate をかけて base64url にしているので、
数個しか記録していなければ 25 文字ほどにしかならない。相手は貼り付けるだけで取り込める。

その場のスナップショットなので、更新するたびに送り直す必要がある。

**ルーム同期** — 6 桁のコードを共有すると、お互いの最新状況が自動で反映される。
Firebase Firestore の無料枠を使う。相手はログイン不要（匿名認証）で、コードを入れるだけ。

### ルーム同期を有効にする

設定しなくても共有コードは使えるので、必要になってからでよい。

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作る
2. Authentication で **匿名** を有効にする
3. Firestore Database を作る（本番モードでよい）
4. ルールに `firestore.rules` の内容を貼って公開する
5. プロジェクトの設定 > マイアプリ から **ウェブアプリ**を追加し、`firebaseConfig` を控える
6. その値を `web/.env.local`（`.env.example` を参照）に書くか、
   アプリのフレンドタブに直接貼り付ける

`firebaseConfig` は公開されて構わない値で、実際の保護は `firestore.rules` が行う。
ルールは「ルームコードを知っている人だけが読め、書けるのは自分の行だけ」という内容。

### 公開する

`.github/workflows/deploy.yml` を置いてあるので、GitHub リポジトリを作って push すれば
GitHub Pages に出る（リポジトリの Settings > Pages で Source を GitHub Actions にする）。
`vite.config.ts` の `base` を相対パスにしてあるため、サブディレクトリでもそのまま動く。

ルーム同期を使うなら、リポジトリの Secrets に `VITE_FIREBASE_*` を入れる。

ホーム画面に追加すればアプリのように全画面で使える（PWA のマニフェストを同梱）。

## ios — SwiftUI 版

最初に作った iPhone アプリ。Web に移る前の実装で、フレンド共有は入っていない。

```sh
open ios/RelicVault.xcodeproj
```

コマンドラインからビルドと UI テストもできる。

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
xcodebuild -project ios/RelicVault.xcodeproj -scheme RelicVault \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test
```

実機に入れるには署名が要る。無料の Apple ID でも入れられるが、7 日で失効する。

## データの更新

新しい Prime が実装されたら、スクリプトを流し直す。`ios/` と `web/` の両方に書き出される。

```sh
python3 Tools/generate_data.py
```

取得元は次の 2 つ。

- `drops.warframestat.us/data/relics.json` — レリックごとの報酬と、精錬段階別の確率
- `api.warframestat.us/items/` — Vaulted かどうか、Prime セットの構成パーツと必要個数

生成時に気をつけている点。

- **パーツ番号は一度振ったら変えない。** 番号が共有コードのビット位置そのものなので、
  新しい Prime がアルファベット順に割り込んで番号がずれると、過去に配った共有コードが全部壊れる。
  既存の出力から番号を引き継ぎ、初めて見るパーツだけ末尾に足している
- 同じアイテムが 1 つのレリックで 2 枠を占めることがある（Meso D1 の 2X Forma Blueprint）。
  確率は合算する
- 上流データにまれに名前のない壊れたレコードが混ざるので落とす
- レリック番号は `A1 → A2 → … → A10` の順に並ぶよう、英字と数字を分けて比較する
- セットとパーツの対応は `components[].drops[].type` で突き合わせる。
  名前から推測すると Warframe の `Systems` と `Systems Blueprint` を取り違える

Requiem ETERNA だけ報酬の確率合計が 76% になるが、これは上流データがそうなっている。

## 構成

```
web/
  src/
    data/      マスターデータの型と検索インデックス
    state/     所持状態・共有コード・ルーム同期
    ui/        画面
  public/      同梱する JSON と PWA アイコン
ios/           SwiftUI 版
Tools/         マスターデータ生成
firestore.rules
```
