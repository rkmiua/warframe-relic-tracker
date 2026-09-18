# ルーム同期をオンにする手順

この作業をするのは**リポジトリの持ち主 1 人だけ**。
一度やれば、以後フレンドは URL を開いて 6 桁コードを入れるだけで使える。
フレンド側に Google アカウントも Firebase も要らない。

所要 10 分ほど。

> **メニューは探さなくてよい。**
> Firebase コンソールの左メニューは時々作り変えられる（以前あった「構築」は無くなり、
> `Security` や `Databases & Storage` といった分類に変わった）。
> 各手順に直接リンクを置いてあるので、そこから飛ぶのが早くて確実。
> リンクの `_` の部分は「いま開いているプロジェクト」を指す。
> うまく開かないときは `_` を自分のプロジェクト ID に置き換える。

---

## 0. 準備 — ログインしているアカウントを確認する

<https://console.firebase.google.com/>

右上のアイコンで、**個人の Google アカウント**になっているか確かめる。
会社アカウントのままだと、会社の組織下にプロジェクトができてしまう。
違っていたら「別のアカウントを追加」から切り替える。

## 1. プロジェクトを作る

1. 「**プロジェクトを作成**」を押す
2. プロジェクト名は何でもよい（例: `warframe-relic-tracker`）。
   下に出る `warframe-relic-tracker-xxxxx` がプロジェクト ID になる
3. **Google アナリティクスはオフ**でよい（このアプリでは使わない）
4. 「プロジェクトを作成」→ 完了を待つ

課金プランは既定で **Spark（無料）**。
**クレジットカードは登録しないこと。** 登録しなければ、無料枠を超えても停止するだけで請求は発生しない。

> 途中で Blaze（従量課金）へのアップグレードを求められたら、そこで止めて相談してほしい。
> Firestore の Standard なら Spark のままで使えるはずで、求められる場合は別の選択肢を選んでいる可能性がある。

## 2. 匿名ログインを有効にする

フレンドがアカウントを作らずに使えるようにするための設定。

**直接開く: <https://console.firebase.google.com/project/_/authentication/providers>**

1. 初めてなら「**始める**（Get started）」を押す
2. 「**Sign-in method**（ログイン方法）」タブを開く
3. 一覧から「**匿名**（Anonymous）」を選ぶ
4. 「有効にする」をオンにして「**保存**」

左メニューから辿る場合は「**Security**（セキュリティ）」→「**Authentication**」。
以前の「構築」カテゴリは無くなっている。

## 2-b. Google ログインを有効にする（端末をまたいで使うなら）

iPhone と iPad で同じ記録を見たいときに要る。フレンドとの共有だけなら不要。

**直接開く: <https://console.firebase.google.com/project/_/authentication/providers>**

1. 一覧から「**Google**」を選ぶ
2. 「有効にする」をオンにする
3. **プロジェクトのサポートメール**を選ぶ（自分のアドレスでよい）
4. 「**保存**」

公開しているアドレスからログインできるよう、承認済みドメインも確認しておく。
同じ画面の「**Settings**（設定）」→「**承認済みドメイン**」に
`rkmiua.github.io` が入っていなければ追加する。

## 3. Firestore を作る

みんなの状況を置いておく場所。

**直接開く: <https://console.firebase.google.com/project/_/firestore>**

1. 「**データベースを作成**（Create database）」を押す
2. ロケーションは「**asia-northeast1（東京）**」
3. 「**本番環境モードで開始する**（Production mode）」を選ぶ
   - テストモードは 30 日間だれでも書き込める状態になるので選ばない
   - 次の手順で正しいルールを入れる
4. 「作成」

左メニューから辿る場合は「**Databases & Storage**（データベースとストレージ）」→「**Firestore**」。

## 4. ルールを貼る

初期状態は「誰も読み書きできない」なので、このアプリ用のルールに差し替える。

**直接開く: <https://console.firebase.google.com/project/_/firestore/rules>**

1. 中身を全部消して、リポジトリの [`firestore.rules`](../firestore.rules) の内容を貼り付ける
2. 「**公開**（Publish）」

このルールの意味は次のとおり。

