const AWS = require("./node_modules/aws-sdk");
const s3 = new AWS.S3({
  endpoint: "https://e823c1887e46ecc090a7b3bd972a8ff5.r2.cloudflarestorage.com",
  accessKeyId: "f0d089e77d086b5ad17e10bb6f772c76",
  secretAccessKey: "8034fa2daebda83bb56910b7849548c723e3210df62eec8157f9f1f326c48d4f",
  region: "auto",
  s3ForcePathStyle: true,
  signatureVersion: "v4"
});
const BUCKET = "carreras-virtuales";

async function purge() {
  let deleted = 0;
  let continuationToken = null;
  do {
    const params = { Bucket: BUCKET, MaxKeys: 1000 };
    if (continuationToken) params.ContinuationToken = continuationToken;
    const list = await s3.listObjectsV2(params).promise();
    if (!list.Contents || list.Contents.length === 0) break;
    const keys = list.Contents.map(f => ({ Key: f.Key }));
    await s3.deleteObjects({ Bucket: BUCKET, Delete: { Objects: keys } }).promise();
    deleted += keys.length;
    console.log("Deleted " + keys.length + " objects");
    continuationToken = list.NextContinuationToken;
  } while (continuationToken);
  console.log("TOTAL DELETED: " + deleted);
}

purge().catch(e => console.error("ERROR:", e.message));