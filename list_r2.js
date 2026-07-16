const AWS = require("./node_modules/aws-sdk");
const s3 = new AWS.S3({
  endpoint: "https://e823c1887e46ecc090a7b3bd972a8ff5.r2.cloudflarestorage.com",
  accessKeyId: "f0d089e77d086b5ad17e10bb6f772c76",
  secretAccessKey: "8034fa2daebda83bb56910b7849548c723e3210df62eec8157f9f1f326c48d4f",
  region: "auto",
  s3ForcePathStyle: true,
  signatureVersion: "v4"
});
s3.listObjectsV2({Bucket: "carreras-virtuales", MaxKeys: 10}).promise()
  .then(d => {
    if (!d.Contents || d.Contents.length === 0) console.log("BUCKET EMPTY");
    else d.Contents.forEach(f => console.log(f.Key + " (" + f.Size + " bytes)"));
    console.log("IsTruncated:", d.IsTruncated);
    console.log("KeyCount:", d.KeyCount);
  })
  .catch(e => console.error("ERROR:", e.message));