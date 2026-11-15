export interface DemStatistics {
  minM: number;
  maxM: number;
  reliefM: number;
  meanSlopeDeg: number;
  maxSlopeDeg: number;
  meanTriM: number;
  roughnessIndex: number; // 0..1 normalized TRI
}

/**
 * Compute real terrain slope & Terrain Ruggedness Index (TRI) from a 2D elevation matrix (meters).
 * Uses central finite differences in interior cells and Riley et al. (1999) 8-neighbor TRI.
 */
export function computeDemStatistics(heightsM: number[][], cellSizeMeters: number): DemStatistics {
  const rows = heightsM.length;
  const cols = rows > 0 ? heightsM[0].length : 0;
  if (rows < 3 || cols < 3 || cellSizeMeters <= 0) {
    return {
      minM: 0,
      maxM: 0,
      reliefM: 0,
      meanSlopeDeg: 0,
      maxSlopeDeg: 0,
      meanTriM: 0,
      roughnessIndex: 0
    };
  }

  let minM = Infinity;
  let maxM = -Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = heightsM[r][c];
      if (!Number.isFinite(v)) continue;
      if (v < minM) minM = v;
      if (v > maxM) maxM = v;
    }
  }
  if (!Number.isFinite(minM) || !Number.isFinite(maxM)) {
    minM = 0;
    maxM = 0;
  }

  let slopeSum = 0;
  let slopeCount = 0;
  let maxSlopeDeg = 0;
  let triSum = 0;

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const z = heightsM[r][c];
      const zx1 = heightsM[r][c + 1];
      const zx0 = heightsM[r][c - 1];
      const zy1 = heightsM[r + 1][c];
      const zy0 = heightsM[r - 1][c];
      if (![z, zx1, zx0, zy1, zy0].every(Number.isFinite)) continue;

      const dzdx = (zx1 - zx0) / (2 * cellSizeMeters);
      const dzdy = (zy1 - zy0) / (2 * cellSizeMeters);
      const slopeDeg = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
      slopeSum += slopeDeg;
      slopeCount++;
      if (slopeDeg > maxSlopeDeg) maxSlopeDeg = slopeDeg;

      // Riley TRI: sqrt(sum((neighbor - center)^2))
      let sqSum = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nv = heightsM[r + dr][c + dc];
          const diff = Number.isFinite(nv) ? nv - z : 0;
          sqSum += diff * diff;
        }
      }
      triSum += Math.sqrt(sqSum);
    }
  }

  const meanSlopeDeg = slopeCount > 0 ? Number((slopeSum / slopeCount).toFixed(2)) : 0;
  const meanTriM = slopeCount > 0 ? Number((triSum / slopeCount).toFixed(2)) : 0;
  // Normalize roughness against cell scale: 120 m TRI per 90m cell (~high mountain ridge) saturates near 0.95
  const scaleRefM = Math.max(12, cellSizeMeters * 0.85);
  const roughnessIndex = Number(Math.min(1, 1 - Math.exp(-meanTriM / scaleRefM)).toFixed(3));

  return {
    minM: Number(minM.toFixed(1)),
    maxM: Number(maxM.toFixed(1)),
    reliefM: Number((maxM - minM).toFixed(1)),
    meanSlopeDeg,
    maxSlopeDeg: Number(maxSlopeDeg.toFixed(2)),
    meanTriM,
    roughnessIndex
  };
}

/**
 * Bilinearly resample any 2D numeric matrix to a square matrix of targetSize x targetSize.
 */
export function resampleGrid(grid: number[][], targetSize: number): number[][] {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0 || targetSize < 2) return [];

  const out: number[][] = [];
  for (let r = 0; r < targetSize; r++) {
    const gy = (r / (targetSize - 1)) * (rows - 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(rows - 1, y0 + 1);
    const fy = gy - y0;

    const outRow: number[] = [];
    for (let c = 0; c < targetSize; c++) {
      const gx = (c / (targetSize - 1)) * (cols - 1);
      const x0 = Math.floor(gx);
      const x1 = Math.min(cols - 1, x0 + 1);
      const fx = gx - x0;

      const v00 = grid[y0][x0];
      const v10 = grid[y0][x1];
      const v01 = grid[y1][x0];
      const v11 = grid[y1][x1];

      const top = v00 + (v10 - v00) * fx;
      const bot = v01 + (v11 - v01) * fx;
      outRow.push(Number((top + (bot - top) * fy).toFixed(2)));
    }
    out.push(outRow);
  }
  return out;
}
