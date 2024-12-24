---
title: "Honoを個人開発でフル活用して便利だったところ"
emoji: "❤️‍🔥"
type: "tech"
topics: ["Hono","個人開発","Cloudflare","NotCMS","contest2024"]
published: true
---

## はじめに


こんにちは、きうきうと申します。個人開発でいろんなものを作っており、先日、NotionをブログのHeadless CMSにする「[NotCMS](https://notcms.com/)」を[リリース](https://x.com/qqpann/status/1868468085184995556)しました。


NotCMSの開発においてHonoをバックエンドとしてフル活用したので、その活用事例に照らして、便利だと思った点・使い方を紹介していきたいと思います。


## NotCMSの構成


![%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2024-12-25_0.11.39.png](https://api.notcms.com/v1/images/a1098c50-ab92-4039-91c3-f41298d5766a)


NotCMSを開発するにあたって、個人開発として持続可能なサービスにすることを技術選定の一つのポイントとしました。


そのため、料金形態が安いCloudflareをインフラとし、それと互換性が高く気になっていた技術である Honoを採用しました。


NotCMSはNotionを簡単に使えて型安全なSDKでアクセスできるようにするというコンセプトですが、そのコンセプト自体、HonoやDrizzleからインスパイアされています。


## Honoの推しポイント


### 1. 型の共有


Honoの一番の特徴であり恩恵はなんと言ってもRPCの型支援にあるでしょう。


バックエンドで `hono` 、フロントエンドで `hono/client` を使い、API仕様を `export type AppType = typeof route` で共有することで型安全に開発を行うことができます。


特にReactでは、


```typescript
import { InferResponseType, hc } from 'hono/client'
import useSWR, { mutate } from 'swr'

export function useVersions(wsId: string, dbId: string) {
  const client = hc<AppType>('/')
  const $get = client.api.v1.ws[':ws_id'].db[':db_id'].page_snapshots.$get
  const $post = client.api.v1.ws[':ws_id'].db[':db_id'].page_snapshots.$post
  type PageSnapshot = InferResponseType<typeof $get>['pageSnapshots'][0]

  const { data } = useSWR(`/ws/${wsId}/db/${dbId}/page_snapshots`, async () => {
    const res = await $get({
      param: {
        ws_id: wsId,
        db_id: dbId,
      },
    })
    return await res.json()
  })
  const pageSnapshots = data?.pageSnapshots ?? []

  const createSnapshots = async (pageIds: string[] | undefined) => {
    const res = await $post({
      param: {
        ws_id: wsId,
        db_id: dbId,
      },
      json: {
        pageIds: pageIds,
      },
    })
    if (res.status === 200) {
      await mutate(`/ws/${wsId}/db/${dbId}/page_snapshots`)
    }
    const data = await res.json()
    if (data.error != null) {
      throw new Error(data.error)
    }
    return data
  }

  return {
    pageSnapshots,
    createSnapshots,
  }
}
```


のようにSWRと組み合わせてfeatureごとにカスタムフックを作成すると見通しが良いでしょう。


また、上記の例の8行目にもある通り、 `InferResponseType` を用いれば帰ってくる値の型を単独で取り出して使えるようになり、API側で一度定義すれば型の更新が完結するという体験が得られるのでおすすめです。


https://hono.dev/docs/guides/rpc


### 2. Cloudflareとの互換性


今回初めてCloudflareをインフラとして採用しましたが、


```typescript
// env.d.ts
interface CloudflareEnv {
  ENV: string
  SOME_SECRET: string
  DB: D1Database
  BUCKET: R2Bucket
}
```


```typescript
type Env = {
  Bindings: CloudflareEnv
  Variables: {
    workspace_id: string
  }
}
new Hono<Env>()
```


のようにCloudflareの環境変数を指定したり、Cloudflare D1, R2などをBindingsに指定することが最初から考慮されていて、Honoのおかげで入門が容易でした。


https://hono.dev/docs/getting-started/cloudflare-workers


### 3. Middlewareの定義


Middlewareの定義方法が公式ドキュメントで解説されており、はじめやすかったです。


```typescript
const authorizeWs = createMiddleware(async (c, next) => {
  const db = getDatabase(c.env.DB)
  const { secret } = await authorize(c, db)

  const workspace_id = c.req.param('workspace_id')

  c.set('workspace_id', workspace_id)
  c.set('db', db)

  await next()
})
protectedRoute.use('/ws/:workspace_id/*', authorizeWs)
```


ユースケースとしては、このように、認証を行なってユーザーに付随する情報をコンテキストに追加する処理があるルート以下に全て必要な時に、活用できました。


https://hono.dev/docs/guides/middleware


### 4. OpenAPIがすぐ作れる


3rd-party middlewareを使えば、APIを書いた側からOpenAPIとしてAPI定義を公開することができます（[notcms API](https://api.notcms.com/v1/docs/ui)）。


https://hono.dev/examples/zod-openapi


## まとめ


Honoを導入したことで、個人開発でストレスなくAPI提供型のサービスを開発することができました。ぜひ皆さんもHonoを使って開発してみてください！

