---
作成日時: "2026-05-26T09:07:00.000Z"
platform: Zenn
最終更新日時: "2026-05-26T09:15:00.000Z"
publication_name: null
type: tech
published: false
topics: []
emoji: 🔐
slug: ga4-service-account-access-binding
名前: GA4でサービスアカウントを追加できないときはAdmin APIのAccess Bindingを使う
title: GA4でサービスアカウントを追加できないときはAdmin APIのAccess Bindingを使う
notcms_id: 36c2c5fe-b55c-805d-8410-c0c3db6e1987
notcms_db: techblog
notcms_last_synced_at: "2026-11-21T17:35:23.926Z"
---

## TL;DR


GA4 のプロパティのアクセス管理画面でサービスアカウントを追加しようとすると、`このメールアドレスは Google アカウントと一致しません` と表示されて登録できないことがあります。2026年5月時点では同様の報告があり、GA4 UI からではなく Google Analytics Admin API の `properties.accessBindings.create` を API Explorer から実行すると回避できました。


重要なのは、GCP IAM と GA4 のアクセス管理は別物だという点です。`gcloud projects add-iam-policy-binding` で GCP プロジェクト側のロールを付けても、GA4 プロパティの Access Binding は追加されません。


## 起きたこと


GA4 の管理画面から、プロパティのアクセス管理にサービスアカウントを追加しようとしました。


```plain text
example-sa@example-project.iam.gserviceaccount.com
```


ところが、追加しようとすると次のようなエラーになりました。


```plain text
このメールアドレスは Google アカウントと一致しません
```


この状態のまま、サービスアカウントを impersonate して Analytics Admin API を叩くと、たとえば custom dimensions の取得でも 403 になります。


```plain text
GET https://analyticsadmin.googleapis.com/v1alpha/properties/123456789/customDimensions failed: 403
{
  "error": {
    "code": 403,
    "message": "The caller does not have permission",
    "status": "PERMISSION_DENIED"
  }
}
```


## 原因の切り分け


今回ややこしかったのは、権限が少なくとも2層あることです。

- GCP プロジェクトの IAM
- GA4 プロパティのアクセス管理

たとえば、以下のような GCP IAM ロールは必要になることがあります。


```bash
gcloud iam service-accounts add-iam-policy-binding \
  example-sa@example-project.iam.gserviceaccount.com \
  --member="user:you@example.com" \
  --role="roles/iam.serviceAccountTokenCreator"

gcloud projects add-iam-policy-binding example-project \
  --member="serviceAccount:example-sa@example-project.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageConsumer"
```


しかし、これはあくまで GCP 側の権限です。GA4 プロパティの `properties/123456789` に対してサービスアカウントを Editor として追加する設定ではありません。


Google Analytics Admin API には AccessBinding というリソースがあり、これは「ユーザーとロールの紐付け」を account または property に対して表すものです。公式ドキュメントでも `roles` には `predefinedRoles/viewer`、`predefinedRoles/analyst`、`predefinedRoles/editor`、`predefinedRoles/admin` などを指定できると説明されています。


[https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/accounts.accessBindings](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/accounts.accessBindings)


## プロパティIDを確認する


API で指定するのは Measurement ID ではなく、GA4 のプロパティIDです。


GA の URL が次のようになっている場合:


```plain text
https://analytics.google.com/analytics/web/#/a190559623p523630999/...
```


この中の意味は次の通りです。


```plain text
a190559623  = アカウントID
p523630999  = プロパティID
```


API では `p` を外して、次のように指定します。


```plain text
properties/523630999
```


`G-XXXXXXXXXX` のような Measurement ID とは別なので注意してください。


## 回避策: API Explorer で Access Binding を作る


一番手早かったのは、Google Analytics Admin API の API Explorer を使う方法です。


使う API はこれです。


[https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.accessBindings/create](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.accessBindings/create)


`parent` には対象の GA4 プロパティを指定します。


```plain text
properties/YOUR_PROPERTY_ID
```


