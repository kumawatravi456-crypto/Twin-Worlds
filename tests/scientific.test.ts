import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { computeDemStatistics, resampleGrid } from '../src/lib/dem';
import { decodeGrayscalePngToHeights } from '../src/lib/pngDemServer';
import { computeSiteSimilarity, WEIGHT_PRESETS, DEFAULT_WEIGHTS } from '../src/lib/scoring';
import {
  buildScientificReport,
  buildScientificCsv,
  buildScientificPdfBlob
} from '../src/lib/reportGenerator';
import { EARTH_ANALOG_SITES } from '../src/data/earthAnalogs';
import { PLANETARY_TARGETS } from '../src/data/planetaryTargets';
import { buildCustomMoonTarget } from '../src/data/lunarGazetteer';
import { buildCustomMarsTarget } from '../src/data/martianGazetteer';
import { GLOBAL_DISCOVERY_CELLS, buildDiscoverySiteModel } from '../src/data/discoveryGrid';
import type { EarthAnalogSite } from '../src/types/analog';

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function makeTestGrayscalePng(pixels: number[][]): Buffer {
  const height = pixels.length;
  const width = pixels[0].length;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // non-interlaced

  const rawRows: Buffer[] = [];
  for (let r = 0; r < height; r++) {
    // Alternate filter 0 (None) and filter 1 (Sub) to verify filter reconstruction
    const filterType = r % 2;
    const row = Buffer.alloc(1 + width);
    row[0] = filterType;
    for (let c = 0; c < width; c++) {
      const cur = pixels[r][c] & 0xff;
      const prev = c > 0 ? pixels[r][c - 1] & 0xff : 0;
      row[1 + c] = filterType === 1 ? (cur - prev) & 0xff : cur;
    }
    rawRows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rawRows));

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

test('DEM statistics: flat plane has zero slope & zero TRI; ramp matches analytical slope', () => {
  const flat = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 1200));
  const flatStats = computeDemStatistics(flat, 90);
  assert.equal(flatStats.reliefM, 0);
  assert.equal(flatStats.meanSlopeDeg, 0);
  assert.equal(flatStats.roughnessIndex, 0);

  // Synthetic 45-degree eastward ramp: +90 m per 90 m column step
  const ramp = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, (_, c) => c * 90)
  );
  const rampStats = computeDemStatistics(ramp, 90);
  assert.equal(rampStats.reliefM, 360);
  assert.ok(Math.abs(rampStats.meanSlopeDeg - 45) < 0.1, `Expected ~45 deg, got ${rampStats.meanSlopeDeg}`);
  assert.ok(rampStats.roughnessIndex > 0.7 && rampStats.roughnessIndex <= 1);
});

test('resampleGrid interpolates corners and preserves target dimensions', () => {
  const src = [
    [0, 100],
    [200, 300]
  ];
  const resampled = resampleGrid(src, 5);
  assert.equal(resampled.length, 5);
  assert.equal(resampled[0].length, 5);
  assert.equal(resampled[0][0], 0);
  assert.equal(resampled[0][4], 100);
  assert.equal(resampled[4][0], 200);
  assert.equal(resampled[4][4], 300);
  assert.equal(resampled[2][2], 150);
});

test('decodeGrayscalePngToHeights calibrates 8-bit grayscale pixels across None & Sub PNG filters', () => {
  const png = makeTestGrayscalePng([
    [0, 128, 255],
    [0, 255, 128],
    [255, 128, 0]
  ]);
  const grid = decodeGrayscalePngToHeights(png, -9000, 11000);
  assert.equal(grid.length, 3);
  assert.equal(grid[0].length, 3);
  assert.equal(grid[0][0], -9000);
  assert.equal(grid[0][2], 11000);
  assert.ok(Math.abs(grid[0][1] - 1039.2) < 1.5, `Unexpected midpoint elevation ${grid[0][1]}`);
  assert.equal(grid[1][1], 11000);
  assert.equal(grid[2][2], -9000);
});

