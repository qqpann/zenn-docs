---
title: "ファイルをUTF-8に変換するFinder クイックアクションを「ショートカット」で作る"
emoji: ""
type: "idea"
topics: []
published: false

---

## Background


Windowsから共有されたcsvファイルがShift_JISでひらけない、そんなことに遭遇したことは一度や二度ではないはずです。


わざわざコマンドを打つのは面倒臭い。Finder クイックアクションから文字コードを変換できたらどんなに楽か。そんなふうに考えたことはありませんか？


## Method


変換を行うには、 `nkf` というコマンドを使用するので、ダウンロードします。


ショートカットの中で実行するために、コマンドの絶対パスを控えておきます。


```bash
brew install nkf
which nkf
```


元のファイルを保持したまま、ファイル名末尾に「_utf8」を追加したファイルを保存するようにします。


この際、コマンドは先ほど控えた絶対パスから指定します。


```bash
dir=$(dirname "filepath")
base=$(basename "filepath")
ext="${base##*.}"
name="${base%.*}"

newfile="$dir/${name}_utf8.$ext"

/opt/homebrew/bin/nkf -w "filepath" > "$newfile"
```


![%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2024-12-06_22.03.01.png](https://api.notcms.com/v1/images/4fa9728a-eb1c-4eb4-b35f-18cea527f9bf)


これで、Finderで


![%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2024-12-06_22.55.57.png](https://api.notcms.com/v1/images/e94a89ed-0a1d-4720-ad8e-e53e4173ab0b)

<details>
<summary>ショートバージョン</summary>

![%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2024-12-06_22.04.01.png](https://api.notcms.com/v1/images/237bf76c-9534-431f-bd11-330939e78639)


</details>


---


ショートカット　バージョン7.0（3036.0.4.2）


## Reference


[https://note.com/usagimaruma/n/nfa15b0dc96be](https://note.com/usagimaruma/n/nfa15b0dc96be)