Request body には、追加したいサービスアカウントとロールを指定します。


```json
{
  "user": "example-sa@example-project.iam.gserviceaccount.com",
  "roles": ["predefinedRoles/editor"]
}
```


Custom dimensions や key events など、GA4 の設定を作成・変更する用途なら `predefinedRoles/editor` が必要になることが多いです。読み取りだけなら用途に応じて `viewer` や `analyst` を検討してください。


## API Explorer の Credentials は OAuth だけでよい


API Explorer の下部に Credentials のチェック欄があります。


ここでは `Google OAuth 2.0` だけをオンにします。`API key` はオフでよいです。


理由は、この操作が「ログイン中の Google アカウントの GA4 管理権限で、GA4 プロパティのアクセス管理を変更する」ものだからです。API key は今回のような認可付きの管理操作には使いません。


`Show scopes` を開いて、少なくとも次の scope が入っていることを確認します。


```plain text
https://www.googleapis.com/auth/analytics.manage.users
```


その状態で `Execute` を押し、対象の GA4 プロパティに対して管理権限を持つ Google アカウントで認可します。


成功すると、サービスアカウントが GA4 プロパティのアクセス管理に追加されます。


## `gcloud auth print-access-token --scopes=...` で詰まる場合


当初は CLI から次のようにトークンを取ろうとしました。


```bash
gcloud auth print-access-token \
  --scopes=https://www.googleapis.com/auth/analytics.manage.users
```


しかし、環境によっては次のように失敗します。


```plain text
ERROR: (gcloud.auth.print-access-token) Invalid value for [--scopes]: Invalid scopes value.
```


Google Cloud の ADC トラブルシュートにも、Google Cloud 外のサービス向け scope を追加する場合は、OAuth Client ID を用意して `--client-id-file` を使う方法などが案内されています。


