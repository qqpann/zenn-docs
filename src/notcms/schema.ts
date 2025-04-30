import { Client } from "notcms";
import type { Schema } from "notcms";

export const schema = {
  techblog: {
    id: "1542c5fe-b55c-8038-836e-daf920e3b20a",
    properties: {
      platform: "select",
      publication_name: "select",
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
