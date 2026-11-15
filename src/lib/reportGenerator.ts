import { AXIS_METADATA } from './scoring';
import type {
  EarthAnalogSite,
  FeatureAxisKey,
  LiveSiteTelemetry,
  PlanetaryTarget,
  ProvenanceRecord,
  SiteSimilarityResult
} from '../types/analog';

export interface ScientificComparisonReport {
  generatedAtUtc: string;
  terminologyNote: string;
  targetOverview: {
    id: string;
    body: 'moon' | 'mars';
    name: string;
    region: string;
    coordinates: string;
    gravityG: number;
    surfacePressurePa: number;
    meanTempC: number;
    minTempC: number;
    maxTempC: number;
    typicalSlopeDeg: number;
    roughnessIndex: number;
    radiationSvPerYear: number;
    keyResource: string;
    keyHazard: string;
    missionSummary: string;
    pdsCitations: string[];
  };
  earthAnalogOverview: {
    id: string;
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    elevationM: number;
    classification: string;
    summary: string;
    discoveryRationale: string;
    useCases: string[];
  };
  overallAssessment: {
    rank: number;
    earthAnalogSuitabilityPct: number;
    dataConfidencePct: number;
    availableWeightPct: number;
    unavailableAxes: FeatureAxisKey[];
    methodologyNote: string;
  };
  dimensionComparison: Array<{
    axis: FeatureAxisKey;
    label: string;
    available: boolean;
    suitabilityScore: number | null;
    normalizedWeightPct: number;
    confidencePct: number;
    targetMeasurement: string;
    earthMeasurement: string;
    unit: string;
    provenance: string;
    datasetName: string;
    formulaNote: string;
  }>;
  similarities: string[];
  differences: string[];
  explorationApplications: Array<{
    domain: string;
    rationale: string;
  }>;
  dataSources: Array<{
    dimension: string;
    record: ProvenanceRecord;
  }>;
  limitationsAndConfidence: {
    confidencePct: number;
    physicalLimitations: string[];
    liveFeedSummary: string[];
  };
}

