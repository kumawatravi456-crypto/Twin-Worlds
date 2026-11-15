import * as THREE from 'three';
import type { SolarPlanetId } from './solarSystemData';

// Fast deterministic value noise & 2D FBM for seamless-looking planetary relief
function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq, seed + i * 19.3);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

export interface PlanetTexturePack {
  map: THREE.CanvasTexture;
  bumpMap?: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
  nightMap?: THREE.CanvasTexture;
  cloudsMap?: THREE.CanvasTexture;
}

function finalizeTexture(canvas: HTMLCanvasElement, isColor: boolean, maxAniso: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createMilkyWaySkyTexture(maxAniso: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#02040b';
  ctx.fillRect(0, 0, w, h);

  // Faint diagonal galactic plane band
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      // Tilted galactic equator curve
      const galY = 0.5 + 0.24 * Math.sin(u * Math.PI * 2 + 0.7);
      const dist = Math.abs(v - galY);
      const band = Math.exp(-Math.pow(dist / 0.14, 2));
      const n1 = fbm(u * 14, v * 7, 11, 4);
      const rift = fbm(u * 26 + 3, v * 14, 37, 3);
      const dustDarken = Math.max(0.25, 1.0 - Math.max(0, rift - 0.45) * 1.45);
      const glow = band * n1 * dustDarken;

      const idx = (y * w + x) * 4;
      d[idx] = Math.min(255, 2 + glow * 54 + Math.max(0, n1 - 0.55) * band * 40);
      d[idx + 1] = Math.min(255, 4 + glow * 64);
      d[idx + 2] = Math.min(255, 11 + glow * 96);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Subtle pinpoint micro-stars baked into sky dome
  for (let i = 0; i < 1400; i++) {
    const sx = hash2(i, 1, 91) * w;
    const sy = hash2(i, 2, 91) * h;
    const br = 0.25 + hash2(i, 3, 91) * 0.75;
    ctx.fillStyle = `rgba(226, 238, 255, ${br.toFixed(2)})`;
    ctx.fillRect(sx, sy, i % 9 === 0 ? 1.6 : 1, i % 9 === 0 ? 1.6 : 1);
  }

  return finalizeTexture(canvas, true, maxAniso);
}

export function createSolarTexturePack(id: SolarPlanetId | 'moon', maxAniso: number): PlanetTexturePack {
  const w = 768;
  const h = 384;

  if (id === 'earth') {
    const colorCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');
    const nightCanvas = document.createElement('canvas');
    const cloudCanvas = document.createElement('canvas');

    [colorCanvas, bumpCanvas, roughCanvas, nightCanvas, cloudCanvas].forEach((c) => {
      c.width = w;
      c.height = h;
    });

    const cCtx = colorCanvas.getContext('2d')!;
    const bCtx = bumpCanvas.getContext('2d')!;
    const rCtx = roughCanvas.getContext('2d')!;
    const nCtx = nightCanvas.getContext('2d')!;
    const clCtx = cloudCanvas.getContext('2d')!;

    // Deep bathymetric ocean base
    cCtx.fillStyle = '#072448';
    cCtx.fillRect(0, 0, w, h);

    const cImg = cCtx.getImageData(0, 0, w, h);
    const bImg = bCtx.getImageData(0, 0, w, h);
    const rImg = rCtx.getImageData(0, 0, w, h);
    const nImg = nCtx.getImageData(0, 0, w, h);
    const clImg = clCtx.getImageData(0, 0, w, h);

    // Define smooth continental SDF lobes + FBM coastlines
    const landZones = [
      // North America
      { cx: 0.22, cy: 0.30, rx: 0.11, ry: 0.14 },
      { cx: 0.27, cy: 0.42, rx: 0.04, ry: 0.08 },
      // South America
      { cx: 0.31, cy: 0.63, rx: 0.055, ry: 0.14 },
      // Greenland
      { cx: 0.37, cy: 0.14, rx: 0.045, ry: 0.06 },
      // Europe + Eurasia
      { cx: 0.56, cy: 0.27, rx: 0.10, ry: 0.10 },
      { cx: 0.72, cy: 0.29, rx: 0.17, ry: 0.13 },
      { cx: 0.76, cy: 0.42, rx: 0.09, ry: 0.08 },
      // Africa
      { cx: 0.54, cy: 0.53, rx: 0.075, ry: 0.14 },
      // Australia
      { cx: 0.83, cy: 0.67, rx: 0.06, ry: 0.07 }
    ];

    for (let y = 0; y < h; y++) {
      const v = y / h;
      const lat = Math.abs(v - 0.5) * 2; // 0 eq, 1 pole
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const idx = (y * w + x) * 4;

        // Continental mask modulated by fractal coastline noise
        let lobe = 0;
        for (const z of landZones) {
          const dx = (u - z.cx) / z.rx;
          const dy = (v - z.cy) / z.ry;
          const d2 = dx * dx + dy * dy;
          if (d2 < 2.2) lobe = Math.max(lobe, Math.exp(-d2 * 1.15));
        }
        if (v > 0.87) lobe = Math.max(lobe, (v - 0.87) * 8); // Antarctica

        const coastNoise = fbm(u * 14, v * 7, 17, 4);
        const ridgeNoise = fbm(u * 32, v * 16, 43, 4);
        const elevation = lobe * 0.72 + coastNoise * 0.45 - 0.48;
        const isLand = elevation > 0;

        let cr = 0;
        let cg = 0;
        let cb = 0;
        let rough = 48; // ~0.19 ocean specular
        let bump = 0;
        let night = 0;

        if (isLand) {
          const hNorm = Math.min(1, elevation * 2.4);
          bump = Math.min(255, Math.round(90 + hNorm * 165));
          rough = 216; // matte land (~0.85)

          const aridMask = Math.exp(-Math.pow((lat - 0.26) / 0.14, 2)) * (0.5 + 0.5 * coastNoise);
          const snowMask = lat > 0.78 || hNorm > 0.78;

          if (snowMask) {
            cr = 236;
            cg = 244;
            cb = 252;
            rough = 175;
          } else if (aridMask > 0.56) {
            // Sahara / Arabia / Outback ochre-sand
            cr = 188 - hNorm * 30;
            cg = 152 - hNorm * 28;
            cb = 98 - hNorm * 18;
          } else {
            // Lush forests & temperate highlands
            cr = Math.round(34 + hNorm * 72 + ridgeNoise * 18);
            cg = Math.round(96 + (1 - hNorm) * 42 + ridgeNoise * 18);
            cb = Math.round(38 + hNorm * 40);
          }

          // Urban night-light clusters on temperate lowlands
          if (lat < 0.68 && hNorm < 0.45) {
            const citySignal = smoothNoise(u * 56, v * 28, 79) * smoothNoise(u * 22, v * 11, 103);
            if (citySignal > 0.56) {
              night = Math.min(255, Math.round((citySignal - 0.56) * 620));
            }
          }
        } else {
          // Ocean bathymetry shelf brighten near coast
          const shelf = Math.max(0, Math.min(1, (elevation + 0.12) / 0.12));
          cr = Math.round(7 + shelf * 18);
          cg = Math.round(38 + shelf * 72);
          cb = Math.round(92 + shelf * 68);
          if (lat > 0.86) {
            // Polar sea ice
            cr = 224;
            cg = 236;
            cb = 248;
            rough = 150;
          }
        }

        // Swirling cloud layer
        const swirl = fbm(u * 10 + Math.sin(v * 9) * 0.4, v * 6, 61, 4);
        const cloudDensity = Math.max(0, (swirl - 0.47) * 2.1);
        const cAlpha = Math.min(240, Math.round(cloudDensity * 245));

        cImg.data[idx] = cr;
        cImg.data[idx + 1] = cg;
        cImg.data[idx + 2] = cb;
        cImg.data[idx + 3] = 255;

        bImg.data[idx] = bump;
        bImg.data[idx + 1] = bump;
        bImg.data[idx + 2] = bump;
        bImg.data[idx + 3] = 255;

        rImg.data[idx] = rough;
        rImg.data[idx + 1] = rough;
        rImg.data[idx + 2] = rough;
        rImg.data[idx + 3] = 255;

        nImg.data[idx] = night;
        nImg.data[idx + 1] = Math.round(night * 0.78);
        nImg.data[idx + 2] = Math.round(night * 0.4);
        nImg.data[idx + 3] = 255;

        clImg.data[idx] = 248;
        clImg.data[idx + 1] = 252;
        clImg.data[idx + 2] = 255;
        clImg.data[idx + 3] = cAlpha;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    bCtx.putImageData(bImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    clCtx.putImageData(clImg, 0, 0);

    return {
      map: finalizeTexture(colorCanvas, true, maxAniso),
      bumpMap: finalizeTexture(bumpCanvas, false, maxAniso),
      roughnessMap: finalizeTexture(roughCanvas, false, maxAniso),
      nightMap: finalizeTexture(nightCanvas, true, maxAniso),
      cloudsMap: finalizeTexture(cloudCanvas, true, maxAniso)
    };
  }

  if (id === 'moon' || id === 'mercury') {
    const colorCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    colorCanvas.width = w;
    colorCanvas.height = h;
    bumpCanvas.width = w;
    bumpCanvas.height = h;
    const cCtx = colorCanvas.getContext('2d')!;
    const bCtx = bumpCanvas.getContext('2d')!;

    const cImg = cCtx.createImageData(w, h);
    const bImg = bCtx.createImageData(w, h);
    const isMoon = id === 'moon';

    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const idx = (y * w + x) * 4;
        const regolith = fbm(u * 12, v * 6, isMoon ? 5 : 21, 4);
        const micro = fbm(u * 40, v * 20, isMoon ? 13 : 33, 3);
        const mare = isMoon ? Math.max(0, 0.56 - regolith) * 1.4 : Math.max(0, 0.5 - regolith) * 0.9;
        const base = isMoon ? 176 - mare * 92 + micro * 38 : 148 - mare * 70 + micro * 42;
        const warmTint = isMoon ? 0 : 8;

        cImg.data[idx] = Math.min(255, Math.max(40, base + warmTint));
        cImg.data[idx + 1] = Math.min(255, Math.max(40, base + warmTint * 0.4));
        cImg.data[idx + 2] = Math.min(255, Math.max(40, base - warmTint * 0.3));
        cImg.data[idx + 3] = 255;

        const bVal = Math.min(255, Math.max(0, Math.round(128 + (regolith - 0.5) * 140 + (micro - 0.5) * 90)));
        bImg.data[idx] = bVal;
        bImg.data[idx + 1] = bVal;
        bImg.data[idx + 2] = bVal;
        bImg.data[idx + 3] = 255;
      }
    }
    cCtx.putImageData(cImg, 0, 0);
    bCtx.putImageData(bImg, 0, 0);

    // Draw crisp realistic crater bowls with bright rims onto both albedo & bump
    const craterCount = isMoon ? 85 : 110;
    for (let i = 0; i < craterCount; i++) {
      const cx = hash2(i, 1, 7) * w;
      const cy = 18 + hash2(i, 2, 7) * (h - 36);
      const r = 3 + Math.pow(hash2(i, 3, 7), 2) * 24;

      // Bowl shadow & floor
      const grad = bCtx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
      grad.addColorStop(0, 'rgba(30, 30, 30, 0.72)');
      grad.addColorStop(0.75, 'rgba(60, 60, 60, 0.45)');
      grad.addColorStop(0.92, 'rgba(245, 245, 245, 0.75)');
      grad.addColorStop(1, 'rgba(128, 128, 128, 0)');
      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(cx, cy, r, 0, Math.PI * 2);
      bCtx.fill();

      cCtx.strokeStyle = 'rgba(241, 245, 249, 0.34)';
      cCtx.lineWidth = r > 12 ? 1.6 : 1;
      cCtx.beginPath();
      cCtx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
      cCtx.stroke();
    }

    return {
      map: finalizeTexture(colorCanvas, true, maxAniso),
      bumpMap: finalizeTexture(bumpCanvas, false, maxAniso)
    };
  }

  if (id === 'mars') {
    const colorCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    colorCanvas.width = w;
    colorCanvas.height = h;
    bumpCanvas.width = w;
    bumpCanvas.height = h;
    const cCtx = colorCanvas.getContext('2d')!;
    const bCtx = bumpCanvas.getContext('2d')!;
    const cImg = cCtx.createImageData(w, h);
    const bImg = bCtx.createImageData(w, h);

    for (let y = 0; y < h; y++) {
      const v = y / h;
      const lat = Math.abs(v - 0.5) * 2;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const idx = (y * w + x) * 4;
        const dust = fbm(u * 10, v * 5, 51, 4);
        const basalt = fbm(u * 22 + 2, v * 11, 88, 3);
        const darkPlain = Math.max(0, dust - 0.52) * 1.9;

        let mr = Math.round(218 - darkPlain * 115 + (basalt - 0.5) * 34);
        let mg = Math.round(112 - darkPlain * 65 + (basalt - 0.5) * 24);
        let mb = Math.round(62 - darkPlain * 35 + (basalt - 0.5) * 16);

        // CO2 + H2O polar caps
        if (lat > 0.89 + (dust - 0.5) * 0.06) {
          mr = 242;
          mg = 245;
          mb = 250;
        }

        cImg.data[idx] = Math.min(255, Math.max(40, mr));
        cImg.data[idx + 1] = Math.min(255, Math.max(24, mg));
        cImg.data[idx + 2] = Math.min(255, Math.max(16, mb));
        cImg.data[idx + 3] = 255;

        const bVal = Math.min(255, Math.max(0, Math.round(132 + (dust - 0.5) * 120 + (basalt - 0.5) * 75)));
        bImg.data[idx] = bVal;
        bImg.data[idx + 1] = bVal;
        bImg.data[idx + 2] = bVal;
        bImg.data[idx + 3] = 255;
      }
    }
    cCtx.putImageData(cImg, 0, 0);
    bCtx.putImageData(bImg, 0, 0);

    // Valles Marineris canyon trench across equatorial belt
    const drawValles = (ctx: CanvasRenderingContext2D, stroke: string, width: number) => {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.24, h * 0.53);
      ctx.bezierCurveTo(w * 0.32, h * 0.49, w * 0.39, h * 0.56, w * 0.46, h * 0.52);
      ctx.stroke();
    };
    drawValles(cCtx, 'rgba(72, 24, 10, 0.72)', 7);
    drawValles(bCtx, 'rgba(10, 10, 10, 0.9)', 8);

    // Olympus Mons shield volcano
    const omX = w * 0.16;
    const omY = h * 0.4;
    const omBump = bCtx.createRadialGradient(omX, omY, 2, omX, omY, 24);
    omBump.addColorStop(0, 'rgba(255,255,255,0.95)');
    omBump.addColorStop(0.7, 'rgba(210,210,210,0.45)');
    omBump.addColorStop(1, 'rgba(128,128,128,0)');
    bCtx.fillStyle = omBump;
    bCtx.beginPath();
    bCtx.arc(omX, omY, 24, 0, Math.PI * 2);
    bCtx.fill();

    return {
      map: finalizeTexture(colorCanvas, true, maxAniso),
      bumpMap: finalizeTexture(bumpCanvas, false, maxAniso)
    };
  }

  // Gas & Ice Giants + Venus
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = w;
  colorCanvas.height = h;
  const ctx = colorCanvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const idx = (y * w + x) * 4;
      const turb = fbm(u * 14, v * 20, id === 'jupiter' ? 7 : 19, 4);
      const bandCoord = v * (id === 'jupiter' ? 22 : id === 'saturn' ? 16 : 10) + (turb - 0.5) * 1.45;
      const band = 0.5 + 0.5 * Math.sin(bandCoord * Math.PI);

      let r = 200;
      let g = 200;
      let b = 200;
      if (id === 'venus') {
        const chevron = fbm(u * 8 + Math.abs(v - 0.5) * 4, v * 7, 29, 4);
        r = Math.round(218 + chevron * 30);
        g = Math.round(176 + chevron * 42);
        b = Math.round(104 + chevron * 38);
      } else if (id === 'jupiter') {
        r = Math.round(158 + band * 88);
        g = Math.round(102 + band * 112);
        b = Math.round(68 + band * 102);
      } else if (id === 'saturn') {
        r = Math.round(192 + band * 52);
        g = Math.round(166 + band * 56);
        b = Math.round(112 + band * 52);
      } else if (id === 'uranus') {
        r = Math.round(92 + band * 48);
        g = Math.round(202 + band * 38);
        b = Math.round(218 + band * 30);
      } else if (id === 'neptune') {
        r = Math.round(32 + band * 46);
        g = Math.round(78 + band * 78);
        b = Math.round(188 + band * 60);
      }

      img.data[idx] = Math.min(255, Math.max(0, r));
      img.data[idx + 1] = Math.min(255, Math.max(0, g));
      img.data[idx + 2] = Math.min(255, Math.max(0, b));
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  if (id === 'jupiter') {
    // Great Red Spot anticyclone with cream collar
    const grsX = w * 0.58;
    const grsY = h * 0.64;
    const grsGrad = ctx.createRadialGradient(grsX, grsY, 4, grsX, grsY, 34);
    grsGrad.addColorStop(0, '#B91C1C');
    grsGrad.addColorStop(0.55, '#DC2626');
    grsGrad.addColorStop(0.82, '#EA580C');
    grsGrad.addColorStop(1, 'rgba(254, 215, 170, 0)');
    ctx.fillStyle = grsGrad;
    ctx.beginPath();
    ctx.ellipse(grsX, grsY, 34, 19, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'neptune') {
    ctx.fillStyle = 'rgba(15, 23, 66, 0.72)';
    ctx.beginPath();
    ctx.ellipse(w * 0.38, h * 0.58, 30, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
    ctx.fillRect(w * 0.34, h * 0.54, 48, 4);
  }

  return {
    map: finalizeTexture(colorCanvas, true, maxAniso)
  };
}

export function createSaturnRingTexture(maxAniso: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 8;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);

  for (let x = 0; x < w; x++) {
    const t = x / (w - 1); // 0 inner C-ring -> 1 outer F-ring
    let alpha = 0;
    let tint = 1.0;

    if (t > 0.05 && t <= 0.22) {
      // Translucent C Ring
      alpha = 0.24 + 0.1 * Math.sin(t * 280);
      tint = 0.78;
    } else if (t > 0.22 && t <= 0.61) {
      // Dense bright B Ring with fine ringlets
      alpha = 0.78 + 0.16 * Math.sin(t * 420) * Math.cos(t * 170);
      tint = 0.96 + 0.04 * Math.sin(t * 210);
    } else if (t > 0.61 && t <= 0.665) {
      // Cassini Division gap
      alpha = 0.03;
      tint = 0.45;
    } else if (t > 0.665 && t <= 0.93) {
      // A Ring with Encke gap around t=0.86
      const encke = Math.abs(t - 0.86) < 0.01 ? 0.15 : 1.0;
      alpha = (0.58 + 0.1 * Math.sin(t * 360)) * encke;
      tint = 0.88;
    } else if (t > 0.955 && t <= 0.975) {
      // Narrow F Ring
      alpha = 0.42;
      tint = 0.92;
    }

    const r = Math.round(244 * tint);
    const g = Math.round(224 * tint);
    const b = Math.round(184 * tint);
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);

    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

// Custom GLSL Solar Photosphere Shader (3D simplex turbulence + solar granulation + limb darkening)
export function createSunShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vPositionObj;
      varying vec3 vViewDir;

      void main() {
        vPositionObj = normalize(position);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vPositionObj;
      varying vec3 vViewDir;

      float hash3(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise3(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
              mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
              mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }

      float fbm3(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise3(p);
          p = p * 2.08 + vec3(0.31, -0.47, 0.23);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 p = vPositionObj * 5.2 + vec3(uTime * 0.045, -uTime * 0.03, uTime * 0.035);
        float gran = fbm3(p);
        float flare = fbm3(p * 2.1 - vec3(uTime * 0.06));
        float plasma = smoothstep(0.22, 0.88, gran * 0.65 + flare * 0.35);

        vec3 sunCore = vec3(1.0, 0.98, 0.84);
        vec3 sunMid  = vec3(1.0, 0.66, 0.14);
        vec3 sunSpot = vec3(0.55, 0.16, 0.03);

        vec3 col = mix(sunSpot, sunMid, smoothstep(0.08, 0.55, plasma));
        col = mix(col, sunCore, smoothstep(0.55, 0.98, plasma));

        // Physically inspired Eddington limb darkening + chromospheric edge glow
        float ndotv = clamp(dot(normalize(vNormalView), normalize(vViewDir)), 0.0, 1.0);
        float limb = pow(ndotv, 0.42);
        vec3 chromosphere = vec3(1.0, 0.36, 0.06) * pow(1.0 - ndotv, 2.8) * 1.15;

        gl_FragColor = vec4(col * (0.45 + 0.85 * limb) + chromosphere, 1.0);
      }
    `
  });
}

// Sun-aware Rayleigh atmospheric scattering Fresnel rim shader
export function createAtmosphereMaterial(colorHex: string, sunWorldOrigin: THREE.Vector3, intensity = 0.95): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uSunWorld: { value: sunWorldOrigin },
      uIntensity: { value: intensity }
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uSunWorld;
      uniform float uIntensity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uSunWorld - vWorldPos);

        // Soft BackSide rim falloff
        float rim = pow(clamp(0.72 - dot(N, V), 0.0, 1.0), 2.4);
        float dayFactor = smoothstep(-0.35, 0.55, dot(N, L));
        float alpha = rim * (0.12 + 0.88 * dayFactor) * uIntensity;
        gl_FragColor = vec4(uColor * (1.1 + dayFactor * 0.45), alpha);
      }
    `
  });
}

