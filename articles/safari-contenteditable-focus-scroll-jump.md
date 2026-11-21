---
作成日時: "2026-11-21T16:56:00.000Z"
status: 公開済み
platform: Zenn
最終更新日時: "2026-11-21T17:05:00.000Z"
publication_name: null
type: tech
published: true
topics:
  - JavaScript
  - TypeScript
  - Mac
  - 個人開発
  - AIコーディング
emoji: 🦘
slug: safari-contenteditable-focus-scroll-jump
名前: Safari で contentEditable に focus() するとページ先頭へ飛ぶ問題の対処まとめ
title: Safari で contentEditable に focus() するとページ先頭へ飛ぶ問題の対処まとめ
notcms_id: 41f2c5fe-b55c-8123-93f0-ffa754d7cc8b
notcms_db: techblog
notcms_last_synced_at: "2026-11-21T17:35:23.931Z"
---

## 結論


Safari で、タスクの最後の行で Enter を押して新しい行（contentEditable）へ `focus()` すると、ページが先頭へ飛ぶことがありました。次のようにして直りました。

- `focus({ preventScroll: true })` で、ブラウザによる自動スクロールを止める
- キャレットを置いたあとにページが動いていたら、元の `scrollY` へ戻す
- 行だけを `scrollIntoView({ block: "nearest" })` で最小限寄せる
- タッチ端末（`pointer: coarse`）では止めない。止めるとキーボードが開いたあとの追従まで止まり、行がキーボードの裏に隠れる

なお、自動のテストでは最後まで一度も再現できず、飛ぶことも直ったことも、実際の環境での目視でしか確かめられていません。この記事の原因は、その目視の結果からの推定です。


## 前提

1. 個人開発の TODO アプリ（ClearTODO）の Web 版。タスクのタイトルは contentEditable の div で、その場で編集する
2. Notion のチェックボックス一覧のように、Enter で下に空の行を足し、そこへフォーカスを移す
3. 報告があった環境は Mac の Safari の「Dock に追加」した Web アプリで、実データでサインインした状態
4. 症状は「一番下のタスクで Enter → 一瞬でページの一番上へ飛ぶ」

Enter の処理はおおむね次のとおりです。


```typescript
// タイトルの onKeyDown
element.blur();          // blur でタイトルを保存する
onAddAfter(task.id);     // 下に空の行を足す

// onAddAfter の中
flushSync(() => { newId = addTask("", afterId); });
editable.focus();        // 新しい行のタイトルへ
placeCaret(editable, "end");
```


## ハマりどころ：自動では再現せず、目視でしか確かめられない


| 試したこと                                                                            | 結果                     |
| -------------------------------------------------------------------------------- | ---------------------- |
| Chromium（Playwright）、幅 1280 / 390、30 件の一番下で Enter                                | 飛ばない。scrollY は前後とも同じ   |
| Mac 上の Playwright WebKit、Today / Later、幅 1280 / 390                              | 飛ばない。scroll イベントも 0 件  |
| 本物の Safari を safaridriver で操作（実キー入力、修正前と修正後、Today / Later、文字を足してから Enter、計 16 回） | 修正前でも飛ばない              |
| Safari の飛びを模して、`Selection.addRange` のたびに `scrollTo(0, 0)` する（Chromium）           | 修正前は先頭へ飛び、修正後は元の位置に留まる |
| 修正を本番に出して、Dock の Web アプリで目視で確かめる                                                 | 飛ばなくなった（目視）            |


自動で試せたのはどれもサインインなしのローカルモードでした。Dock に追加した Web アプリは WebDriver で動かせません。実際の環境と同じ条件は自動では作れず、症状も修正の効果も、実際の環境で目で見て確かめるしかありませんでした。


### 本物の Safari を自動で動かすまでの手間


これだけで時間がかかったので、手順を残しておきます。

- Safari の「設定 > 詳細 > Web 開発者用の機能を表示」をオンにし、「開発 > リモートオートメーションを許可」をオンにする（または `safaridriver --enable`）
- 許可する前から起動していた Safari が残っていると、`The session timed out while connecting to a Safari instance` で接続できない。Safari を一度 ⌘Q で完全に終了する
- 画面操作系のツール（スクリーンショットとクリック）では、ブラウザは「見るだけ」の扱いで、キー入力できないものがある
- Playwright の WebKit は Safari そのものではない。Playwright の WebKit で再現しなくても、Safari で起きないとは言えない

## 考えられる原因（未検証）


