import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATARS_DIR = path.join(__dirname, "..", "public", "avatars");

const API_KEY = process.env.MINIMAX_API_KEY || "sk-cp-Sj7WXfvF__Grvlflt1mxSiXH600pixzs533XMBSO44Mmuh92NhX2L6FEBc0JBLgY3O5lE2ByD2B8G7FfeeWQMQUyO-lMertfbzLQNtjjYAf2BTDBquirA28";
const BASE_URL = "https://api.minimaxi.com/v1";

const CHARACTERS = [
  {
    name: "linwanqing",
    prompt: "Portrait photo of a 23-year-old Chinese woman, long straight black hair, elegant and cool temperament, thin-frame glasses, white blouse, fair skin, almond-shaped eyes with a slight upturn, faint smile, soft bokeh background, professional photography, high definition, natural lighting",
  },
  {
    name: "sutangtang",
    prompt: "Portrait photo of a 21-year-old Chinese woman, shoulder-length slightly curly hair, bright sunny smile with dimples, pink casual top, big expressive eyes, cute hair clip, youthful and energetic, soft bokeh background, professional photography, high definition, natural lighting",
  },
  {
    name: "guyining",
    prompt: "Portrait photo of a 25-year-old Chinese woman, long flowing hair, gentle and intellectual beauty, light-colored elegant dress, warm and peaceful eyes, soft gentle smile, literary and refined temperament, soft bokeh background, professional photography, high definition, natural lighting",
  },
  {
    name: "peixiaolu",
    prompt: "Portrait photo of a 22-year-old Chinese woman, stylish short hair, playful and mischievous expression, trendy denim jacket over graphic tee, cat-like upturned eyes, sly smile, artistic and edgy vibe, soft bokeh background, professional photography, high definition, natural lighting",
  },
  {
    name: "shenruoxi",
    prompt: "Portrait photo of a 28-year-old Chinese woman, long wavy hair, mature and glamorous, dark professional blazer, confident sharp eyes, red lipstick, powerful aura, sophisticated and commanding presence, soft bokeh background, professional photography, high definition, natural lighting",
  },
  {
    name: "luxingye",
    prompt: "Portrait photo of a 24-year-old Chinese woman, neat short hair, cool and handsome style, black leather jacket, clear cold eyes, defined features, delicate earrings, tomboy-chic aesthetic, soft bokeh background, professional photography, high definition, natural lighting",
  },
  {
    name: "jiangyinuan",
    prompt: "Portrait photo of a 27-year-old Chinese woman, collarbone-length hair, refined makeup, beige knit sweater, elegant and poised, warm yet independent temperament, pearl earrings, gentle confident smile, soft bokeh background, professional photography, high definition, natural lighting",
  },
];

async function generateImage(prompt) {
  const res = await fetch(`${BASE_URL}/image_generation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "image-01",
      prompt,
      aspect_ratio: "1:1",
      response_format: "url",
      n: 1,
      prompt_optimizer: true,
    }),
  });
  const data = await res.json();
  return data?.data?.image_urls?.[0] || null;
}

async function downloadImage(url, filepath) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
}

async function main() {
  console.log("Generating avatars for", CHARACTERS.length, "characters...\n");

  for (const char of CHARACTERS) {
    console.log(`[${char.name}] Generating...`);
    try {
      const url = await generateImage(char.prompt);
      if (!url) {
        console.log(`[${char.name}] FAILED - no URL returned`);
        continue;
      }
      console.log(`[${char.name}] URL: ${url.slice(0, 80)}...`);

      const ext = "jpg";
      const filepath = path.join(AVATARS_DIR, `${char.name}.${ext}`);
      await downloadImage(url, filepath);
      console.log(`[${char.name}] Saved to ${filepath}\n`);
    } catch (err) {
      console.log(`[${char.name}] ERROR:`, err.message, "\n");
    }
  }

  console.log("Done!");
}

main();
