# Json 2 Pixel Font
これは、0と1で構成されたJSON文字列をフォント(.ttf)形式へ変換します。  
This converts a JSON string composed of 0s and 1s into a font (.ttf) format.

[Json 2 Pixel Font](https://okapping.github.io/Json2PixelFont)

## jsonファイルの書き方
```json
{
  "A": [
    "0100",
    "1010",
    "1110",
    "1010",
    "1010",
    "0000"
  ],
  "あ":[
    "00010000",
    "11111110",
    "01110100",
    "10011000",
    "01110100",
    "00000000"
  ]
}

```
このように、格キーに登録する文字を入力し、  
それに対して"0101"のような文字列の"配列"を定義していきます。

`src/sample.json`を参考にしてください。  


## 注意点

- 全ての文字の高さを同じにしてください。
- 横幅は文字ごとに設定できますが、文字配列内の横幅は一致している必要があります。
- 0と1以外は使用できません。

## おすすめのvscodeプラグイン
01の文字列を見ながらフォントを作成するのは、正直現実的ではありません。  
そこで、vscodeでプレビューしながら作業できるプラグイを作成しました。  
[JSON Dot Preview](https://github.com/okapping/json-dot-preview)  
ぜひ使ってみてください。