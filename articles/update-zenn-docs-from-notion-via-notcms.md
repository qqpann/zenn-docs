---
title: "Zennの記事をNotionから更新するGitHub Actionを作った話 [NotCMS]"
emoji: "⚡️"
type: "tech"
topics: ["GitHub Actions","Zenn","NotCMS","Webhook","Hono"]
published: false
---

皆さん、どのように技術記事を書いていますか？


ZennやQiitaでは、GitHubと連携して、GitHubリポジトリで記事を管理してそのまま連携・公開できる機能が提供されています。


開発者としてはGitHubで管理することはイケているような気がするし、ワンチャン修正依頼のPRがいつか来ることを期待する気持ちから、GitHub連携を採用したいところですよね！（決めつけ）


しかし、GitHub連携でちゃんとしたエディターで記事を書こうとするときの心理的ハードルを感じることもあるのではないでしょうか：

- まず机に向かうのが面倒
- ちゃんとしたエディタを開くのが面倒
- コミットして管理するのが面倒

机に向かわずゴロゴロしながらでも書けて、ちゃんとしたエディタで、コミットまで自動化する方法はないものか……


せや、Notionで書けばいい！


しかし、Notion APIを扱うのは手軽ではないし、[Notion Webhookは未完成](https://x.com/qqpann/status/1870068710117126542)でまだGitHub Actionsを呼び出すことができません。


Notion APIの煩雑さを回避するには、NotionをHeadless CMSにするサービス「[NotCMS](https://www.notcms.com/ja/home)」が便利です。また、Notion Webhookを補完する機能もベータ提供しています。


## 方法


Notionで書いてGitHub Actionsで同期するコードをさくっと書けば大丈夫。そう、NotCMSならね💡


### 0. Notionテンプレートを複製


![%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2024-12-21_1.04.50.png](https://api.notcms.com/v1/images/1205f104-3e8a-4e8c-acbb-3be36e6f70c2)


https://shadowshell.notion.site/Zenn-Teckblog-Template-1622c5feb55c80f59b52f92e41c34caa


このページから、テンプレートを複製してください。素早く始めることができます。


### 1. GitHubのテンプレートからリポジトリを作成


https://github.com/qqpann/zenn-docs-template


「Use this template」ボタンをクリックするとテンプレートからリポジトリを開始できます。


### 2. NotCMSにNotionを連携


NotCMSはNotionを連携してブログなどのHeadless CMSにするサービスです。


https://dash.notcms.com


上記のダッシュボードにアクセスします。

1. まずアカウント登録してログインします。
2. ワークスペースを新しく作成します。
3. この時、Notion連携を求められるため、先ほど複製したテンプレートの入っているページを連携範囲に指定します。
4. ワークスペースが作成されたら、データベースを追加します。NotionのデータベースのURLをコピーして、追加できます。

### 3. NotCMSのキーを取得し、環境変数に追加


次に、シークレットキーを取得します。


ワークスペースのトップページから、「ワークスペースのシークレット」ページに移動し、シークレットを作成します。


```toml
NOTCMS_SECRET_KEY=<your_secret_key>
NOTCMS_WORKSPACE_ID=<your_workspace_id>
```


この形式で、環境変数をコピーします。


 `.env` ファイルに追加します。


追加後、プロパティのスキーマを同期するため、


```bash
npx notcms-kit pull
```


を実行して`src/notcms/schema.ts`を更新します。


さらに、GitHub Actionsで必要になるため、GitHubリポジトリ設定から、シークレットとして追加します。


![%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2024-12-21_1.47.44.png](https://api.notcms.com/v1/images/74c579fe-71c5-4cc7-8ecd-569ba547cdc9)


### 4. GitHub Tokenの権限を追加


テンプレートに入っているワークフローでは、NotCMSからページを取得し、そのままコミットします。そのため、GITHUB_TOKENの権限を追加する必要があります。


リポジトリの設定（Settings）＞Code and automation＞Actions＞Generalで、


![%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2024-12-21_3.04.18.png](https://api.notcms.com/v1/images/88041f33-dded-4974-9922-b456d201b24f)


「Read and write permissions」を付与します。


### 5. ZennでGitHub連携を設定


https://zenn.dev/zenn/articles/connect-to-github


などのやり方を参照して設定します。


### 6. GitHub Actionsを呼び出すためのGitHubトークンを取得し、Notion Webhookに追加


例えば1日一回のCron実行をスケジュールしておくこともできますが、それでは遅いと感じる場合は、Notion Webhookでプロパティの変更に従ってWebhookをトリガーすることでGitHub Actionsを実行し、記事データを同期することができます。


しかし、Notion Webhookは現在（2024年12月時点）GitHub Actionsに対応していません。


というのも、Notion WebhookにはBodyを追加することができず、GitHub Actionsをトリガーするために必要な[必須プロパティであるevent_type](https://docs.github.com/ja/rest/repos/repos?apiVersion=2022-11-28#create-a-repository-dispatch-event)を指定できないからです。


そこで、NotCMSではwebhookリクエストにevent_typeを追加して送信するフォワードAPIを追加しています。


```toml
URL: https://api.notcms.com/beta/forward_github_actions/OWNER/REPO?event_type=sync_zenn
KEY:
  Authorization: Bearer github_pat_***
```


`OWNER` , `REPO` , `github_pat_***` を独自の値に変換して利用すれば、Notion WebhookからGitHub Actionsをトリガーできるようになります。


フォワードAPIの中身は後述のAppendix2に示しますので、自分でホストすることもできます。


## まとめ


上記の手順で、「Notionで記事を随筆して、Zennに公開する」体験が完成しました。


ぜひこのワークフローを活用して記事を書いてみてください。


※この記事は、このワークフローを利用して、Notionで随筆されました。


また、同じ方法を利用して、Qiitaの記事の管理や、静的生成されたWebサイトを管理することも可能ですので、ぜひ試してみてください。


## Appendix1：Notionから記事を同期するコードの解説


コードの主要部分は次のとおりです：


```typescript
import fs from "fs";
import path from "path";
import { nc } from "../src/notcms/schema";

const outputDir = path.resolve("articles");

const fetchNotCMSData = async () => {
  try {
    const [pages] = await nc.query.techblog.list();

    // 各ページのMarkdownを生成
    for (const _page of pages) {
      const [page] = await nc.query.techblog.get(_page.id);

      const slug = page.properties.slug;
      const fileName = path.join(outputDir, `${slug}.md`);
      const content = `---
title: "${page.title.trim()}"
emoji: "${page.properties.emoji}"
type: "${page.properties.type}"
topics: ${JSON.stringify(page.properties.topics ?? [])}
published: ${page.properties.published ? "true" : "false"}
---
${page.content}`;

      fs.writeFileSync(fileName, content);
    }
  } catch (error) {
    process.exit(1);
  }
};

fetchNotCMSData();
```


Notion APIを直接扱うのは煩雑で大変ですが、NotCMSによって、


```typescript
const [pages] = await nc.query.techblog.list();
const [page] = await nc.query.techblog.get(_page.id);
```


このようにlistとgetの二つの関数で簡潔にわかりやすくデータを取得することができました。


さらに、プロパティのデータが型付で取得されるので、 `topics: ${JSON.stringify(page.properties.topics ?? [])}` などを書く際も、型が `string[] | null` であるとわかった上で安心して対処することができるました。Zenn以外のプラットフォームに対応しようとする時も、

1. Notionでプロパティを編集
2. `npx notcms-kit pull` のコマンドを叩いてスキーマを同期する

の2ステップだけで型を更新でき、柔軟にHeadless CMSとして活用できます。


また、GitHub連携の場合画像をどのように管理するかという問題も、NotCMSが画像を配信することで解決されています。（実際、画像処理に関するコードを書く必要がありませんでした）


## Appendix2：Forward Webhook to GitHub Actions


```typescript
const route = new Hono()
route.post('/beta/forward_github_actions/:owner/:repo', async (c) => {
  const owner = c.req.param('owner')
  const repo = c.req.param('repo')
  const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/dispatches`

  // 元のリクエストからAuthorizationヘッダを取得
  const originalAuthorization = c.req.header('Authorization')
  if (!originalAuthorization) {
    return c.text('No Authorization header found', 400)
  }

  // クエリパラメータからevent_typeを取得、なければ"sync"を使用
  const eventType = c.req.query('event_type') || 'sync'

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: originalAuthorization,
    'X-GitHub-Api-Version': '2022-11-28',
    // https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?apiVersion=2022-11-28#user-agent
    'User-Agent': `${owner}/${repo}/1.0.0`,
  }

  // Webhookリクエストに基づいてリクエストボディを構築
  const body = {
    event_type: eventType,
  }

  // GitHub APIにリクエストを送信
  try {
    const response = await fetch(githubApiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return c.text(`GitHub API request failed: ${errorText}`, 500)
    }

    return c.text('GitHub API request sent successfully', 200)
  } catch (error) {
    return c.text('Internal server error', 500)
  }
})
```


このコードを使えば、Notion WebhookからGitHub Actionsへの変換を自前で行うことができます。


## 参考


https://zenn.dev/zenn/articles/zenn-cli-guide


https://zenn.dev/zenn/articles/connect-to-github


https://zenn.dev/open8/articles/zenn-publication-github


↑publicationを指定したい場合はpublication_nameを入れれば良さそうです


https://notcms.com


---


https://github.com/qqpann/notcms


https://x.com/qqpann/status/1868468085184995556


NotCMSを運営しています。もし気に入っていただけましたら、GitHubスターやRTにて応援していただけると嬉しいです！

