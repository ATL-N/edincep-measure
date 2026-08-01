// lib/b2-storage.js
// Small helpers around Backblaze B2's S3-compatible API, shared by photo
// storage, photo cleanup and scheduled database backups.
import S3 from "aws-sdk/clients/s3";

export function b2Client() {
  return new S3({
    endpoint: `https://s3.${process.env.B2_BUCKET_REGION}.backblazeb2.com`,
    accessKeyId: process.env.B2_APPLICATION_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
    signatureVersion: "v4",
  });
}

/** Lists objects under a prefix (one page). */
export async function listPage(s3, Bucket, prefix, token) {
  const res = await s3.listObjectsV2({ Bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }).promise();
  return {
    items: (res.Contents || []).map((o) => ({ key: o.Key, size: o.Size, lastModified: new Date(o.LastModified) })),
    next: res.IsTruncated ? res.NextContinuationToken : undefined,
  };
}

/** Lists every object under a prefix. */
export async function listAll(s3, Bucket, prefix) {
  const all = [];
  let token;
  do {
    const page = await listPage(s3, Bucket, prefix, token);
    all.push(...page.items);
    token = page.next;
  } while (token);
  return all;
}

/**
 * Deletes every version of the given keys. On B2 a plain delete only hides a
 * file (older versions stay stored and billed), so this really removes it.
 */
export async function removeAllVersions(s3, Bucket, keys) {
  const objects = [];
  for (const key of keys) {
    let marker;
    do {
      const v = await s3
        .listObjectVersions({ Bucket, Prefix: key, KeyMarker: marker?.key, VersionIdMarker: marker?.version })
        .promise();
      for (const o of [...(v.Versions || []), ...(v.DeleteMarkers || [])]) {
        if (o.Key === key) objects.push({ Key: o.Key, VersionId: o.VersionId });
      }
      marker = v.IsTruncated ? { key: v.NextKeyMarker, version: v.NextVersionIdMarker } : null;
    } while (marker);
  }
  for (let i = 0; i < objects.length; i += 1000) {
    const res = await s3.deleteObjects({ Bucket, Delete: { Objects: objects.slice(i, i + 1000), Quiet: true } }).promise();
    if (res.Errors?.length) throw new Error(`${res.Errors.length} objects could not be deleted`);
  }
}