export function buildScientificReport(params: {
  target: PlanetaryTarget;
  site: EarthAnalogSite;
  similarity: SiteSimilarityResult;
  rank: number;
  live?: LiveSiteTelemetry;
}): ScientificComparisonReport {
  const { target, site, similarity, rank, live } = params;
  const generatedAtUtc = new Date().toISOString();

  const dimensionComparison = AXIS_METADATA.map((meta) => {
    const d = similarity.axes[meta.key];
    return {
      axis: meta.key,
      label: d.label,
      available: d.available,
      suitabilityScore: d.rawScore,
      normalizedWeightPct: d.normalizedWeight,
      confidencePct: d.confidencePct,
      targetMeasurement: d.targetMeasurement,
      earthMeasurement: d.earthMeasurement,
      unit: d.unit,
      provenance: d.provenance,
      datasetName: d.provenanceDetail.datasetName,
      formulaNote: d.formulaNote
    };
  });

  const similarities: string[] = [];
  const differences: string[] = [];
  for (const meta of AXIS_METADATA) {
    const d = similarity.axes[meta.key];
    d.similarities.forEach((s) => similarities.push(`[${d.label}] ${s}`));
    d.differences.forEach((diff) => differences.push(`[${d.label}] ${diff}`));
  }

  const explorationApplications: Array<{ domain: string; rationale: string }> = [
    {
      domain: 'Rover Mobility & Autonomous Navigation',
      rationale: `Evaluated at ${site.topography.meanSlopeDeg.toFixed(1)}° mean slope and ${site.topography.roughnessIndex.toFixed(2)} TRI roughness (mobility score ${site.exploration.roverMobilityScore}/100) for wheel slip, hazard avoidance, and traverse planning toward ${target.name}.`
    },
    {
      domain: 'ISRU & Subsurface Drilling Operations',
      rationale: `Drilling/ISRU utility ${site.exploration.drillingIsruScore}/100. ${site.waterIce.iceMechanism}`
    },
    {
      domain: 'Dust Seals, Thermal & EVA Readiness',
      rationale: `${site.dust.particleComposition} (${site.dust.regolithDustHazardScore}/100 proxy) and diurnal temperature swings test optical coatings, rotary seals, and suit joints.`
    },
    {
      domain: target.body === 'mars' ? 'Astrobiology & Biosignature Instrumentation' : 'Planetary Protection & Habitat Architecture',
      rationale:
        target.body === 'mars'
          ? site.biology.metabolicStrategy
          : site.cavesTubes.provenance !== 'unavailable' && site.cavesTubes.tubePresenceScore >= 60
            ? `Subsurface shelter architecture (${site.cavesTubes.systemName}) supports regolith shielding and habitat deployment trials.`
            : 'Cold hyper-oligotrophic terrain supports sterile sample-handling and contamination-control drills.'
    }
  ];

  const dataSources = AXIS_METADATA.map((meta) => ({
    dimension: meta.label,
    record: similarity.axes[meta.key].provenanceDetail
  }));

  const liveFeedSummary: string[] = [];
  if (live?.nasaPower?.status === 'live') {
    liveFeedSummary.push(
      `NASA POWER Climatology: Skin Temp TS=${live.nasaPower.skinTempC ?? 'n/a'}°C, Precip=${live.nasaPower.annualPrecipMm ?? 'n/a'} mm/yr, MODIS AOD_55=${live.nasaPower.modisAod55 ?? 'n/a'}.`
    );
  }
  if (live?.copernicusDem?.status === 'live') {
    liveFeedSummary.push(
      `Copernicus GLO-90 10x10 DEM: Mean slope=${live.copernicusDem.meanSlopeDeg}°, TRI roughness=${live.copernicusDem.roughnessIndex}, Relief=${live.copernicusDem.reliefM} m.`
    );
  }
  if (live?.openMeteoWeather.status === 'live') {
    liveFeedSummary.push(
      `Open-Meteo Live Weather: Temp=${live.openMeteoWeather.currentTempC}°C, 7-day diurnal swing=${live.openMeteoWeather.observed7DaySwingC}°C, Elev=${live.openMeteoWeather.elevationM} m.`
    );
  }
  if (live?.openMeteoAirQuality.status === 'live') {
    liveFeedSummary.push(
      `Open-Meteo CAMS Proxy: Mineral dust=${live.openMeteoAirQuality.dustUgM3} ug/m3, PM10=${live.openMeteoAirQuality.pm10UgM3} ug/m3.`
    );
  }
  if (live?.nasaCmr.status === 'live') {
    liveFeedSummary.push(`NASA Earthdata CMR: ${live.nasaCmr.totalHits} collections matched bounding box.`);
  }
  if (live?.ncbiPubmed.status === 'live') {
    liveFeedSummary.push(`NCBI PubMed: ${live.ncbiPubmed.totalCount} peer-reviewed publications indexed.`);
  }

  const physicalLimitations = [
    ...site.limitations,
    `Gravity Gap: Earth 1.00g vs. ${target.gravityG}g at ${target.name} alters regolith cohesion, hopper/drill cuttings transport, and structural loads.`,
    `Atmosphere & Vacuum Gap: Earth 101,325 Pa atmosphere vs. ${target.surfacePressurePa < 1 ? '3e-10 Pa lunar exosphere vacuum' : `${target.surfacePressurePa} Pa tenuous Martian CO2`}.`,
    `Radiation Environment: Terrestrial ~0.002 Sv/yr magnetosphere shielding vs. ${target.radiationSvPerYear} Sv/yr galactic cosmic & solar particle exposure at ${target.name}.`
  ];

  return {
    generatedAtUtc,
    terminologyNote:
      'Suitability scores measure multi-parameter Earth Analog Suitability across measured & archived datasets; they do not represent probabilities of physical equivalence.',
    targetOverview: {
      id: target.id,
      body: target.body,
      name: target.name,
      region: target.region,
      coordinates: target.coordinates,
      gravityG: target.gravityG,
      surfacePressurePa: target.surfacePressurePa,
      meanTempC: target.meanTempC,
      minTempC: target.minTempC,
      maxTempC: target.maxTempC,
      typicalSlopeDeg: target.typicalSlopeDeg,
      roughnessIndex: target.roughnessIndex,
      radiationSvPerYear: target.radiationSvPerYear,
      keyResource: target.keyResource,
      keyHazard: target.keyHazard,
      missionSummary: target.missionSummary,
      pdsCitations: target.pdsCitations
    },
    earthAnalogOverview: {
      id: site.id,
      name: site.name,
      region: site.region,
      country: site.country,
      lat: site.lat,
      lon: site.lon,
      elevationM: live?.openMeteoWeather.elevationM ?? site.topography.elevationM,
      classification:
        site.tier === 'discovered-candidate'
          ? 'Algorithmically Discovered Global Candidate'
          : site.tier === 'hidden-gem'
            ? 'Curated Hidden-Gem Field Analog'
            : 'Curated Well-Known Reference Analog',
      summary: site.summary,
      discoveryRationale: site.discoveryRationale,
      useCases: site.useCases
    },
    overallAssessment: {
      rank,
      earthAnalogSuitabilityPct: similarity.compositeScore,
      dataConfidencePct: similarity.confidencePct,
      availableWeightPct: similarity.availableWeightPct,
      unavailableAxes: similarity.unavailableAxes,
      methodologyNote: similarity.methodologyNote
    },
    dimensionComparison,
    similarities,
    differences,
    explorationApplications,
    dataSources,
    limitationsAndConfidence: {
      confidencePct: similarity.confidencePct,
      physicalLimitations,
      liveFeedSummary
    }
  };
}

