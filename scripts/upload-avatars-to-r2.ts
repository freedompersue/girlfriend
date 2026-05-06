import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import pg from "pg";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const AVATARS = [
  { name: "林晚晴", file: "linwanqing.jpg" },
  { name: "苏糖糖", file: "sutangtang.jpg" },
  { name: "沈若兮", file: "shenruoxi.jpg" },
  { name: "裴小鹿", file: "peixiaolu.jpg" },
  { name: "陆星野", file: "luxingye.jpg" },
  { name: "江以暖", file: "jiangyinuan.jpg" },
  { name: "顾一凝", file: "guyining.jpg" },
  { name: "韩沐书", file: "hanmushu.jpg" },
];

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  for (const avatar of AVATARS) {
    const filePath = resolve(__dirname, `../public/avatars/${avatar.file}`);
    const fileBuffer = readFileSync(filePath);
    const fileName = `avatars/${avatar.file}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: "image/jpeg",
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    console.log(`Uploaded: ${avatar.name} -> ${publicUrl}`);

    await pool.query(
      `UPDATE characters SET "baseImageUrl" = $1 WHERE name = $2`,
      [publicUrl, avatar.name]
    );
    console.log(`Updated DB: ${avatar.name}`);
  }

  console.log("\nAll avatars uploaded and database updated!");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
