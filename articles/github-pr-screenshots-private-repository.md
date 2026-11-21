---
作成日時: "2026-07-15T23:19:00.000Z"
status: レビュー待ち
platform: Zenn
最終更新日時: "2026-11-07T10:49:00.000Z"
publication_name: null
type: tech
published: false
topics: []
emoji: 🖼️
slug: github-pr-screenshots-private-repository
名前: private repositoryのPRにスクリーンショットを載せる方法
title: private repositoryのPRにスクリーンショットを載せる方法
notcms_id: 39e2c5fe-b55c-81af-84e4-f11e7710b844
notcms_db: techblog
notcms_last_synced_at: "2026-11-21T17:35:23.930Z"
---

UI の変更を含む Pull Request では、Before / After のスクリーンショットがあるとレビューがかなり楽になります。


しかし、スクリーンショットを PR に載せるたびに、次のような小さな問題が発生します。

- 画像を main ブランチへコミットすると、製品コードの履歴へレビュー用画像が混ざる
- 一時的な外部ストレージへ置くと、後からリンク切れする可能性がある
- private repository の画像なので、誰でも見られる場所へ公開したくない
- GitHub の画面へ毎回ドラッグ＆ドロップする方法では、CLI や自動化から扱いにくい

そこで、画像専用の `pr-assets` ブランチを作り、main には一度もマージせず、画像置き場として維持することにしました。


この記事ではスクリーンショットの撮影方法ではなく、**撮影済みの画像を private repository の PR へ載せる仕組み**に絞って紹介します。


## 結論：マージしない画像専用ブランチを維持する


構成は次のとおりです。

1. `pr-assets` という画像専用ブランチを作る
2. このブランチは main と履歴を共有しない orphan branch にする
3. PR ごとの画像を `pr-assets` へ追加する
4. 画像を追加した commit の SHA を使って raw URL を作る
5. その URL を PR 本文の Markdown に埋め込む
6. `pr-assets` は main へマージせず、削除もしない

最初の `pr-assets` commit は親 commit を持ちません。そのため main から分岐した通常の feature branch ではなく、独立した履歴を持つ orphan branch になります。


2 回目以降のアップロードでは、最新の `pr-assets` commit を親にして画像を追加します。つまり「毎回 orphan branch を作り直す」のではなく、**main とは独立した 1 本の長寿命ブランチを育て続ける**運用です。


```plain text
main
A---B---C---D

pr-assets
X---Y---Z
```


この 2 本の履歴は交わりません。`pr-assets` をマージ対象にしないため、画像が PR のコード差分へ混ざることもありません。


## なぜ commit SHA 固定の URL を使うのか


PR 本文には、次の形式の URL を埋め込みます。


```plain text
https://github.com/OWNER/REPO/raw/COMMIT_SHA/pr80-before.png
```


ブランチ名ではなく commit SHA を使う理由は、URL の参照先を固定するためです。


`pr-assets` ブランチへ新しい画像を追加しても、過去の commit は変わりません。したがって、過去の PR が後から別の画像を表示してしまうことを防げます。


一方で、`pr-assets` ブランチ自体を削除すると、private repository 上での画像参照を維持できなくなる可能性があります。このブランチは一時ブランチではなく、過去 PR の添付画像を保存する資産として扱います。


## 実装


package.json では、実装ファイルを呼び出す短い入口だけを定義しています。


```json
{
  "scripts": {
    "pr:assets": "tsx scripts/pr-assets.ts"
  }
}
```


重要なのは `pnpm` のコマンド名ではなく、その中で何をしているかです。以下が `scripts/pr-assets.ts` の実装です。