function csvEscape(val: unknown): string {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildScientificCsv(report: ScientificComparisonReport): string {
  const rows: string[][] = [
    ['Twin Worlds — NASA Space Apps 2026 Earth Analog Suitability Report'],
    ['Generated UTC', report.generatedAtUtc],
    ['Terminology Note', report.terminologyNote],
    ['Target Destination', `${report.targetOverview.name} (${report.targetOverview.coordinates})`],
    ['Earth Analog', `${report.earthAnalogOverview.name} (${report.earthAnalogOverview.lat}, ${report.earthAnalogOverview.lon})`],
    ['Classification', report.earthAnalogOverview.classification],
    ['Earth Analog Suitability (%)', report.overallAssessment.earthAnalogSuitabilityPct.toFixed(1)],
    ['Independent Data Confidence (%)', String(report.overallAssessment.dataConfidencePct)],
    ['Available Weight Coverage (%)', report.overallAssessment.availableWeightPct.toFixed(1)],
    ['Methodology', report.overallAssessment.methodologyNote],
    [],
    [
      'Dimension',
      'Available',
      'Suitability Score (%)',
      'Normalized Weight (%)',
      'Data Confidence (%)',
      'Provenance Status',
      'Target Measurement',
      'Earth Measurement',
      'Units',
      'Dataset Source',
      'Formula Notes'
    ]
  ];

  for (const row of report.dimensionComparison) {
    rows.push([
      row.label,
      row.available ? 'YES' : 'NO',
      row.suitabilityScore !== null ? row.suitabilityScore.toFixed(1) : 'UNAVAILABLE',
      row.normalizedWeightPct.toFixed(1),
      String(row.confidencePct),
      row.provenance.toUpperCase(),
      row.targetMeasurement,
      row.earthMeasurement,
      row.unit,
      row.datasetName,
      row.formulaNote
    ]);
  }

  rows.push([]);
  rows.push(['Section', 'Scientific Finding']);
  report.similarities.forEach((s) => rows.push(['Similarity', s]));
  report.differences.forEach((d) => rows.push(['Difference', d]));
  report.explorationApplications.forEach((app) =>
    rows.push([`Application: ${app.domain}`, app.rationale])
  );
  report.limitationsAndConfidence.physicalLimitations.forEach((lim) =>
    rows.push(['Physical Limitation', lim])
  );

  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
}

function toAsciiPdfSafe(input: string): string {
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2194/g, '<->')
    .replace(/\u00B0/g, ' deg ')
    .replace(/\u00B5/g, 'u')
    .replace(/\u2082/g, '2')
    .replace(/\u2070/g, '0')
    .replace(/\u207B\u00B9/g, '-1')
    .replace(/\u0394/g, 'dT=')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(text: string, maxChars: number): string[] {
  const clean = toAsciiPdfSafe(text);
  if (!clean) return [''];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = current ? `${current} ${w}` : w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function pdfEscape(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Generate a clean, valid multi-page PDF 1.4 Blob containing all 8 scientific sections.
 * Pure TypeScript — zero window.open or external PDF libraries required.
 */
export function buildScientificPdfBlob(report: ScientificComparisonReport): Blob {
  type PdfLine = { text: string; size: number; bold?: boolean; indent?: number };
  const allLines: PdfLine[] = [];

  const pushHeading = (title: string) => {
    allLines.push({ text: '', size: 8 });
    allLines.push({ text: title, size: 12, bold: true });
  };
  const pushBody = (text: string, indent = 0) => {
    wrapText(text, indent > 0 ? 84 : 90).forEach((line) => {
      allLines.push({ text: line, size: 9.5, indent });
    });
  };

  allLines.push({ text: 'TWIN WORLDS - EARTH ANALOG SUITABILITY SCIENTIFIC REPORT', size: 14, bold: true });
  allLines.push({
    text: `Generated: ${report.generatedAtUtc} | Rank #${report.overallAssessment.rank}`,
    size: 9
  });
  allLines.push({
    text: `Earth Analog Suitability: ${report.overallAssessment.earthAnalogSuitabilityPct.toFixed(1)}% | Data Confidence: ${report.overallAssessment.dataConfidencePct}% | Coverage: ${report.overallAssessment.availableWeightPct.toFixed(1)}%`,
    size: 10,
    bold: true
  });
  pushBody(report.terminologyNote);

  pushHeading('1. PLANETARY TARGET OVERVIEW');
  pushBody(
    `${report.targetOverview.name} (${report.targetOverview.body.toUpperCase()} - ${report.targetOverview.region}, ${report.targetOverview.coordinates})`
  );
  pushBody(
    `Gravity: ${report.targetOverview.gravityG}g | Pressure: ${report.targetOverview.surfacePressurePa} Pa | Thermal: ${report.targetOverview.minTempC}..${report.targetOverview.maxTempC} C (mean ${report.targetOverview.meanTempC} C) | Slope: ${report.targetOverview.typicalSlopeDeg} deg | Radiation: ${report.targetOverview.radiationSvPerYear} Sv/yr`
  );
  pushBody(`Key Resource: ${report.targetOverview.keyResource}`);
  pushBody(`Key Hazard: ${report.targetOverview.keyHazard}`);
  pushBody(report.targetOverview.missionSummary);

  pushHeading('2. EARTH ANALOG OVERVIEW');
  pushBody(
    `${report.earthAnalogOverview.name} (${report.earthAnalogOverview.region}, ${report.earthAnalogOverview.country}) | ${report.earthAnalogOverview.lat.toFixed(3)}, ${report.earthAnalogOverview.lon.toFixed(3)} | Elev ${report.earthAnalogOverview.elevationM} m`
  );
  pushBody(`Classification: ${report.earthAnalogOverview.classification}`);
  pushBody(report.earthAnalogOverview.summary);
  pushBody(report.earthAnalogOverview.discoveryRationale);

  pushHeading('3. EIGHT-DIMENSION SCIENTIFIC COMPARISON');
  for (const dim of report.dimensionComparison) {
    const scoreStr = dim.available && dim.suitabilityScore !== null ? `${dim.suitabilityScore.toFixed(1)}%` : 'UNAVAILABLE';
    pushBody(
      `${dim.label}: ${scoreStr} (Wt ${dim.normalizedWeightPct.toFixed(1)}%, Conf ${dim.confidencePct}%, ${dim.provenance.toUpperCase()})`,
      4
    );
    pushBody(`Earth: ${dim.earthMeasurement} | Target: ${dim.targetMeasurement}`, 12);
  }

  pushHeading('4. SIMILARITIES');
  report.similarities.slice(0, 12).forEach((s) => pushBody(`- ${s}`, 4));

  pushHeading('5. KEY DIFFERENCES');
  report.differences.slice(0, 12).forEach((d) => pushBody(`- ${d}`, 4));

  pushHeading('6. EXPLORATION APPLICATIONS');
  report.explorationApplications.forEach((app) => {
    pushBody(`${app.domain}: ${app.rationale}`, 4);
  });

  pushHeading('7. DATA SOURCES & PROVENANCE');
  report.dataSources.forEach((ds) => {
    pushBody(
      `- ${ds.dimension}: ${ds.record.datasetName} (${ds.record.provider}, ${ds.record.spatialResolution}, status=${ds.record.status})`,
      4
    );
  });

  pushHeading('8. CONFIDENCE, METHODOLOGY & PHYSICAL LIMITATIONS');
  pushBody(report.overallAssessment.methodologyNote);
  report.limitationsAndConfidence.physicalLimitations.forEach((lim) => pushBody(`- ${lim}`, 4));

  // Paginate lines across US Letter pages (612 x 792 pt)
  const linesPerPage = 52;
  const pages: PdfLine[][] = [];
  for (let i = 0; i < allLines.length; i += linesPerPage) {
    pages.push(allLines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([{ text: 'Twin Worlds Report', size: 12, bold: true }]);

  // Build PDF object table
  // 1: Catalog, 2: Pages, 3: Font Regular, 4: Font Bold, then pairs of (Page, ContentStream)
  const objects: string[] = [];
  const pageObjNums: number[] = [];

  pages.forEach((_, idx) => {
    pageObjNums.push(5 + idx * 2);
  });

  objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`;
  objects[3] = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  objects[4] = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  pages.forEach((pageLines, idx) => {
    const pageObj = 5 + idx * 2;
    const contentObj = pageObj + 1;
    let stream = 'BT\n';
    let y = 752;
    for (const line of pageLines) {
      const font = line.bold ? '/F2' : '/F1';
      const x = 44 + (line.indent ?? 0);
      stream += `${font} ${line.size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEscape(line.text)}) Tj\n`;
      y -= line.size >= 12 ? 16 : 13;
    }
    stream += `/F1 8 Tf 1 0 0 1 44 26 Tm (Page ${idx + 1} of ${pages.length} - Twin Worlds Earth Analog Explorer) Tj\nET\n`;

    objects[pageObj] = `${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>\nendobj\n`;
    objects[contentObj] = `${contentObj} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += objects[i];
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}
