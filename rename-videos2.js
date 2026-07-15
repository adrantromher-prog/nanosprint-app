const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  endpoint: "https://e823c1887e46ecc090a7b3bd972a8ff5.r2.cloudflarestorage.com",
  accessKeyId: "f0d089e77d086b5ad17e10bb6f772c76",
  secretAccessKey: "8034fa2daebda83bb56910b7849548c723e3210df62eec8157f9f1f326c48d4f",
  region: "auto", s3ForcePathStyle: true, signatureVersion: "v4",
});
const BUCKET = "carreras-virtuales";
const crypto = require("crypto");
const fs = require("fs");

// Load existing mapping if any
let mapping = {};
try { mapping = JSON.parse(fs.readFileSync("video-mapping.json","utf8")); } catch {}

async function main() {
  // List original files (in folders)
  const list = await s3.listObjectsV2({ Bucket: BUCKET }).promise();
  const originalFiles = list.Contents.filter(f => f.Key.includes("/") && f.Key.endsWith(".mp4"));
  console.log(`Found ${originalFiles.length} original videos in folders`);

  for (const file of originalFiles) {
    const oldKey = file.Key;
    if (mapping[oldKey]) { console.log(`Skipped ${oldKey} (already mapped)`); continue; }
    
    const ext = oldKey.split(".").pop();
    const folder = oldKey.split("/")[0];
    const uuid = crypto.randomUUID();
    const newKey = folder + "/" + uuid + "." + ext;
    
    try {
      await s3.copyObject({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${oldKey}`,
        Key: newKey,
        ACL: "public-read",
      }).promise();
      mapping[oldKey] = newKey;
      fs.writeFileSync("video-mapping.json", JSON.stringify(mapping, null, 2));
      console.log(`✅ ${oldKey} -> ${uuid}.${ext}`);
    } catch(e) { console.log(`❌ ${oldKey}: ${e.message}`); }
  }

  console.log(`\nMapped ${Object.keys(mapping).length} files`);
  console.log("\n=== Para elegirVideo, usa este mapeo ===");
  
  // Group by caballo for easy lookup
  const byCaballo = {};
  for (const [oldKey, newKey] of Object.entries(mapping)) {
    const caballo = oldKey.split("/")[0];
    if (!byCaballo[caballo]) byCaballo[caballo] = [];
    byCaballo[caballo].push(newKey);
  }
  
  for (const [caballo, videos] of Object.entries(byCaballo)) {
    console.log(`\nCaballo ${caballo}:`);
    console.log(`  ${JSON.stringify(videos)}`);
  }
}

main().catch(console.error);
