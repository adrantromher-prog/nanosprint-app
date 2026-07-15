const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  endpoint: "https://e823c1887e46ecc090a7b3bd972a8ff5.r2.cloudflarestorage.com",
  accessKeyId: "f0d089e77d086b5ad17e10bb6f772c76",
  secretAccessKey: "8034fa2daebda83bb56910b7849548c723e3210df62eec8157f9f1f326c48d4f",
  region: "auto",
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

const BUCKET = "carreras-virtuales";
const BASE_URL = "https://pub-38f03dca333b4687bcf68ac8da6b1cf2.r2.dev";

const crypto = require("crypto");

async function renameFiles() {
  // List all objects in the bucket
  const list = await s3.listObjectsV2({ Bucket: BUCKET }).promise();
  const files = list.Contents.filter(f => f.Key.endsWith(".mp4"));
  
  console.log(`Found ${files.length} mp4 files`);

  const mapping = {}; // old name -> new name

  for (const file of files) {
    const oldKey = file.Key;
    // Generate a random UUID filename
    const ext = oldKey.split(".").pop();
    const newKey = crypto.randomUUID() + "." + ext;
    
    // Copy to new key (server-side)
    await s3.copyObject({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${oldKey}`,
      Key: newKey,
      ACL: "public-read",
    }).promise();
    
    mapping[oldKey] = newKey;
    console.log(`✅ ${oldKey} -> ${newKey}`);
  }

  // Now delete all old files
  console.log("\nDeleting old files...");
  for (const file of files) {
    await s3.deleteObject({ Bucket: BUCKET, Key: file.Key }).promise();
    console.log(`🗑️ Deleted ${file.Key}`);
  }

  // Save mapping to a JSON file
  const fs = require("fs");
  fs.writeFileSync("video-mapping.json", JSON.stringify(mapping, null, 2));
  console.log("\n✅ Mapping saved to video-mapping.json");
  
  // Print the elegirVideo replacement code
  console.log("\n=== New elegirVideo function ===");
  console.log(`const VIDEO_MAP = ${JSON.stringify(mapping)};`);
}

renameFiles().catch(console.error);