Safari（WebKit）は、contentEditable にフォーカスしたり選択範囲を置いたりすると、キャレットを見せるために自前でスクロールします。新しい行はタイトルが空で、プレースホルダーは `::before` の疑似要素で出しています。空の編集領域では、キャレットの位置をうまく求められないことがあります。そうなると位置が (0, 0) 扱いになり、そこを見せようとしてページ先頭へスクロールした、という見立てです。


Chromium で測ったときは新しい行に高さがあり、画面内に出ていました。Safari の実環境で、キャレットの矩形がどうなっていたかは確かめられていません。


## 選択肢


### A. ブラウザのスクロールを止めて、自分で寄せる（採用）

- 仕組み：`focus({ preventScroll: true })` のあと、動いていたら元の位置へ戻し、行だけを `nearest` で寄せる。次のフレームでも確かめる
- メリット：原因がフォーカス時の自動スクロールなら、確実に止まる。Chrome では動きが変わらない
- デメリット：iPhone ではキーボードが開いたあとの追従まで止まる。そのためタッチ端末は除外が必要

### B. Enter の `blur()` をやめる

- 仕組み：フォーカスがいったん body へ落ちないよう、blur を経由せずに次の行へ移す
- メリット：フォーカスの移り方が素直になる
- デメリット：blur での保存処理に頼っているので、保存の流れを作り直す必要がある。原因が blur だという証拠もなかった

### 番外. 空の行に高さや中身を持たせる

- 空の行にゼロ幅スペースを入れる、などで、キャレットの位置を求められるようにする
- 見立てが正しければ根本対策に近い。ただ、入力内容に余計な文字が混ざり、検証もできないので見送った

## 比較


| 案                      | 飛びを止められるか               | 副作用               | 実装の手間 |
| ---------------------- | ----------------------- | ----------------- | ----- |
| **A. スクロールを止めて自分で寄せる** | **フォーカス時の自動スクロールなら止まる** | **iPhone は除外が必要** | **小** |
| B. blur() をやめる         | 原因が blur なら             | 保存の流れを作り直す        | 中     |
| 番外. 空の行に中身を入れる         | 見立てが正しければ               | 入力に余計な文字          | 中     |


## 採用した実装


```typescript
export function focusEditableInPlace(
  element: HTMLElement,
  position: CaretPosition,
) {
  // タッチ端末では、キーボードが開いたあとの追従をブラウザに任せる
  if (window.matchMedia?.("(pointer: coarse)").matches) {
    element.focus();
    placeCaret(element, position);
    return;
  }
  const target = element.closest<HTMLElement>(".task") ?? element;
  const keepInPlace = (top: number) => {
    if (window.scrollY !== top) {
      window.scrollTo({ top, behavior: "instant" });
    }
    target.scrollIntoView?.({ block: "nearest" });
  };
  const before = window.scrollY;
  element.focus({ preventScroll: true });
  placeCaret(element, position);
  keepInPlace(before);
  // 選択範囲を見せるスクロールが遅れて走ったときのために、次のフレームでも確かめる
  const settled = window.scrollY;
  window.requestAnimationFrame(() => {
    if (document.activeElement !== element || !target.isConnected) return;
    if (window.scrollY === settled) return;
    const rect = target.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      keepInPlace(settled);
    }
  });
}
```


細かい知見です。


| 点                           | 内容                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `preventScroll` だけでは足りない可能性 | Safari は選択範囲の設定（`addRange`）でもスクロールする。そのため、置いたあとに位置を戻す処理も入れた                               |
| `nearest` を使う               | 行が見えていれば動かさない。見出しが sticky なら、`scroll-padding-top` を設定しておけば隠れない                            |
| iPhone を除外する理由              | 同期的に寄せた時点では、まだキーボードが開いていない。開いて見える範囲が縮んだあとに追従できず、行が隠れる（コードレビューで指摘された）                      |
| jsdom でのテスト                 | contentEditable だけではフォーカスできないので `tabIndex` を付ける。`matchMedia` はないので `vi.stubGlobal` で差し替える |


## まとめ

- contentEditable の行へ移るときにページが飛ぶなら、まず `focus({ preventScroll: true })` と、位置を戻して `nearest` で寄せる処理を入れる
- タッチ端末では止めない。キーボードの追従はブラウザに任せる
- Playwright の WebKit や自動操作の Safari で再現しなくても、Dock の Web アプリや実データでは起きることがある。自動で再現できないときは、副作用のない安全策を先に出して、実際の環境で目視で確かめるのが早かった

自動では最後まで再現できず、飛ぶことも直ったことも人間の目で見て確かめるしかなかった、という少しすっきりしない結末でした。

