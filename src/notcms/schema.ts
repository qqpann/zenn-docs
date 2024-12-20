import { Client } from "notcms";
import type { Schema } from "notcms";

export const schema = {
  techblog: {
    id: "", // run $ npx notcms-kit pull; to get the id
    properties: {
      platform: "select",
      type: "select",
      published: "checkbox",
      topics: "multi_select",
      emoji: "rich_text",
      slug: "rich_text",
      名前: "title",
    },
  },
} satisfies Schema;
export const nc = new Client({ schema });
