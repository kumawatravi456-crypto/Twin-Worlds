import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { EarthAnalogSite, SiteSimilarityResult } from '../types/analog';

export type GlobeLayerMode = 'similarity' | 'temperature' | 'waterIce' | 'geology' | 'confidence';

interface EarthGlobeHeatmapProps {
  sites: EarthAnalogSite[];
  scores: Record<string, SiteSimilarityResult>;
  selectedSiteId: string;
  onSelectSite: (siteId: string) => void;
}

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function metricValueForLayer(
  site: EarthAnalogSite,
  sim: SiteSimilarityResult | undefined,
  layer: GlobeLayerMode
): number {
  if (!sim) return 50;
  if (layer === 'similarity') return sim.compositeScore;
  if (layer === 'confidence') return sim.confidencePct;
  if (layer === 'temperature') return sim.axes.temperature.rawScore ?? 45;
  if (layer === 'waterIce') return sim.axes.waterIce.rawScore ?? 45;
  return sim.axes.geology.rawScore ?? 45;
}

function colorForLayerMetric(val: number, layer: GlobeLayerMode, isCurated: boolean): string {
  if (layer === 'confidence') return val >= 78 ? '#34D399' : val >= 60 ? '#38BDF8' : '#FBBF24';
  if (layer === 'temperature') return val >= 70 ? '#38BDF8' : val >= 50 ? '#A78BFA' : '#FB923C';
  if (layer === 'waterIce') return val >= 72 ? '#22D3EE' : val >= 50 ? '#38BDF8' : '#F59E0B';
  if (layer === 'geology') return val >= 72 ? '#F97316' : val >= 55 ? '#FBBF24' : '#38BDF8';
  if (val >= 74) return '#F97316';
  return isCurated ? '#38BDF8' : '#A78BFA';
}

