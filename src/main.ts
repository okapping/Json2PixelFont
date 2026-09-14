import opentype from "opentype.js";

type GlyphBitmap = string[];
type BitmapFontData = Record<string, GlyphBitmap>;

type FontOptions = {
  familyName: string;
  styleName: string;
  fullName: string;
  version: string;
  manufacturer: string;
  designer: string;

  unitsPerEm: number;
  ascender: number;
  descender: number;
  letterSpacing: number;
};

const jsonInput = document.querySelector<HTMLInputElement>("#json");
const generateButton =
  document.querySelector<HTMLButtonElement>("#generate");

if (!jsonInput || !generateButton) {
  throw new Error("必要なHTML要素が見つかりません");
}

generateButton.addEventListener("click", async () => {
  try {
    const file = jsonInput.files?.[0];

    if (!file) {
      alert("JSONファイルを選択してください");
      return;
    }

    const fontOptions = getFontOptions();

    const text = await file.text();
    const data: BitmapFontData = JSON.parse(text);

    validateFontData(data);

    const font = createFont(data, fontOptions);
    const arrayBuffer = font.toArrayBuffer();

    const blob = new Blob([arrayBuffer], {
      type: "font/ttf"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${fontOptions.familyName}.ttf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);

    const message =
      error instanceof Error
        ? error.message
        : "フォントの生成に失敗しました";

    alert(message);
  }
});

function getFontOptions(): FontOptions {
  const familyName = getInputValue("familyName");
  const styleName = getInputValue("styleName");
  const fullName = getInputValue("fullName");

  if (!familyName) {
    throw new Error("フォント名を入力してください");
  }

  if (!styleName) {
    throw new Error("スタイル名を入力してください");
  }

  if (!fullName) {
    throw new Error("フルネームを入力してください");
  }

  return {
    familyName,
    styleName,
    fullName,
    version: getInputValue("version"),
    manufacturer: getInputValue("manufacturer"),
    designer: getInputValue("designer"),

    unitsPerEm: getNumberValue("unitsPerEm"),
    ascender: getNumberValue("ascender"),
    descender: getNumberValue("descender"),
    letterSpacing: getNumberValue("letterSpacing")
  };
}

function getInputValue(id: string): string {
  const element = document.querySelector<HTMLInputElement>(`#${id}`);

  if (!element) {
    throw new Error(`#${id} が見つかりません`);
  }

  return element.value.trim();
}

function getNumberValue(id: string): number {
  const value = Number(getInputValue(id));

  if (!Number.isFinite(value)) {
    throw new Error(`#${id} には数値を入力してください`);
  }

  return value;
}

function createFont(
  data: BitmapFontData,
  options: FontOptions
): opentype.Font {
  const glyphs: opentype.Glyph[] = [];

  // 必須の未定義文字グリフ
  glyphs.push(
    new opentype.Glyph({
      name: ".notdef",
      unicode: 0,
      advanceWidth: 600,
      path: new opentype.Path()
    })
  );

  for (const [character, bitmap] of Object.entries(data)) {
    glyphs.push(
      createGlyph(character, bitmap, options)
    );
  }

  return new opentype.Font({
    familyName: options.familyName,
    styleName: options.styleName,
    fullName: options.fullName,
    version: options.version,
    manufacturer: options.manufacturer,
    designer: options.designer,

    unitsPerEm: options.unitsPerEm,
    ascender: options.ascender,
    descender: options.descender,

    glyphs
  });
}

function createGlyph(
  character: string,
  bitmap: GlyphBitmap,
  options: FontOptions
): opentype.Glyph {
  const height = bitmap.length;
  const width = bitmap[0].length;

  /*
   * 縦幅だけを基準にする。
   *
   * 例:
   * height = 6
   * unitsPerEm = 1000
   * pixelSize = 166.666...
   *
   * 横幅は文字ごとに変わるが、
   * 1ドットの高さ・大きさは全グリフで統一される。
   */
  const pixelSize = options.unitsPerEm / height;

  const path = new opentype.Path();

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      /*
       * "0"は空白として扱う。
       * パスは作らないが、グリフと文字幅は残す。
       */
      if (bitmap[row][col] === "0") {
        continue;
      }

      const x = col * pixelSize;

      const y =
        options.unitsPerEm -
        (row + 1) * pixelSize;

      addRectangle(
        path,
        x,
        y,
        pixelSize,
        pixelSize
      );
    }
  }

  const unicode = character.codePointAt(0);

  if (unicode === undefined) {
    throw new Error(
      `文字 ${JSON.stringify(character)} のUnicodeを取得できません`
    );
  }

  const glyphName =
    character === " "
      ? "space"
      : `glyph-${unicode}`;

  /*
   * 横幅は文字ごとのビットマップ幅に応じて変わる。
   */
  const advanceWidth =
    width * pixelSize + options.letterSpacing;

  return new opentype.Glyph({
    name: glyphName,
    unicode,
    advanceWidth,
    path
  });
}

function addRectangle(
  path: opentype.Path,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  path.moveTo(x, y);
  path.lineTo(x + width, y);
  path.lineTo(x + width, y + height);
  path.lineTo(x, y + height);
  path.close();
}

function validateFontData(data: BitmapFontData): void {
  if (!data || typeof data !== "object") {
    throw new Error("JSONの形式が不正です");
  }

  const entries = Object.entries(data);

  if (entries.length === 0) {
    throw new Error("JSONにグリフがありません");
  }

  /*
   * 最初のグリフの縦幅を基準にする。
   */
  let commonHeight: number | undefined;

  for (const [character, bitmap] of entries) {
    if (character.length === 0) {
      throw new Error("空のキーは使用できません");
    }

    if (!Array.isArray(bitmap) || bitmap.length === 0) {
      throw new Error(
        `${JSON.stringify(character)} のビットマップが空です`
      );
    }

    const height = bitmap.length;
    const width = bitmap[0].length;

    if (width === 0) {
      throw new Error(
        `${JSON.stringify(character)} のビットマップ幅が0です`
      );
    }

    /*
     * すべての文字で縦幅が一致しているかチェックする。
     */
    if (commonHeight === undefined) {
      commonHeight = height;
    } else if (height !== commonHeight) {
      throw new Error(
        `${JSON.stringify(character)} の縦幅が ${height} です。` +
        `他の文字と同じ ${commonHeight} ドットにしてください。`
      );
    }

    for (const row of bitmap) {
      /*
       * 各行の横幅が一致しているかチェックする。
       */
      if (row.length !== width) {
        throw new Error(
          `${JSON.stringify(character)} の各行の横幅が一致していません`
        );
      }

      /*
       * 配列内は0と1だけ許可する。
       * 半角スペースはキーとしては使用できるが、
       * 配列内には使用できない。
       */
      if (!/^[01]+$/.test(row)) {
        throw new Error(
          `${JSON.stringify(character)} のビットマップには ` +
          `"0" と "1" だけ使用してください`
        );
      }
    }
  }
}