- ルームの中身を読めるのはログイン済み（匿名でよい）の人だけ
- 書き換えられるのは**自分の行だけ**。他人の状況は書き換えられない
- 名前は 40 文字未満、共有コードは 4000 文字未満に制限（巨大なデータを置かれないように）

## 5. ウェブアプリを登録して設定値を取る

**直接開く: <https://console.firebase.google.com/project/_/settings/general>**

1. 下にスクロールして「**マイアプリ**（Your apps）」
2. **ウェブ**のアイコン（`</>`）を押す
   - プロジェクト概要（トップページ）の中央にも同じ `</>` アイコンがある
3. アプリのニックネーム: `RelicVault` など
4. 「Firebase Hosting も設定する」は**チェックしない**（GitHub Pages を使うため）
5. 「アプリを登録」
6. `firebaseConfig = { ... }` が表示される。**この 4 つを控える**
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`

> この値は秘密ではない。ウェブアプリに埋め込んで公開する前提のもので、
> 実際の保護は手順 4 のルールが担っている。

## 6. GitHub に設定を入れる

<https://github.com/rkmiua/warframe-relic-tracker/settings/secrets/actions>

「**New repository secret**」で 4 つ登録する。名前は次のとおり（大文字小文字も同じに）。

| Name | Value |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | authDomain |
| `VITE_FIREBASE_PROJECT_ID` | projectId |
| `VITE_FIREBASE_APP_ID` | appId |

コマンドでも入れられる。

```sh
gh secret set VITE_FIREBASE_API_KEY      --repo rkmiua/warframe-relic-tracker
gh secret set VITE_FIREBASE_AUTH_DOMAIN  --repo rkmiua/warframe-relic-tracker
gh secret set VITE_FIREBASE_PROJECT_ID   --repo rkmiua/warframe-relic-tracker
gh secret set VITE_FIREBASE_APP_ID       --repo rkmiua/warframe-relic-tracker
```

## 7. デプロイし直す

Secrets はビルド時に埋め込まれるので、入れただけでは反映されない。

<https://github.com/rkmiua/warframe-relic-tracker/actions>

「Deploy to GitHub Pages」→「**Run workflow**」→ ブランチ `main` → 実行。

```sh
gh workflow run "Deploy to GitHub Pages" --repo rkmiua/warframe-relic-tracker
```

2 分ほどで終わる。

## 8. 動いているか確かめる

<https://rkmiua.github.io/warframe-relic-tracker/>

フレンドタブを開く。

- **設定を貼る欄が消えていれば成功。** 代わりにコード入力欄と「新しいルームを作る」が出る
- 「新しいルームを作る」を押すと 6 桁のコードが出る
- そのコードをフレンドに渡す

うまくいかないときは、画面に出るメッセージを見る。

| 出るもの | 原因 |
| --- | --- |
| 設定欄がまだ出ている | Secrets の名前が違うか、デプロイし直していない |
| ルームを読めませんでした | 手順 4 のルールを公開していない |
| 接続しています… のまま | 手順 2 の匿名ログインが有効になっていない |
| Google ログインが有効になっていません | 手順 2-b をやっていない |
| このドメインが承認済みドメインに入っていません | 手順 2-b の承認済みドメインに `rkmiua.github.io` を足す |
| 自分のデータを読めませんでした | 手順 4 のルールが古い。`users` の項目がある新しい内容に差し替える |
| メニューに項目が見当たらない | コンソールの分類が変わっている。各手順の直接リンクから開く |

## フレンドに伝えること

> <https://rkmiua.github.io/warframe-relic-tracker/> を開いて、
> フレンドタブで名前を入れて、コード「XXXXXX」で参加して。

これだけでよい。アカウント登録もアプリのインストールも要らない。
iPhone なら Safari で開いて「ホーム画面に追加」するとアプリのように使える。

## お金の話

10 人で使う前提だと、1 日あたり読み取り 3,500 回・書き込み 300 回ほど。
無料枠は読み取り 50,000 回・書き込み 20,000 回なので、**使用率は 7% 程度**。
この使い方なら 38 人くらいまで無料枠に収まる。

カードを登録していなければ、万一超えても止まるだけで請求は来ない。

- 料金表: <https://firebase.google.com/pricing>
