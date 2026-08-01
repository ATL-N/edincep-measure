// lib/image-safety.js
// Every uploaded image is decoded and RE-ENCODED to a fresh JPEG before it is
// stored. This defends against the known image-upload attacks:
//
//  * Polyglot / hidden payloads (HTML, JS, ZIP … appended to or embedded in a
//    valid image): only decoded pixels survive re-encoding.
//  * Decompression bombs / pixel floods (tiny file, huge dimensions):
//    dimensions are read from the header and limited before full decoding.
//  * Malformed files crafted to exploit image decoders in viewers' browsers
//    or apps (e.g. the 2023 libwebp bug): viewers only ever receive our own
//    freshly encoded JPEG, never the original bytes.
//  * Privacy: EXIF/XMP/ICC metadata (GPS location, device info) is dropped.
//  * Oversized images: resized to a sensible maximum.
import sharp from "sharp";

// Header-declared limits, checked before decoding anything.
const MAX_INPUT_PIXELS = 40_000_000; // e.g. 8000 x 5000
const MAX_INPUT_SIDE = 12_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class ImageRejected extends Error {}

/**
 * @param {Buffer} input  raw upload
 * @param {{ maxSide?: number, quality?: number }} opts
 * @returns {Promise<{ buffer: Buffer, contentType: 'image/jpeg', width: number, height: number }>}
 */
export async function sanitizeImage(input, { maxSide = 2048, quality = 85 } = {}) {
  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).metadata();
  } catch (e) {
    if (/pixel limit/i.test(String(e?.message))) {
      throw new ImageRejected("This image is too large. Please use a normal photo.");
    }
    throw new ImageRejected("This file isn't a valid image.");
  }
  if (!ALLOWED_FORMATS.has(meta.format)) {
    throw new ImageRejected("Only JPEG, PNG or WEBP photos are allowed.");
  }
  if (!meta.width || !meta.height || meta.width > MAX_INPUT_SIDE || meta.height > MAX_INPUT_SIDE ||
      meta.width * meta.height > MAX_INPUT_PIXELS) {
    throw new ImageRejected("This image is too large. Please use a normal photo.");
  }
  if ((meta.pages || 1) > 1) {
    throw new ImageRejected("Animated or multi-page images aren't allowed.");
  }

  try {
    const { data, info } = await sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: "error", // reject truncated/corrupt files instead of guessing
      sequentialRead: true,
    })
      .rotate() // apply EXIF orientation, then the EXIF data is discarded
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // drop transparency (JPEG has none)
      .toColourspace("srgb")
      .jpeg({ quality, mozjpeg: true }) // no withMetadata(): all metadata stripped
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, contentType: "image/jpeg", width: info.width, height: info.height };
  } catch {
    throw new ImageRejected("This image couldn't be processed. Please try another photo.");
  }
}
