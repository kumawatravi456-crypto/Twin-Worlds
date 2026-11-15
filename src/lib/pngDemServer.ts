import zlib from 'node:zlib';

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Decode an 8-bit non-interlaced PNG buffer (grayscale, RGB, gray+alpha, or RGBA)
 * into a 2D array of calibrated elevation values in meters.
 * Server-only (uses node:zlib).
 */
export function decodeGrayscalePngToHeights(
  pngBuffer: Buffer,
  minElevM: number,
  maxElevM: number
): number[][] {
  if (pngBuffer.length < 33 || pngBuffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('Invalid PNG signature');
  }

  const width = pngBuffer.readUInt32BE(16);
  const height = pngBuffer.readUInt32BE(20);
  const bitDepth = pngBuffer[24];
  const colorType = pngBuffer[25];
  const interlace = pngBuffer[28];

  if (bitDepth !== 8 || interlace !== 0) {
    throw new Error(`Unsupported PNG bitDepth=${bitDepth} interlace=${interlace}`);
  }

  const bpp =
    colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (bpp === 0) {
    throw new Error(`Unsupported PNG colorType=${colorType}`);
  }

  const idatChunks: Buffer[] = [];
  let pos = 8;
  while (pos + 8 <= pngBuffer.length) {
    const len = pngBuffer.readUInt32BE(pos);
    const type = pngBuffer.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') {
      idatChunks.push(pngBuffer.subarray(pos + 8, pos + 8 + len));
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * bpp;
  if (raw.length < height * (stride + 1)) {
    throw new Error('Truncated PNG pixel stream');
  }

  const unfiltered = new Uint8Array(height * stride);
  for (let r = 0; r < height; r++) {
    const rowStart = r * (stride + 1);
    const filterType = raw[rowStart];
    const outStart = r * stride;
    const prevStart = (r - 1) * stride;

    for (let i = 0; i < stride; i++) {
      const x = raw[rowStart + 1 + i];
      const a = i >= bpp ? unfiltered[outStart + i - bpp] : 0;
      const b = r > 0 ? unfiltered[prevStart + i] : 0;
      const c = r > 0 && i >= bpp ? unfiltered[prevStart + i - bpp] : 0;

      let recon = x;
      if (filterType === 1) recon = (x + a) & 0xff;
      else if (filterType === 2) recon = (x + b) & 0xff;
      else if (filterType === 3) recon = (x + Math.floor((a + b) / 2)) & 0xff;
      else if (filterType === 4) recon = (x + paethPredictor(a, b, c)) & 0xff;
      unfiltered[outStart + i] = recon;
    }
  }

  const span = maxElevM - minElevM;
  const grid: number[][] = [];
  for (let r = 0; r < height; r++) {
    const row: number[] = [];
    for (let c = 0; c < width; c++) {
      const idx = r * stride + c * bpp;
      const lum =
        bpp >= 3
          ? (0.299 * unfiltered[idx] + 0.587 * unfiltered[idx + 1] + 0.114 * unfiltered[idx + 2]) / 255
          : unfiltered[idx] / 255;
      row.push(Number((minElevM + lum * span).toFixed(1)));
    }
    grid.push(row);
  }
  return grid;
}