```typescript
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const BRANCH = "pr-assets";

const { values, positionals } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
  },
  allowPositionals: true,
});

if (positionals.length === 0) {
  console.error("usage: pnpm pr:assets <image...> [--dry-run]");
  process.exit(1);
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

// origin から owner/repo を得る（HTTPS / SSH 両対応）
const remoteUrl = git("remote", "get-url", "origin");
const remoteMatch = remoteUrl.match(
  /github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/,
);

if (!remoteMatch) {
  console.error(`origin is not a GitHub remote: ${remoteUrl}`);
  process.exit(1);
}

const [, owner, repo] = remoteMatch;

// 既存の pr-assets ブランチがあれば、その内容を引き継ぐ
let parent: string | null = null;

try {
  execFileSync("git", ["fetch", "origin", BRANCH], {
    stdio: "ignore",
  });
  parent = git("rev-parse", `origin/${BRANCH}`);
} catch {
  // ブランチ未作成なら、親を持たない最初の commit を作る
}

type TreeEntry = {
  mode: string;
  sha: string;
  name: string;
};

const entries = new Map<string, TreeEntry>();

if (parent) {
  for (const line of git("ls-tree", parent)
    .split("\n")
    .filter(Boolean)) {
    const match = line.match(
      /^(\d+) blob ([0-9a-f]+)\t(.+)$/,
    );

    if (match) {
      entries.set(match[3], {
        mode: match[1],
        sha: match[2],
        name: match[3],
      });
    }
  }
}

const added: string[] = [];

for (const file of positionals) {
  if (!fs.existsSync(file)) {
    console.error(`file not found: ${file}`);
    process.exit(1);
  }

  const name = path.basename(file);

  // Markdown の URL にそのまま埋め込める名前だけ許可する
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    console.error(
      `"${name}" に URL で安全でない文字が含まれています。` +
        "英数字と . _ - のみのファイル名に変更してください。",
    );
    process.exit(1);
  }

  const sha = git("hash-object", "-w", file);
  const existing = entries.get(name);

  if (existing && existing.sha !== sha) {
    console.error(
      `"${name}" は既に pr-assets に存在し、内容が異なります。` +
        "PR 番号などを付けた別のファイル名を使用してください。",
    );
    process.exit(1);
  }

  entries.set(name, {
    mode: "100644",
    sha,
    name,
  });

  added.push(name);
}

const treeInput = [...entries.values()]
  .map(
    (entry) =>
      `${entry.mode} blob ${entry.sha}\t${entry.name}`,
  )
  .join("\n");

const tree = execFileSync("git", ["mktree"], {
  input: `${treeInput}\n`,
  encoding: "utf8",
}).trim();

const commitArgs = [
  "commit-tree",
  tree,
  "-m",
  `assets: ${added.join(", ")}`,
];

// 既存ブランチがある場合だけ、最新 commit を親にする。
// 初回は -p を付けないので、親を持たない orphan commit になる。
if (parent) {
  commitArgs.push("-p", parent);
}

const commit = git(...commitArgs);

if (values["dry-run"]) {
  console.log(`[dry-run] commit ${commit} (not pushed)`);
} else {
  execFileSync(
    "git",
    ["push", "origin", `${commit}:refs/heads/${BRANCH}`],
    { stdio: "inherit" },
  );
}

console.log("\nPR 本文に貼る Markdown:\n");

for (const name of added) {
  console.log(
    `![${name}](https://github.com/${owner}/${repo}/raw/${commit}/${name})`,
  );
}
```


## 実装のポイント


### 作業ツリーを checkout しない


このスクリプトは `git switch pr-assets` を実行しません。


代わりに、次の Git plumbing command を使います。

- `git hash-object -w`: 画像を blob object として保存する
- `git mktree`: 既存画像と追加画像を含む tree object を作る
- `git commit-tree`: tree から commit object を作る
- `git push <commit>:refs/heads/pr-assets`: 作った commit をブランチへ push する

現在作業中の feature branch、ステージ済みファイル、未コミットの変更には触れません。PR を作っている最中でも、その作業ツリーを汚さず画像だけを別ブランチへ送れます。


### 初回だけ親 commit を付けない


`origin/pr-assets` が存在しない場合、`parent` は `null` のままです。


その場合、`git commit-tree` に `-p` を渡しません。こうして生成された最初の commit は親を持たず、main と無関係な orphan history の起点になります。


既に `pr-assets` がある場合は、最新 commit を `-p` で親に指定します。過去の画像を保持したまま、新しい画像を追加できます。


### 既存の tree を引き継ぐ


最新の `pr-assets` commit に含まれる画像を `git ls-tree` で読み取り、その一覧へ新しい blob を追加して次の tree を作ります。


新しい画像だけで tree を作ると、ブランチの最新版から過去の画像が消えてしまいます。既存 tree を引き継ぐことで、`pr-assets` の先端には常にすべての画像が残ります。


### 同名画像の上書きを拒否する


ファイル名は URL の一部です。既存画像と同じ名前で内容だけ異なるファイルを許すと、どの画像がどの PR のものか分かりにくくなります。


そこで、同じ名前・異なる blob SHA の組み合わせはエラーにしています。


ファイル名には PR 番号を付けます。


```plain text
pr80-before.png
pr80-after.png
```


## 使い方


撮影済みの画像を指定して実行します。


```bash
pnpm pr:assets pr80-before.png pr80-after.png
```


push せず、生成内容だけ確認する場合は `--dry-run` を付けます。


```bash
pnpm pr:assets pr80-before.png pr80-after.png --dry-run
```


成功すると、PR 本文に貼る Markdown が出力されます。


```markdown
![pr80-before.png](https://github.com/OWNER/REPO/raw/COMMIT_SHA/pr80-before.png)
![pr80-after.png](https://github.com/OWNER/REPO/raw/COMMIT_SHA/pr80-after.png)
```


これを PR 本文へ貼ります。


```markdown
## Screenshots

### Before

![Before](https://github.com/OWNER/REPO/raw/COMMIT_SHA/pr80-before.png)

### After

![After](https://github.com/OWNER/REPO/raw/COMMIT_SHA/pr80-after.png)
```


## 最後にブラウザで表示確認する


Markdown の URL が正しいことと、PR 上で画像が表示されることは別です。


private repository の raw URL は、repository を閲覧できるログイン済みユーザーを前提にしています。PR 本文を更新したら、デスクトップ版 GitHub Web で Before / After の両方が実際に表示されることを確認します。


GitHub モバイルアプリでは、raw URL 取得時に認証がうまく引き継がれず、画像が表示されない場合があります。モバイル表示も必須なら、GitHub Web UI へ画像を貼り付けて `user-attachments` の URL を発行する方法へ切り替えます。


## この方式のトレードオフ


良い点は、画像を製品コードから分離しつつ、同じ private repository の権限内で管理できることです。作業ツリーを切り替えないため、CLI のワークフローにも組み込みやすくなります。


一方で、次の制約があります。

- `pr-assets` ブランチを削除できない
- repository の履歴・容量には画像が蓄積する
- private raw URL の表示は GitHub クライアントの認証挙動に依存する
- repository を閲覧できない人には画像も表示できない

この制約が問題になる規模なら、S3 や R2 などの専用オブジェクトストレージを検討した方がよいでしょう。チーム内の private repository で、PR 用画像を少量ずつ残す用途なら、画像専用 orphan branch はシンプルで管理しやすい選択肢です。


## まとめ


この運用の中心は `pnpm pr:assets` というコマンド名ではありません。

- main と履歴を共有しない `pr-assets` ブランチを作る
- そのブランチはマージせず、過去 PR の画像置き場として維持する
- Git plumbing command で作業ツリーを触らず画像を追加する
- commit SHA 固定の raw URL を PR 本文へ埋め込む

という設計が本体です。


スクリーンショットをコード差分へ混ぜず、過去の PR からも参照し続けたい場合に、この方式が使えます。

