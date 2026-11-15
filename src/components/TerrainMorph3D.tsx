import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AlertCircle, Grid, Radar, RotateCw } from 'lucide-react';
import { resampleGrid } from '../lib/dem';
import type { DemGridPayload, EarthAnalogSite, PlanetaryTarget } from '../types/analog';
import { ProvenanceBadge } from './ProvenanceBadge';

interface TerrainMorph3DProps {
  target: PlanetaryTarget;
  site: EarthAnalogSite;
  scanning: boolean;
  onTriggerScan: () => void;
}

function pseudoNoise(x: number, z: number, seed: number): number {
  return (
    Math.sin(x * 0.55 + seed) * Math.cos(z * 0.52 - seed * 0.7) * 0.65 +
    Math.sin((x + z) * 1.15 + seed * 1.4) * 0.25 +
    Math.cos((x - z) * 2.2 - seed) * 0.1
  );
}

function sampleFallbackTargetTerrain(x: number, z: number, target: PlanetaryTarget): number {
  const r = Math.hypot(x, z);
  const slopeScale = 0.6 + target.typicalSlopeDeg * 0.12;
  const rough = target.roughnessIndex * 0.85;
  const n = pseudoNoise(x, z, target.body === 'moon' ? 2.1 : 5.7) * rough;

  if (target.id.includes('shackleton-floor') || target.id.includes('gale')) {
    const bowl = THREE.MathUtils.smoothstep(r, 1.8, 4.6) * 2.1 * slopeScale;
    const rimDrop = 1.0 - THREE.MathUtils.smoothstep(r, 4.6, 6.8) * 0.55;
    const centralPeak = target.id.includes('gale') ? Math.exp(-r * r * 0.55) * 1.5 : 0;
    return bowl * rimDrop + centralPeak + n * 0.75 - 0.8;
  }

  if (target.id.includes('south-pole-rim')) {
    const ridge = Math.exp(-Math.pow(x * 0.42 + Math.sin(z * 0.35) * 0.5, 2)) * 2.2 * slopeScale;
    const secondary = Math.exp(-Math.pow(r - 3.6, 2) * 0.45) * 0.9;
    return ridge + secondary + n * 0.85 - 0.5;
  }

  const delta = Math.exp(-Math.pow(z + 1.2 - Math.abs(x) * 0.35, 2) * 0.25) * 1.5 * slopeScale;
  return delta + n * 0.9 - 0.3;
}

function sampleFallbackEarthTerrain(x: number, z: number, site: EarthAnalogSite): number {
  const r = Math.hypot(x, z);
  const slopeScale = 0.55 + site.topography.meanSlopeDeg * 0.13;
  const rough = site.topography.roughnessIndex * 0.9;
  const seed = (Math.abs(site.lat) + Math.abs(site.lon)) * 0.13;
  const n = pseudoNoise(x, z, seed) * rough;

  if (site.geology.craterOrigin) {
    const rim = Math.exp(-Math.pow(r - 3.3, 2) * 0.85) * 1.85 * slopeScale;
    const floor = -Math.exp(-r * r * 0.16) * 1.45;
    return rim + floor + n * 0.65;
  }

  return Math.sin(x * 0.35) * 0.7 * slopeScale + n * 0.85 - 0.25;
}

