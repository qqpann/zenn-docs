---
title: "AppleのDeveloper ID Application証明書（.cer）を正しく追加する方法"
emoji: "🔑"
type: "tech"
topics: ["Mac","Electron","Notarization","Codesign","Apple"]
published: false
publication_name: "aidealab"
---

electronアプリを正式に配布するには、AppleのDeveloper ID Application証明書を取得してアプリを署名し、さらにNotarization（公証）を通す必要があります。


組織で開発している場合、管理者権限がないメンバーがハマりやすいポイントがあったので備忘を兼ねて記事に残します。


## ハマる手順


すでに存在するDeveloper ID Application証明書をダウンロードしてくると、一見証明書が追加されているように見えるのに、署名の際には認識されません。実際にコマンドで確認をしても証明書が見つからないと言われます。


```bash
❯ security find-identity -v -p codesigning
     0 valid identities found
```


実は、 `.cer` は公開鍵のみになっていて、ダウンロードしてきたものをキーチェーンに追加しただけだと**秘密鍵がないため、有効なものとならない**のです。


`.p12` で秘密鍵を共有してもらう方法がよく提示されますが、私のケースでは書き出しができなかったため、CSRによる証明書発行の方法をとりました。


## CSRの作成手順（作業メンバー側）


Keychain Access を使って自分のマシンで秘密鍵ごとCSRを生成します。

1. **Keychain Access.app** を起動
2. メニュー: `証明書アシスタント` → `認証局に証明書を要求...`
3. フォームに入力
    - **ユーザのメールアドレス**: 社内でわかるメール
    - **通称**: `Alice Tan / CommentScreen` など任意
    - **要求の処理**: `ディスクに保存`
4. 保存先を選ぶと、`CertificateSigningRequest.certSigningRequest` と秘密鍵がKeychainに作成される
5. 生成したCSRを管理者に渡す（後述）

## Developer ID Application証明書発行（管理者側）


管理者はApple Developerポータルで以下を実施:

1. **Certificates, Identifiers & Profiles** → Certificates → ＋ 追加
2. **Developer ID** セクションから **Developer ID Application** を選択
3. 手順に従い、提出用CSR (.certSigningRequest) をアップロード
4. 発行された `.cer` ファイルをダウンロードし、メンバーに共有

## 証明書のKeychainへのインポート（作業メンバー側）


メンバー側で次を実施:

1. ダウンロードした `.cer` をダブルクリックし、Keychainに追加
2. **秘密鍵＋証明書ペア** があることを確認

    ```bash
    ❯ security find-identity -v -p codesigning
    1) XXXXXX... "Developer ID Application: Your Org (TEAMID)"
    ```


以上で、有効なDeveloper ID Application証明書が追加されたはずです。