test('Mineralogy scoring damps single common-mineral matches vs diagnostic multi-mineral matches', () => {
  const shackleton = PLANETARY_TARGETS.find((t) => t.id === 'moon-shackleton-floor')!;
  const haughton = EARTH_ANALOG_SITES.find((s) => s.id === 'haughton-crater')!;

  const singleMineralClone: EarthAnalogSite = {
    ...haughton,
    id: 'test-single-mineral',
    geology: {
      ...haughton.geology,
      craterOrigin: false,
      minerals: ['pyroxene', 'quartz']
    }
  };
  const multiDiagnosticClone: EarthAnalogSite = {
    ...haughton,
    id: 'test-multi-diagnostic',
    geology: {
      ...haughton.geology,
      craterOrigin: true,
      minerals: ['anorthosite', 'plagioclase', 'impact breccia', 'pyroxene']
    }
  };

  const singleRes = computeSiteSimilarity(singleMineralClone, shackleton, DEFAULT_WEIGHTS);
  const multiRes = computeSiteSimilarity(multiDiagnosticClone, shackleton, DEFAULT_WEIGHTS);
  assert.ok(
    (multiRes.axes.geology.rawScore ?? 0) > (singleRes.axes.geology.rawScore ?? 0) + 25,
    `Expected diagnostic match (${multiRes.axes.geology.rawScore}) >> single match (${singleRes.axes.geology.rawScore})`
  );
});

test('Mission weight presets meaningfully shift rankings across ISRU-ice, rover-dust, and astrobiology profiles', () => {
  const shackleton = PLANETARY_TARGETS.find((t) => t.id === 'moon-shackleton-floor')!;
  const marsJezero = PLANETARY_TARGETS.find((t) => t.id === 'mars-jezero')!;
  const isruPreset = WEIGHT_PRESETS.find((p) => p.id === 'isru-ice')!.weights;
  const astroPreset = WEIGHT_PRESETS.find((p) => p.id === 'astrobiology')!.weights;
  const roverPreset = WEIGHT_PRESETS.find((p) => p.id === 'rover-dust')!.weights;

  const isruShackRanked = EARTH_ANALOG_SITES
    .map((s) => ({ id: s.id, score: computeSiteSimilarity(s, shackleton, isruPreset).compositeScore }))
    .sort((a, b) => b.score - a.score);

  const roverShackRanked = EARTH_ANALOG_SITES
    .map((s) => ({ id: s.id, score: computeSiteSimilarity(s, shackleton, roverPreset).compositeScore }))
    .sort((a, b) => b.score - a.score);

  assert.ok(
    ['haughton-crater', 'mcmurdo-dry-valleys', 'devon-island-polar'].includes(isruShackRanked[0].id),
    `Expected polar/ice site on top for ISRU-ice preset, got ${isruShackRanked[0].id}`
  );
  assert.notEqual(
    isruShackRanked[0].id,
    roverShackRanked[0].id,
    `Expected rover-dust preset (#1=${roverShackRanked[0].id}) to reorder Shackleton top site vs ISRU-ice (#1=${isruShackRanked[0].id})`
  );

  const roverJezeroTop = EARTH_ANALOG_SITES
    .map((s) => ({ id: s.id, score: computeSiteSimilarity(s, marsJezero, roverPreset).compositeScore }))
    .sort((a, b) => b.score - a.score)[0];
  const astroJezeroTop = EARTH_ANALOG_SITES
    .map((s) => ({ id: s.id, score: computeSiteSimilarity(s, marsJezero, astroPreset).compositeScore }))
    .sort((a, b) => b.score - a.score)[0];

  assert.notEqual(
    roverJezeroTop.id,
    astroJezeroTop.id,
    `Expected astrobiology (#1=${astroJezeroTop.id}) to differ from rover-dust (#1=${roverJezeroTop.id}) on Mars Jezero`
  );
});

