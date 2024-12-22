---
title: "Xで他人を猫に変える拡張機能 - nyaxtension"
emoji: "😸"
type: "tech"
topics: ["クソアプリ","Chrome拡張機能","kuromoji","nyartifitial intelligence","個人開発"]
published: false
---

## はじめに


```text
＿人人人人人人＿
＞　にゃーん　＜
￣Y^Y^Y^Y^Y^Y^￣
```


みなさん、人々がにゃーんとつぶやく現象をご存知でしょうか。


一説によると、これは社会性フィルターであり、話したくても話せない心情を表しているのだとか。


しかし社会性フィルターで自制する人々もいる一方で、配慮ない言動でネガティブな感情を拡散してしまう人もいます。


https://x.com/qqpann/status/1858151500582936712


そこで私は閃きました。


自分ではなく、他人を猫にして仕舞えばいいではないか、と。


## 完成したもの


![nyaxtension_keyvisual.jpg](https://api.notcms.com/v1/images/d5e70cad-ac7c-4da9-b852-1a91d9b660ad)


イーロンマスクのイヤミの効いたツイートも一発で変換。


Xを統べる長者番付一位に猫語を喋らせることができます。


![%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2024-12-23_5.54.53.png](https://api.notcms.com/v1/images/3ef0052b-9fa2-4b74-a255-43b160ffde74)


また、ツイートの「…」をクリックしたドロップダウンに「😿興味がないにゃん」ボタンを追加。


クリックすると、興味がないツイートの例として追加されます。


これは拡張機能のアイコンをクリックすると表示されるポップアップで、「興味がないにゃん」をクリックするとそのツイートの内容が「いかにいくつかの例を示します：」の中に入ります。


![%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2024-12-23_5.56.02.png](https://api.notcms.com/v1/images/fe5cf6b3-98f2-4fa8-b4ad-e803d7d21cdd)


また、判定を行うプロンプトの変更も可能です。（「不快の定義：」の部分。デフォルトは1〜3番）


現在Chrome拡張機能で公開すべく審査提出中ですが、数営業日かかるかもしれないとのことですので、遊びたい方はGitHubに公開しますので自前で起動して遊んでみてください！


https://github.com/qqpann/nyaxtension


## 使用した技術


最初の段階で、拡張機能として作ることを決定しました。見る側が導入を選択できるため、自衛手段となりえます。


### 1. 拡張機能を作る


https://github.com/sinanbekar/browser-extension-react-typescript-starter


こちらをベースにしました。


### 2. ツイート文章のエレメントを特定して文章を置き換え


ツイート文章のDOMを特定しテキストを置き換えます。


なおこの際、


```typescript
document.querySelectorAll('[data-testid="tweet"]');
```


このようなセレクターを使用することになりました。


やはりXは名ばかりで今もTwitterなのです。


### 3. LLMで攻撃的なツイートを判定してもらう


Sentiment.jsなども考えたが、処理が固まってしまう問題もあったり、短時間で作り切ることを考慮するとやはりLLMに投げてしまうのがいいと結論づけました。


```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'あなたは返答をすべてJSON形式で出力します。' },
    { role: 'user', content: prompt },
  ],
  response_format: { type: 'json_object' }, // JSONモードを指定
});
```


のようにJSONモードで指定することで結構安定してtrue, falseで結果が得られました。


### 4. NI（nyartifitial intelligence）で猫語に変換


見たくないツイートと判定したら、NIで猫語に変換します。


kuromojiを使用しました。


拡張機能から利用するには、manifestに


```typescript
  web_accessible_resources: [{
      resources: ['dict/*', ...]
```


を登録し、


```typescript
const dicPath = chrome.runtime.getURL('dict');
kuromoji.builder({ dicPath })
```


でパスを取得して辞書を読み込む必要がありました。


### 5. 拡張機能を公開する


https://qiita.com/moromi25/items/dada185e5f1e07fc78fb#chromeウェブストアへアプリを登録する


## 余談


開発中、デバッグのために全てを「にゃーん」にした際、普段フォローしている方たちが鳴き声でリプを飛ばしあっている姿は微笑ましいものがありました。あえてスクショを載せることはしませんが、全てを猫にしてしまっても良かったのかもしれません。


## 参考


https://simblo.net/u/WKZXBT/post/24344


猫語にする発想の先駆者（別ルートで思いついたので、真似したわけではないです）。NIの発案者で、サンプルコードまで見せていただきました。頭が上がりません。


https://qiita.com/moromi25/items/dada185e5f1e07fc78fb#chromeウェブストアへアプリを登録する


ストア公開まわり


https://qiita.com/3w36zj6/items/dba8de39623ae7adbd67


kuromojiの拡張機能でのdict指定まわり。結果的にこの方とは違う指定方法が通ったが、参考にさせていただきました。

