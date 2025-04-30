import fs from "fs";
import path from "path";
import { nc } from "../src/notcms/schema";

const outputDir = path.resolve("articles");

// ルール外の文字列をすべて_に変換し、12〜50文字に収まるよう調整する関数
function sanitizeSlug(input: string): string {
  // a-z0-9、-、_ 以外をすべて _ に変換
  let slug = input.toLowerCase().replace(/[^a-z0-9-_]+/g, "_");

  // 先頭と末尾の _ を除去
  slug = slug.replace(/^_+|_+$/g, "");

  // 12文字未満の場合、補填
  if (slug.length < 12) {
    slug = slug.padEnd(12, "_");
  }

  // 50文字を超える場合は切り詰め
  if (slug.length > 50) {
    slug = slug.substring(0, 50).replace(/_+$/g, ""); // 末尾の_を除去
  }

  return slug;
}

const fetchNotCMSData = async () => {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const [pages] = await nc.query.techblog.list();
    if (!pages) {
      console.error("No data fetched for pages");
      return;
    }

    // 各ページのMarkdownを生成
    for (const _page of pages) {
      const [page] = await nc.query.techblog.get(_page.id);
      if (!page) {
        console.error("No data fetched for page", _page.id);
        continue;
      }
      // a-z0-9、ハイフン-、アンダースコア_の 12〜50 字の組み合わせ
      const slug = page.properties.slug
        ? sanitizeSlug(page.properties.slug)
        : sanitizeSlug(page.title);
      const fileName = path.join(outputDir, `${slug}.md`);
      const content = `---
title: "${page.title.trim()}"
emoji: "${page.properties.emoji}"
type: "${page.properties.type}"
topics: ${JSON.stringify(page.properties.topics ?? [])}
published: ${page.properties.published ? "true" : "false"}
${
  page.properties.publication_name
    ? `publication_name: "${page.properties.publication_name}"`
    : ""
}
---
${page.content}`;

      fs.writeFileSync(fileName, content);
      console.log(`Generated: ${fileName}`);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    process.exit(1);
  }
};

// 実行
fetchNotCMSData();
