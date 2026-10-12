// functions/lib/image-dimensions.js
//
// Reads the pixel size of a PNG or JPEG from its header bytes, so logo
// uploads (firm-upload-logo.js, referrer-upload-logo.js) can refuse
// oversized images without decoding them.

// PNG header: 8-byte signature, then IHDR chunk starting at byte 8.
// IHDR layout: 4 bytes length, 4 bytes "IHDR", 4 bytes width, 4 bytes
// height, ... — width starts at byte 16, height at byte 20 (big-endian).
const readPngDimensions = (bytes) => {
  if (bytes.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (bytes[i] !== sig[i]) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = dv.getUint32(16, false);
  const height = dv.getUint32(20, false);
  if (!width || !height) return null;
  return { width, height };
};

// JPEG: parse SOFn (Start Of Frame) markers (0xFFC0–0xFFCF excluding
// 0xFFC4/0xFFC8/0xFFCC). Walk segments until we find one. Standard
// big-endian length prefix per segment.
const readJpegDimensions = (bytes) => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i < bytes.length - 9) {
    if (bytes[i] !== 0xff) return null;
    // Skip 0xFF padding bytes.
    let marker = bytes[i + 1];
    while (marker === 0xff && i + 2 < bytes.length) {
      i++;
      marker = bytes[i + 1];
    }
    // SOFn markers we care about.
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      // After marker: 2-byte length, 1-byte precision, 2-byte height, 2-byte width.
      if (i + 9 >= bytes.length) return null;
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      if (!width || !height) return null;
      return { width, height };
    }
    // Non-SOF segment — skip past it using its length.
    if (i + 3 >= bytes.length) return null;
    const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
    if (segLen < 2) return null;
    i += 2 + segLen;
  }
  return null;
};

export const readImageDimensions = (bytes, mimeType) => {
  if (mimeType === "image/png") return readPngDimensions(bytes);
  if (mimeType === "image/jpeg" || mimeType === "image/jpg")
    return readJpegDimensions(bytes);
  return null;
};