[https://docs.cloud.google.com/docs/authentication/troubleshoot-adc#access_blocked_when_using_scopes](https://docs.cloud.google.com/docs/authentication/troubleshoot-adc#access_blocked_when_using_scopes)


今回のように Access Binding を1回作るだけなら、API Explorer で実行するのが一番早いと思います。


## 追加後の確認


サービスアカウントを GA4 プロパティに追加できたら、改めてサービスアカウント経由で Admin API を実行します。


たとえば、サービスアカウントを impersonate するスクリプトなら次のような形です。


```bash
pnpm ga4:push -- \
  --impersonate-service-account example-sa@example-project.iam.gserviceaccount.com
```


ここで `customDimensions` や `customMetrics` の一覧取得が 403 ではなく通るようになれば、GA4 プロパティ側の権限問題は解消しています。


CustomDimension の作成 API は、公式ドキュメント上も `https://www.googleapis.com/auth/analytics.edit` scope を要求します。


[https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.customDimensions/create](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.customDimensions/create)


つまり、実際に設定を作る段階では、サービスアカウントに GA4 プロパティ上の十分なロールが付いていることと、発行するアクセストークンに `analytics.edit` scope が含まれていることの両方が必要です。


## よくあるエラー


### `The caller does not have permission`


GA4 プロパティ側の Access Binding が足りない可能性があります。


GCP IAM で `roles/firebase.analyticsAdmin` や `roles/serviceusage.serviceUsageConsumer` を付けても、それだけでは GA4 プロパティのアクセス管理にユーザーとして追加されたことにはなりません。


### `USER_PROJECT_DENIED`


`x-goog-user-project` に指定した GCP プロジェクトを使う権限が足りないときに出ることがあります。この場合は、サービスアカウントに `roles/serviceusage.serviceUsageConsumer` を付けると解消することがあります。


```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/serviceusage.serviceUsageConsumer"
```


ただし、これは quota project 利用権限の話であり、GA4 プロパティの Access Binding とは別です。


### API Explorer で API key もチェックしている


今回の操作では API key は不要です。`Google OAuth 2.0` だけを使います。


### Measurement ID を指定している


`G-XXXXXXXXXX` ではなく、GA4 プロパティIDを指定します。API の `parent` は `properties/123456789` の形式です。


## 参考

- Google Analytics Admin API: `properties.accessBindings.create`

    [https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.accessBindings/create](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.accessBindings/create)

- Google Analytics Admin API: `AccessBinding`

    [https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/accounts.accessBindings](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/accounts.accessBindings)

- Google Analytics Admin API: `properties.customDimensions.create`

    [https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.customDimensions/create](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.customDimensions/create)

- Google Cloud: Troubleshoot your ADC setup

    [https://docs.cloud.google.com/docs/authentication/troubleshoot-adc#access_blocked_when_using_scopes](https://docs.cloud.google.com/docs/authentication/troubleshoot-adc#access_blocked_when_using_scopes)

- GA4でサービスアカウントが追加できないエラーの回避手順

    [https://www.okamomedia.tokyo/articles/ga4-service-account-add-error-bug](https://www.okamomedia.tokyo/articles/ga4-service-account-add-error-bug)

- Google Analytics ヘルプコミュニティの関連スレッド

    [https://support.google.com/analytics/thread/428546868/ga4%E3%83%97%E3%83%AD%E3%83%91%E3%83%86%E3%82%A3%E3%81%AE%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E7%AE%A1%E7%90%86%E3%81%AB%E3%82%88%E3%82%8B%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E8%BF%BD%E5%8A%A0%E3%81%AB%E3%81%8A%E3%81%84%E3%81%A6%E3%80%81%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%AB%E3%82%A6%E3%83%B3%E3%83%88%E3%81%AE%E3%83%A1%E3%83%BC%E3%83%AB%E3%82%A2%E3%83%89%E3%83%AC%E3%82%B9%E3%82%92%E5%85%A5%E5%8A%9B%E3%81%97%E3%81%9F%E3%81%A8%E3%81%93%E3%82%8D%E3%80%8C%E3%81%93%E3%81%AE%E3%83%A1%E3%83%BC%E3%83%AB%E3%82%A2%E3%83%89%E3%83%AC%E3%82%B9%E3%81%AF-google-%E3%82%A2%E3%82%AB%E3%82%A6%E3%83%B3%E3%83%88%E3%81%A8%E4%B8%80%E8%87%B4%E3%81%97%E3%81%BE%E3%81%9B%E3%82%93%E3%80%8D%E3%81%A8%E3%81%AA%E3%82%8A%E7%99%BB%E9%8C%B2%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84%E3%80%82?hl=ja](https://support.google.com/analytics/thread/428546868/ga4%E3%83%97%E3%83%AD%E3%83%91%E3%83%86%E3%82%A3%E3%81%AE%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E7%AE%A1%E7%90%86%E3%81%AB%E3%82%88%E3%82%8B%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E8%BF%BD%E5%8A%A0%E3%81%AB%E3%81%8A%E3%81%84%E3%81%A6%E3%80%81%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%AB%E3%82%A6%E3%83%B3%E3%83%88%E3%81%AE%E3%83%A1%E3%83%BC%E3%83%AB%E3%82%A2%E3%83%89%E3%83%AC%E3%82%B9%E3%82%92%E5%85%A5%E5%8A%9B%E3%81%97%E3%81%9F%E3%81%A8%E3%81%93%E3%82%8D%E3%80%8C%E3%81%93%E3%81%AE%E3%83%A1%E3%83%BC%E3%83%AB%E3%82%A2%E3%83%89%E3%83%AC%E3%82%B9%E3%81%AF-google-%E3%82%A2%E3%82%AB%E3%82%A6%E3%83%B3%E3%83%88%E3%81%A8%E4%B8%80%E8%87%B4%E3%81%97%E3%81%BE%E3%81%9B%E3%82%93%E3%80%8D%E3%81%A8%E3%81%AA%E3%82%8A%E7%99%BB%E9%8C%B2%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84%E3%80%82?hl=ja)