// Saturn Ring Shader with real spherical planetary shadow umbra + penumbra!
export function createSaturnRingMaterial(
  ringTex: THREE.CanvasTexture,
  planetRadius: number,
  sunWorldOrigin: THREE.Vector3
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: ringTex },
      uPlanetRadius: { value: planetRadius },
      uPlanetWorld: { value: new THREE.Vector3() },
      uSunWorld: { value: sunWorldOrigin }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uPlanetRadius;
      uniform vec3 uPlanetWorld;
      uniform vec3 uSunWorld;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vec4 tex = texture2D(uMap, vUv);
        if (tex.a < 0.02) discard;

        // Ray-sphere shadow test from ring point toward Sun against Saturn's globe
        vec3 toPlanet = uPlanetWorld - vWorldPos;
        vec3 sunDir = normalize(uSunWorld - vWorldPos);
        float proj = dot(toPlanet, sunDir);
        float shadow = 1.0;
        if (proj > 0.0) {
          float perpDist = length(toPlanet - sunDir * proj);
          shadow = smoothstep(uPlanetRadius * 0.94, uPlanetRadius * 1.06, perpDist);
          shadow = mix(0.08, 1.0, shadow);
        }

        gl_FragColor = vec4(tex.rgb * shadow, tex.a);
      }
    `
  });
}