test('Missing-data axes are excluded, renormalized to 100%, and reduce independent Confidence%', () => {
  const marsJezero = PLANETARY_TARGETS.find((t) => t.id === 'mars-jezero')!;
  // Popigai has documentedTubePresent = null and documentedBiologyKnown = false -> 2 unavailable axes
  const popigaiCell = GLOBAL_DISCOVERY_CELLS.find((c) => c.id === 'disc-popigai-crater')!;
  assert.ok(popigaiCell);

  const popigaiSite = buildDiscoverySiteModel(popigaiCell, {
    elevationM: 280,
    currentTempC: -14,
    skinTempC: -15.2,
    airMeanTempC: -13.8,
    airMinTempC: -36,
    airMaxTempC: 11,
    diurnalRangeC: 12.4,
    observed7DaySwingC: 11.8,
    annualPrecipMm: 210,
    solarIrradianceKwhM2Day: 2.3,
    modisAod55: 0.14,
    dustUgM3: 4.5,
    pm10UgM3: 6.2,
    demSlopeDeg: 4.4,
    demRoughness: 0.31
  });

  const result = computeSiteSimilarity(popigaiSite, marsJezero, DEFAULT_WEIGHTS);
  assert.deepEqual(result.unavailableAxes.sort(), ['biology', 'cavesTubes']);
  assert.equal(result.axes.cavesTubes.available, false);
  assert.equal(result.axes.cavesTubes.rawScore, null);
  assert.equal(result.axes.biology.available, false);
  assert.equal(result.axes.biology.rawScore, null);
  assert.ok(result.availableWeightPct < 100);

  const sumNormalizedWeights = Object.values(result.axes).reduce(
    (sum, axis) => sum + axis.normalizedWeight,
    0
  );
  assert.ok(
    Math.abs(sumNormalizedWeights - 100) < 0.6,
    `Renormalized weights should sum to 100%, got ${sumNormalizedWeights}`
  );
  assert.ok(result.confidencePct < 90, `Expected reduced confidence due to missing axes, got ${result.confidencePct}`);
});

test('Scientific report builder creates all 8 sections in CSV and valid multi-page PDF 1.4', async () => {
  const target = PLANETARY_TARGETS.find((t) => t.id === 'mars-jezero')!;
  const site = EARTH_ANALOG_SITES.find((s) => s.id === 'lonar-crater')!;
  const similarity = computeSiteSimilarity(site, target, DEFAULT_WEIGHTS);

  const report = buildScientificReport({
    target,
    site,
    similarity,
    rank: 2
  });

  assert.equal(report.dimensionComparison.length, 8);
  assert.ok(report.similarities.length > 0);
  assert.ok(report.differences.length > 0);
  assert.ok(report.explorationApplications.length >= 4);
  assert.equal(report.dataSources.length, 8);
  assert.ok(report.limitationsAndConfidence.physicalLimitations.length >= 3);

  const csv = buildScientificCsv(report);
  assert.ok(csv.includes('Earth Analog Suitability (%)'));
  assert.ok(csv.includes('Independent Data Confidence (%)'));
  assert.ok(csv.includes('Lonar'));

  const pdfBlob = buildScientificPdfBlob(report);
  assert.equal(pdfBlob.type, 'application/pdf');
  const pdfText = await pdfBlob.text();
  assert.ok(pdfText.startsWith('%PDF-1.4'));
  assert.ok(pdfText.endsWith('%%EOF'));
  assert.ok(pdfText.includes('1. PLANETARY TARGET OVERVIEW'));
  assert.ok(pdfText.includes('8. CONFIDENCE, METHODOLOGY & PHYSICAL LIMITATIONS'));
});