function normalizeMatrixToScene(grid: number[][], targetVerts: number, maxVisualRelief = 2.9): Float32Array {
  const resampled = resampleGrid(grid, targetVerts);
  const out = new Float32Array(targetVerts * targetVerts);
  let minV = Infinity;
  let maxV = -Infinity;
  for (let r = 0; r < targetVerts; r++) {
    for (let c = 0; c < targetVerts; c++) {
      const v = resampled[r]?.[c] ?? 0;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  const span = Math.max(1, maxV - minV);
  const mid = (minV + maxV) / 2;

  let idx = 0;
  for (let r = 0; r < targetVerts; r++) {
    for (let c = 0; c < targetVerts; c++) {
      const v = resampled[r]?.[c] ?? mid;
      out[idx++] = ((v - mid) / span) * maxVisualRelief;
    }
  }
  return out;
}

function hypsometricRgb(normT: number, isMars: boolean, earthBlend: number): [number, number, number] {
  // normT in [0..1] from valley floor to ridge crest
  const t = THREE.MathUtils.clamp(normT, 0, 1);
  // Planetary base color ramp (Lunar Slate / Mars Rust-Ochre)
  const pLow = isMars ? [0.24, 0.11, 0.08] : [0.14, 0.18, 0.25];
  const pMid = isMars ? [0.76, 0.36, 0.20] : [0.55, 0.62, 0.72];
  const pHigh = isMars ? [0.97, 0.76, 0.56] : [0.92, 0.96, 1.0];

  // Earth hypsometric cyan-emerald-snow ramp
  const eLow = [0.08, 0.25, 0.42];
  const eMid = [0.22, 0.64, 0.78];
  const eHigh = [0.89, 0.95, 0.99];

  const mixRamp = (low: number[], mid: number[], high: number[]) => {
    if (t < 0.5) {
      const f = t * 2;
      return [
        THREE.MathUtils.lerp(low[0], mid[0], f),
        THREE.MathUtils.lerp(low[1], mid[1], f),
        THREE.MathUtils.lerp(low[2], mid[2], f)
      ];
    }
    const f = (t - 0.5) * 2;
    return [
      THREE.MathUtils.lerp(mid[0], high[0], f),
      THREE.MathUtils.lerp(mid[1], high[1], f),
      THREE.MathUtils.lerp(mid[2], high[2], f)
    ];
  };

  const pCol = mixRamp(pLow, pMid, pHigh);
  const eCol = mixRamp(eLow, eMid, eHigh);
  return [
    THREE.MathUtils.lerp(pCol[0], eCol[0], earthBlend),
    THREE.MathUtils.lerp(pCol[1], eCol[1], earthBlend),
    THREE.MathUtils.lerp(pCol[2], eCol[2], earthBlend)
  ];
}

export function TerrainMorph3D({ target, site, scanning, onTriggerScan }: TerrainMorph3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [morphPct, setMorphPct] = useState(35);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  const [planetaryDem, setPlanetaryDem] = useState<DemGridPayload | null>(null);
  const [earthDem, setEarthDem] = useState<DemGridPayload | null>(null);
  const [demLoading, setDemLoading] = useState(false);

  const stateRef = useRef({ target, site, morphPct, wireframe, autoRotate, scanning });
  stateRef.current = { target, site, morphPct, wireframe, autoRotate, scanning };

  const heightCacheRef = useRef<{
    targetH: Float32Array;
    earthH: Float32Array;
    dirty: boolean;
  }>({
    targetH: new Float32Array(0),
    earthH: new Float32Array(0),
    dirty: true
  });

  // Fetch real USGS LOLA/MOLA Planetary DEM and real Copernicus GLO-90 Earth DEM
  useEffect(() => {
    let active = true;
    setDemLoading(true);
    Promise.all([
      fetch(
        `/api/dem/planetary?targetId=${encodeURIComponent(target.id)}&body=${target.body}&lat=${target.lat.toFixed(4)}&lon=${target.lon.toFixed(4)}`
      ).then((r) => (r.ok ? (r.json() as Promise<DemGridPayload>) : null)),
      fetch(`/api/dem/earth?lat=${site.lat.toFixed(4)}&lon=${site.lon.toFixed(4)}`).then((r) =>
        r.ok ? (r.json() as Promise<DemGridPayload>) : null
      )
    ])
      .then(([pDem, eDem]) => {
        if (!active) return;
        setPlanetaryDem(pDem);
        setEarthDem(eDem);
        setDemLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setDemLoading(false);
      });
    return () => {
      active = false;
    };
  }, [target.id, target.body, target.lat, target.lon, site.id, site.lat, site.lon]);

  // Populate height buffers from real DEM matrices (with explicit fallback notice only if live fetch fails)
  useEffect(() => {
    const segs = 72;
    const vertsPerSide = segs + 1;
    const count = vertsPerSide * vertsPerSide;
    const size = 12;

    let tArr: Float32Array;
    if (planetaryDem?.status === 'live' && planetaryDem.heightsM.length >= 4) {
      tArr = normalizeMatrixToScene(planetaryDem.heightsM, vertsPerSide, 2.8);
    } else {
      tArr = new Float32Array(count);
      let idx = 0;
      for (let iy = 0; iy <= segs; iy++) {
        const z = (iy / segs - 0.5) * size;
        for (let ix = 0; ix <= segs; ix++) {
          const x = (ix / segs - 0.5) * size;
          tArr[idx++] = sampleFallbackTargetTerrain(x, z, target);
        }
      }
    }

    let eArr: Float32Array;
    if (earthDem?.status === 'live' && earthDem.heightsM.length >= 4) {
      eArr = normalizeMatrixToScene(earthDem.heightsM, vertsPerSide, 2.8);
    } else {
      eArr = new Float32Array(count);
      let idx = 0;
      for (let iy = 0; iy <= segs; iy++) {
        const z = (iy / segs - 0.5) * size;
        for (let ix = 0; ix <= segs; ix++) {
          const x = (ix / segs - 0.5) * size;
          eArr[idx++] = sampleFallbackEarthTerrain(x, z, site);
        }
      }
    }

    heightCacheRef.current.targetH = tArr;
    heightCacheRef.current.earthH = eArr;
    heightCacheRef.current.dirty = true;
  }, [target, site, planetaryDem, earthDem]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let isSoftwareGl = false;
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(8.5, 6.8, 9.2);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x0f172a, 0.95);
    const sun = new THREE.DirectionalLight(0xfff7ed, 2.0);
    sun.position.set(9, 14, 7);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rim.position.set(-8, 6, -9);
    scene.add(hemi, sun, rim);

    const segs = 72;
    const terrainGeo = new THREE.PlaneGeometry(12, 12, segs, segs);
    terrainGeo.rotateX(-Math.PI / 2);

    // Initialize vertex color attribute for hypsometric tinting
    const vCount = terrainGeo.attributes.position.count;
    const colors = new Float32Array(vCount * 3);
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      metalness: 0.16,
      flatShading: false
    });

    terrainMat.onBeforeCompile = (shader) => {
      shader.uniforms.uScanZ = { value: -99 };
      shader.uniforms.uScanActive = { value: 0 };
      terrainMat.userData.shader = shader;

      shader.vertexShader =
        `varying vec3 vTerrainPos;\n` +
        shader.vertexShader.replace(
          '#include <project_vertex>',
          `#include <project_vertex>
           vTerrainPos = transformed;`
        );

      shader.fragmentShader =
        `varying vec3 vTerrainPos;
         uniform float uScanZ;
         uniform float uScanActive;\n` +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float contour = abs(fract(vTerrainPos.y * 2.2) - 0.5);
           float line = 1.0 - smoothstep(0.0, 0.04, contour);
           diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.74, 0.97), line * 0.18);
           float beam = exp(-pow(vTerrainPos.z - uScanZ, 2.0) * 3.5) * uScanActive;
           diffuseColor.rgb += vec3(0.22, 0.85, 1.0) * beam * 0.95;`
        );
    };

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrainMesh);

    const wireOverlayMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    const wireMesh = new THREE.Mesh(terrainGeo, wireOverlayMat);
    wireMesh.position.y = 0.015;
    wireMesh.visible = false;
    scene.add(wireMesh);

    const gridHelper = new THREE.GridHelper(12, 12, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -1.7;
    scene.add(gridHelper);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.minDistance = 6;
    controls.maxDistance = 22;

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    let disposed = false;
    let frameId = 0;
    let currentMorph = stateRef.current.morphPct / 100;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) frameId = window.setTimeout(poll, 6);
        else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 85);
        }
      };
      frameId = window.setTimeout(poll, 6);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();
      const {
        morphPct: targetMorphPct,
        wireframe: wf,
        autoRotate: ar,
        scanning: isScan,
        target: curTarget
      } = stateRef.current;

      const targetMorph = targetMorphPct / 100;
      const prevMorph = currentMorph;
      currentMorph = THREE.MathUtils.damp(currentMorph, targetMorph, 7.5, dt);

      const cache = heightCacheRef.current;
      if (cache.targetH.length > 0 && (cache.dirty || Math.abs(currentMorph - prevMorph) > 0.0005)) {
        const pos = terrainGeo.attributes.position;
        const colAttr = terrainGeo.attributes.color;
        let minY = Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < pos.count; i++) {
          const y = THREE.MathUtils.lerp(cache.targetH[i], cache.earthH[i], currentMorph);
          pos.setY(i, y);
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        const ySpan = Math.max(0.1, maxY - minY);
        const isMars = curTarget.body === 'mars';
        for (let i = 0; i < pos.count; i++) {
          const normT = (pos.getY(i) - minY) / ySpan;
          const [r, g, b] = hypsometricRgb(normT, isMars, currentMorph);
          colAttr.setXYZ(i, r, g, b);
        }
        pos.needsUpdate = true;
        colAttr.needsUpdate = true;
        terrainGeo.computeVertexNormals();
        cache.dirty = false;
      }

      wireMesh.visible = wf;
      if (terrainMat.userData.shader) {
        terrainMat.userData.shader.uniforms.uScanActive.value = isScan ? 1.0 : 0.0;
        terrainMat.userData.shader.uniforms.uScanZ.value = ((elapsed * 4.5) % 14) - 7;
      }

      controls.autoRotate = ar;
      controls.autoRotateSpeed = 0.8;
      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      wireOverlayMat.dispose();
      env.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const showingEarthDominant = morphPct >= 50;
  const activeDem = showingEarthDominant ? earthDem : planetaryDem;
  const bothLive = planetaryDem?.status === 'live' && earthDem?.status === 'live';
  const anyFallback =
    (planetaryDem && planetaryDem.status !== 'live') || (earthDem && earthDem.status !== 'live');

  return (
    <div className="glass-surface rounded-3xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="glass-header-bar flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] tracking-widest uppercase text-sky-300">
              Real DEM 3D Terrain Morph
            </span>
            <ProvenanceBadge
              kind={demLoading ? 'archived' : bothLive ? 'live' : activeDem?.status ?? 'archived'}
              detail={
                demLoading
                  ? 'Fetching DEMs'
                  : bothLive
                    ? `${target.body === 'moon' ? 'LOLA' : 'MOLA'} + COP90 Live`
                    : 'Partial Fallback'
              }
            />
          </div>
          <div className="text-xs text-slate-200 mt-0.5">
            Drag to orbit · Morphing measured relief: {target.name} ↔ {site.name}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWireframe((w) => !w)}
            className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-medium rounded-full cursor-pointer ${
              wireframe ? 'glass-btn-active' : 'glass-btn'
            }`}
          >
            <Grid className="w-3 h-3" />
            Mesh
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate((a) => !a)}
            className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-medium rounded-full cursor-pointer ${
              autoRotate ? 'glass-btn-active' : 'glass-btn'
            }`}
          >
            <RotateCw className="w-3 h-3" />
            Orbit
          </button>
          <button
            type="button"
            onClick={onTriggerScan}
            className="glass-btn-active inline-flex items-center gap-1 px-3 py-1 text-[11px] font-mono rounded-full cursor-pointer"
          >
            <Radar className="w-3 h-3" />
            Scan
          </button>
        </div>
      </div>

      {/* Measured Elevation & Slope Readout Bar */}
      <div className="px-4 py-2 border-b border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px] tabular-nums bg-white/[0.02]">
        <div>
          <span className="text-slate-400 block">
            {showingEarthDominant ? 'Earth DEM (COP90)' : `${target.body === 'moon' ? 'Moon LOLA' : 'Mars MOLA'}`}
          </span>
          <span className="text-white font-semibold">
            {activeDem?.status === 'live'
              ? `${activeDem.minM.toFixed(0)}m to ${activeDem.maxM.toFixed(0)}m`
              : 'Loading...'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Total Relief</span>
          <span className="text-sky-200 font-semibold">
            {activeDem?.status === 'live' ? `${activeDem.reliefM.toFixed(0)} m` : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Mean / Max Slope</span>
          <span className="text-white font-semibold">
            {activeDem?.status === 'live'
              ? `${activeDem.meanSlopeDeg.toFixed(1)}° / ${activeDem.maxSlopeDeg.toFixed(1)}°`
              : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">TRI Roughness / Res</span>
          <span className="text-amber-200 font-semibold">
            {activeDem?.status === 'live'
              ? `${activeDem.roughnessIndex.toFixed(2)} @ ${activeDem.resolutionM}m`
              : '—'}
          </span>
        </div>
      </div>

      {anyFallback && !demLoading && (
        <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-400/25 flex items-center gap-2 text-[11px] text-amber-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Live DEM unavailable for one surface; procedural fallback profile displayed with disclaimer.
          </span>
        </div>
      )}

      {/* 3D Canvas */}
      <div ref={mountRef} className="w-full h-[270px] sm:h-[310px] relative cursor-grab active:cursor-grabbing" />

      {/* Hypsometric Legend + Morph Slider Bar */}
      <div className="glass-footer-bar px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-slate-300">
          <span>{activeDem?.status === 'live' ? `${activeDem.minM.toFixed(0)} m` : 'Low'}</span>
          <div
            className="flex-1 h-2 rounded-full border border-white/20"
            style={{
              background:
                showingEarthDominant
                  ? 'linear-gradient(90deg, #14406b 0%, #38a3c7 50%, #e3f2fc 100%)'
                  : target.body === 'mars'
                    ? 'linear-gradient(90deg, #3d1c14 0%, #c25c33 50%, #f7c28f 100%)'
                    : 'linear-gradient(90deg, #242e40 0%, #8c9eb8 50%, #ebf5ff 100%)'
            }}
          />
          <span>{activeDem?.status === 'live' ? `${activeDem.maxM.toFixed(0)} m` : 'Crest'}</span>
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <span className={target.body === 'mars' ? 'text-orange-300' : 'text-slate-200'}>
            0% {target.body === 'moon' ? 'LOLA MOON' : 'MOLA MARS'}
          </span>
          <span className="text-sky-300 tabular-nums font-semibold">MORPH: {morphPct}%</span>
          <span className="text-sky-300">100% COP90 EARTH</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={morphPct}
          onChange={(e) => setMorphPct(Number(e.target.value))}
          aria-label="3D terrain morphing slider between planetary DEM and Earth DEM"
          className="w-full cursor-pointer"
        />
      </div>
    </div>
  );
}