function createHeatmapGlobeTexture(
  sites: EarthAnalogSite[],
  scores: Record<string, SiteSimilarityResult>,
  layer: GlobeLayerMode
): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#071226';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 1;
  for (let lon = -150; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#132645';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1.2;
  const poly = (pts: Array<[number, number]>) => {
    ctx.beginPath();
    pts.forEach(([lon, lat], i) => {
      const px = ((lon + 180) / 360) * w;
      const py = ((90 - lat) / 180) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  poly([[-168, 66], [-140, 70], [-95, 76], [-62, 66], [-55, 48], [-78, 25], [-98, 18], [-118, 32], [-130, 54]]);
  poly([[-52, 60], [-20, 72], [-25, 82], [-65, 80]]);
  poly([[-80, 10], [-60, 10], [-35, -6], [-42, -23], [-68, -54], [-75, -45], [-78, -10]]);
  poly([[-10, 36], [0, 50], [18, 68], [60, 72], [135, 70], [175, 65], [140, 42], [118, 22], [95, 16], [76, 8], [52, 22], [35, 34], [14, 38]]);
  poly([[-17, 15], [-5, 35], [32, 31], [50, 11], [40, -12], [20, -34], [10, -5], [-8, 5]]);
  poly([[114, -22], [130, -12], [152, -26], [146, -38], [116, -34]]);
  poly([[-180, -72], [180, -72], [180, -89], [-180, -89]]);

  sites.forEach((site) => {
    const val = metricValueForLayer(site, scores[site.id], layer);
    const intensity = Math.max(0.22, Math.min(1, (val - 35) / 55));
    const px = ((site.lon + 180) / 360) * w;
    const py = ((90 - site.lat) / 180) * h;
    const radius = site.tier === 'discovered-candidate' ? 18 + intensity * 24 : 26 + intensity * 38;

    const grad = ctx.createRadialGradient(px, py, 2, px, py, radius);
    if (val >= 74) {
      grad.addColorStop(0, `rgba(249, 115, 22, ${0.78 * intensity})`);
      grad.addColorStop(0.45, `rgba(56, 189, 248, ${0.42 * intensity})`);
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    } else {
      grad.addColorStop(0, `rgba(56, 189, 248, ${0.65 * intensity})`);
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function EarthGlobeHeatmap({
  sites,
  scores,
  selectedSiteId,
  onSelectSite
}: EarthGlobeHeatmapProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const globeTexRef = useRef<THREE.CanvasTexture | null>(null);
  const globeMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const beaconMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const collidersRef = useRef<THREE.Mesh[]>([]);
  const flyTargetRef = useRef<THREE.Vector3 | null>(null);

  const [layer, setLayer] = useState<GlobeLayerMode>('similarity');
  const [zoomScale, setZoomScale] = useState<'focus' | 'overview'>('focus');

  const stateRef = useRef({ sites, scores, selectedSiteId, onSelectSite, layer });
  stateRef.current = { sites, scores, selectedSiteId, onSelectSite, layer };

  const computeFlyCameraPos = (siteId: string, mode: 'focus' | 'overview') => {
    const site = stateRef.current.sites.find((s) => s.id === siteId);
    if (!site) return new THREE.Vector3(0, 1.5, 6.4);
    if (mode === 'overview') return latLonToVec3(site.lat, site.lon, 6.4);
    const sim = stateRef.current.scores[siteId]?.compositeScore ?? 65;
    const dist = THREE.MathUtils.clamp(
      4.4 - (sim / 100) * 0.85 - (site.geology.craterOrigin ? 0.25 : 0),
      3.1,
      4.4
    );
    return latLonToVec3(site.lat, site.lon, dist);
  };

  // Sync beacons & heatmap texture whenever sites, scores, layer, or selection changes
  useEffect(() => {
    const group = globeGroupRef.current;
    if (!globeMatRef.current || !group) return;

    const oldTex = globeTexRef.current;
    const nextTex = createHeatmapGlobeTexture(sites, scores, layer);
    globeMatRef.current.map = nextTex;
    globeMatRef.current.needsUpdate = true;
    globeTexRef.current = nextTex;
    oldTex?.dispose();

    // Rebuild pins cleanly if site catalog expanded (e.g., global discovery scan results arrived)
    const currentKeys = new Set(sites.map((s) => s.id));
    let mismatch = currentKeys.size !== beaconMeshesRef.current.size;
    if (!mismatch) {
      for (const k of currentKeys) {
        if (!beaconMeshesRef.current.has(k)) {
          mismatch = true;
          break;
        }
      }
    }

    if (mismatch) {
      collidersRef.current.forEach((m) => {
        group.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      collidersRef.current = [];
      beaconMeshesRef.current.clear();

      sites.forEach((site) => {
        const isCurated = site.tier !== 'discovered-candidate';
        const geo = new THREE.SphereGeometry(isCurated ? 0.068 : 0.048, 12, 12);
        const val = metricValueForLayer(site, scores[site.id], layer);
        const col =
          site.id === selectedSiteId ? '#FFFFFF' : colorForLayerMetric(val, layer, isCurated);
        const mat = new THREE.MeshBasicMaterial({ color: col });
        const pin = new THREE.Mesh(geo, mat);
        pin.position.copy(latLonToVec3(site.lat, site.lon, 2.04));
        pin.layers.set(1);
        pin.userData.siteId = site.id;
        if (site.id === selectedSiteId) pin.scale.setScalar(1.75);
        group.add(pin);
        collidersRef.current.push(pin);
        beaconMeshesRef.current.set(site.id, pin);
      });
    } else {
      beaconMeshesRef.current.forEach((mesh, id) => {
        const site = sites.find((s) => s.id === id);
        const isSelected = id === selectedSiteId;
        const val = site ? metricValueForLayer(site, scores[id], layer) : 50;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(
          isSelected ? '#FFFFFF' : colorForLayerMetric(val, layer, site?.tier !== 'discovered-candidate')
        );
        mesh.scale.setScalar(isSelected ? 1.75 : 1.0);
      });
    }

    flyTargetRef.current = computeFlyCameraPos(selectedSiteId, zoomScale);
  }, [sites, scores, selectedSiteId, zoomScale, layer]);

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
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 1.5, 6.4);

    scene.add(new THREE.AmbientLight(0x94a3b8, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(5, 4, 6);
    scene.add(dir);

    const globeGroup = new THREE.Group();
    globeGroupRef.current = globeGroup;
    scene.add(globeGroup);

    const initialTex = createHeatmapGlobeTexture(
      stateRef.current.sites,
      stateRef.current.scores,
      stateRef.current.layer
    );
    globeTexRef.current = initialTex;

    const globeGeo = new THREE.SphereGeometry(2.0, 56, 42);
    const globeMat = new THREE.MeshStandardMaterial({
      map: initialTex,
      roughness: 0.72,
      metalness: 0.12
    });
    globeMatRef.current = globeMat;
    globeGroup.add(new THREE.Mesh(globeGeo, globeMat));

    const atmosGeo = new THREE.SphereGeometry(2.12, 40, 32);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float f = pow(1.0 - max(0.0, dot(normalize(vView), vNormal)), 3.2);
          gl_FragColor = vec4(0.22, 0.74, 0.97, f * 0.45);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide
    });
    globeGroup.add(new THREE.Mesh(atmosGeo, atmosMat));

    stateRef.current.sites.forEach((site) => {
      const isCurated = site.tier !== 'discovered-candidate';
      const geo = new THREE.SphereGeometry(isCurated ? 0.068 : 0.048, 12, 12);
      const val = metricValueForLayer(site, stateRef.current.scores[site.id], stateRef.current.layer);
      const mat = new THREE.MeshBasicMaterial({
        color:
          site.id === stateRef.current.selectedSiteId
            ? '#FFFFFF'
            : colorForLayerMetric(val, stateRef.current.layer, isCurated)
      });
      const pin = new THREE.Mesh(geo, mat);
      pin.position.copy(latLonToVec3(site.lat, site.lon, 2.04));
      pin.layers.set(1);
      pin.userData.siteId = site.id;
      if (site.id === stateRef.current.selectedSiteId) pin.scale.setScalar(1.65);
      globeGroup.add(pin);
      collidersRef.current.push(pin);
      beaconMeshesRef.current.set(site.id, pin);
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.minDistance = 2.8;
    controls.maxDistance = 8.2;
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.autoRotate = false;

    flyTargetRef.current = computeFlyCameraPos(stateRef.current.selectedSiteId, 'focus');

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const mouse = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const onDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
      flyTargetRef.current = null;
    };

    const onClick = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 7) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(collidersRef.current, false);
      if (hits.length > 0) {
        const sid = String(hits[0].object.userData.siteId);
        stateRef.current.onSelectSite(sid);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('click', onClick);

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

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) frameId = window.setTimeout(poll, 8);
        else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 90);
        }
      };
      frameId = window.setTimeout(poll, 8);
    }

    function tick() {
      if (disposed) return;
      if (flyTargetRef.current) {
        camera.position.lerp(flyTargetRef.current, 0.08);
        if (camera.position.distanceTo(flyTargetRef.current) < 0.04) {
          flyTargetRef.current = null;
        }
      }
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
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      globeGeo.dispose();
      globeMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      collidersRef.current.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      collidersRef.current = [];
      globeTexRef.current?.dispose();
      beaconMeshesRef.current.clear();
      globeGroupRef.current = null;
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const activeSite = useMemo(() => sites.find((s) => s.id === selectedSiteId), [sites, selectedSiteId]);
  const activeSim = scores[selectedSiteId];
  const discoveredCount = useMemo(
    () => sites.filter((s) => s.tier === 'discovered-candidate').length,
    [sites]
  );

  return (
    <div className="glass-surface rounded-3xl overflow-hidden flex flex-col">
      <div className="glass-header-bar px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[11px] tracking-widest uppercase text-sky-300">
            3D Earth Analog Globe · {sites.length} Nodes ({discoveredCount} Discovered)
          </div>
          <div className="text-xs text-slate-200">
            {activeSite
              ? `${activeSite.name} (${activeSite.lat.toFixed(1)}°, ${activeSite.lon.toFixed(1)}°${
                  activeSim ? ` · ${activeSim.compositeScore.toFixed(0)}% Suitability · ${activeSim.confidencePct}% Conf` : ''
                })`
              : 'Drag to spin · Click any glowing site node'}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setZoomScale('focus');
              flyTargetRef.current = computeFlyCameraPos(selectedSiteId, 'focus');
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer ${
              zoomScale === 'focus' ? 'glass-btn-active' : 'glass-btn'
            }`}
          >
            <ZoomIn className="w-3 h-3" />
            Site Zoom
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomScale('overview');
              flyTargetRef.current = computeFlyCameraPos(selectedSiteId, 'overview');
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer ${
              zoomScale === 'overview' ? 'glass-btn-active' : 'glass-btn'
            }`}
          >
            <ZoomOut className="w-3 h-3" />
            Globe
          </button>
          <button
            type="button"
            onClick={() => {
              flyTargetRef.current = computeFlyCameraPos(selectedSiteId, zoomScale);
            }}
            className="glass-btn p-1.5 rounded-full cursor-pointer"
            title="Re-center on active site"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Interactive Layer Switcher */}
      <div className="px-4 py-2 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'similarity', label: 'Suitability' },
              { id: 'temperature', label: 'Temperature' },
              { id: 'waterIce', label: 'Water/Ice' },
              { id: 'geology', label: 'Geology' },
              { id: 'confidence', label: 'Confidence' }
            ] as const
          ).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLayer(l.id)}
              className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] transition-colors cursor-pointer ${
                layer === l.id ? 'glass-btn-active' : 'text-slate-300 hover:text-white'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="font-mono text-[10px] text-slate-300 flex items-center gap-2.5">
          <span>
            <span className="text-sky-300">●</span> Curated
          </span>
          <span>
            <span className="text-violet-300">●</span> Discovered
          </span>
          <span>
            <span className="text-orange-400">●</span> High Match
          </span>
        </div>
      </div>

      <div ref={mountRef} className="w-full h-[270px] sm:h-[310px] cursor-grab active:cursor-grabbing" />

      {activeSite && activeSim && (
        <div className="glass-footer-bar px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-200 truncate max-w-[65%]">
            <strong className="text-white">{activeSite.country}:</strong>{' '}
            {activeSim.axes.geology.similarities[0] ?? activeSite.discoveryRationale}
          </span>
          <span className="font-mono text-sky-300 tabular-nums shrink-0">
            {activeSite.tier === 'discovered-candidate' ? 'DISCOVERED' : 'CURATED'} · {activeSim.compositeScore.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