test('Custom Moon coordinate model distinguishes lunar lava tube pits vs polar cold traps and ranks distinct Earth twins', () => {
  const tranqPit = buildCustomMoonTarget({
    lat: 8.33,
    lon: 33.22,
    name: 'Mare Tranquillitatis Skylight Pit',
    dem: { elevationRelativeM: -1950, meanSlopeDeg: 4.1, roughnessIndex: 0.36 }
  });
  const cabeusPsr = buildCustomMoonTarget({
    lat: -84.9,
    lon: -35.5,
    name: 'Cabeus PSR',
    dem: { elevationRelativeM: -3600, meanSlopeDeg: 5.5, roughnessIndex: 0.54 }
  });

  assert.equal(tranqPit.body, 'moon');
  assert.ok(tranqPit.lavaTubeRelevance >= 85);
  assert.ok(cabeusPsr.waterIceTargetScore >= 90);
  assert.ok(cabeusPsr.meanTempC < -180);

  const tubeWeights = WEIGHT_PRESETS.find((p) => p.id === 'lava-tube')!.weights;
  const isruWeights = WEIGHT_PRESETS.find((p) => p.id === 'isru-ice')!.weights;

  const topForTranq = EARTH_ANALOG_SITES
    .map((s) => ({ id: s.id, score: computeSiteSimilarity(s, tranqPit, tubeWeights).compositeScore }))
    .sort((a, b) => b.score - a.score)[0];

  const topForCabeus = EARTH_ANALOG_SITES
    .map((s) => ({ id: s.id, score: computeSiteSimilarity(s, cabeusPsr, isruWeights).compositeScore }))
    .sort((a, b) => b.score - a.score)[0];

  assert.ok(
    ['lanzarote-la-corona', 'lava-beds-nm', 'mauna-loa-hiseas', 'craters-of-the-moon'].includes(topForTranq.id),
    `Expected volcanic lava-tube Earth analog for Mare Tranquillitatis Pit, got ${topForTranq.id}`
  );
  assert.ok(
    ['haughton-crater', 'mcmurdo-dry-valleys'].includes(topForCabeus.id),
    `Expected polar cold/permafrost analog for Cabeus PSR, got ${topForCabeus.id}`
  );
});

test('Custom Mars coordinate model distinguishes Martian lava tubes, sulfate canyons, and polar ice caps', () => {
  const arsiaPit = buildCustomMarsTarget({
    lat: -5.64,
    lon: -118.77,
    name: 'Arsia Mons Lava Tube Pit',
    dem: { elevationRelativeM: 12000, meanSlopeDeg: 7.4, roughnessIndex: 0.56 }
  });
  const korolevIce = buildCustomMarsTarget({
    lat: 72.77,
    lon: -164.55,
    name: 'Korolev Crater Water-Ice Lake',
    dem: { elevationRelativeM: -4100, meanSlopeDeg: 4.1, roughnessIndex: 0.42 }
  });

  assert.equal(arsiaPit.body, 'mars');
  assert.ok(arsiaPit.lavaTubeRelevance >= 85);
  assert.ok(arsiaPit.surfacePressurePa < 300);
  assert.ok(korolevIce.waterIceTargetScore >= 95);
  assert.ok(korolevIce.surfacePressurePa > 700);

  const tubeWeights = WEIGHT_PRESETS.find((p) => p.id === 'lava-tube')!.weights;
  const isruWeights = WEIGHT_PRESETS.find((p) => p.id === 'isru-ice')!.weights;

  const topForArsia = EARTH_ANALOG_SITES
    .map((s) => ({ id: s.id, score: computeSiteSimilarity(s, arsiaPit, tubeWeights).compositeScore }))
    .sort((a, b) => b.score - a.score)[0];

  const topForKorolev = EARTH_ANALOG_SITES
    .map((s) => ({ id: s.id, score: computeSiteSimilarity(s, korolevIce, isruWeights).compositeScore }))
    .sort((a, b) => b.score - a.score)[0];

  assert.ok(
    ['lanzarote-la-corona', 'lava-beds-nm', 'mauna-loa-hiseas', 'craters-of-the-moon'].includes(topForArsia.id),
    `Expected volcanic lava-tube Earth analog for Arsia Pit, got ${topForArsia.id}`
  );
  assert.ok(
    ['haughton-crater', 'mcmurdo-dry-valleys'].includes(topForKorolev.id),
    `Expected polar ice/permafrost analog for Korolev Crater, got ${topForKorolev.id}`
  );
});
