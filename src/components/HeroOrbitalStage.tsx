import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createAtmosphereMaterial, createSolarTexturePack } from '../lib/solarTextures';

interface HeroOrbitalStageProps {
  reducedMotion: boolean;
}

function createArcBeamMaterial(colorA: string, colorB: string, speed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uSpeed: { value: speed }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uSpeed;
      varying vec2 vUv;
      void main() {
        vec3 baseColor = mix(uColorA, uColorB, vUv.x);
        float head = fract(uTime * uSpeed);
        float dist = abs(vUv.x - head);
        dist = min(dist, 1.0 - dist);
        float pulse = smoothstep(0.18, 0.0, dist);
        float edgeFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        float alpha = (0.28 + pulse * 0.92) * edgeFade;
        gl_FragColor = vec4(baseColor * (0.9 + pulse * 1.4), alpha);
      }
    `
  });
}

export function HeroOrbitalStage({ reducedMotion }: HeroOrbitalStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      40,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      80
    );
    camera.position.set(0.4, 0.55, 8.6);
    camera.lookAt(0.3, 0.05, 0);

    const disposables: Array<{ dispose: () => void }> = [envTarget, envTarget.texture];

    // Directional solar key light + cool cyan rim backlight
    const sunWorld = new THREE.Vector3(-12, 6, 9);
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 3.1);
    sunLight.position.copy(sunWorld);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.35);
    rimLight.position.set(8, -3, -6);
    scene.add(rimLight);

    const ambient = new THREE.HemisphereLight(0x38bdf8, 0x050814, 0.36);
    scene.add(ambient);

    const worldGroup = new THREE.Group();
    worldGroup.position.set(0.45, -0.05, 0);
    scene.add(worldGroup);

    // 1. Large 3D Earth Focal Sphere
    const earthGroup = new THREE.Group();
    earthGroup.position.set(0, -0.15, 0.2);
    worldGroup.add(earthGroup);

    const earthPack = createSolarTexturePack('earth', maxAniso);
    disposables.push(earthPack.map);
    if (earthPack.bumpMap) disposables.push(earthPack.bumpMap);
    if (earthPack.roughnessMap) disposables.push(earthPack.roughnessMap);
    if (earthPack.cloudsMap) disposables.push(earthPack.cloudsMap);
    if (earthPack.nightMap) disposables.push(earthPack.nightMap);

    const earthGeo = new THREE.SphereGeometry(1.75, 56, 42);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthPack.map,
      bumpMap: earthPack.bumpMap,
      bumpScale: 0.03,
      roughnessMap: earthPack.roughnessMap,
      roughness: 0.82,
      metalness: 0.06,
      envMapIntensity: 0.45
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.z = THREE.MathUtils.degToRad(23.4);
    earthMesh.rotation.y = -1.25;
    earthGroup.add(earthMesh);
    disposables.push(earthGeo, earthMat);

    let earthClouds: THREE.Mesh | null = null;
    if (earthPack.cloudsMap) {
      const cGeo = new THREE.SphereGeometry(1.782, 48, 36);
      const cMat = new THREE.MeshStandardMaterial({
        map: earthPack.cloudsMap,
        transparent: true,
        opacity: 0.82,
        roughness: 0.92,
        depthWrite: false
      });
      earthClouds = new THREE.Mesh(cGeo, cMat);
      earthClouds.rotation.z = THREE.MathUtils.degToRad(23.4);
      earthGroup.add(earthClouds);
      disposables.push(cGeo, cMat);
    }

    const earthAtmoGeo = new THREE.SphereGeometry(1.89, 44, 32);
    const earthAtmoMat = createAtmosphereMaterial('#38BDF8', sunWorld, 1.32);
    const earthAtmo = new THREE.Mesh(earthAtmoGeo, earthAtmoMat);
    earthGroup.add(earthAtmo);
    disposables.push(earthAtmoGeo, earthAtmoMat);

    // 2. Futuristic Tilted Orbital Telemetry Rings
    const ringConfigs = [
      { radius: 2.38, tube: 0.008, color: 0x38bdf8, opacity: 0.48, rot: [1.18, 0.25, 0.15] },
      { radius: 2.95, tube: 0.006, color: 0x60a5fa, opacity: 0.28, rot: [1.45, -0.35, 0.42] },
      { radius: 3.45, tube: 0.005, color: 0xf97316, opacity: 0.22, rot: [0.95, 0.48, -0.25] }
    ] as const;

    const orbitalRings: THREE.Mesh[] = [];
    for (const cfg of ringConfigs) {
      const rGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, 128);
      const rMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      earthGroup.add(ring);
      orbitalRings.push(ring);
      disposables.push(rGeo, rMat);
    }

    // 3. Floating Mars Sphere
    const marsGroup = new THREE.Group();
    const marsBasePos = new THREE.Vector3(2.85, 1.32, -1.65);
    marsGroup.position.copy(marsBasePos);
    worldGroup.add(marsGroup);

    const marsPack = createSolarTexturePack('mars', maxAniso);
    disposables.push(marsPack.map);
    if (marsPack.bumpMap) disposables.push(marsPack.bumpMap);

    const marsGeo = new THREE.SphereGeometry(0.68, 44, 32);
    const marsMat = new THREE.MeshStandardMaterial({
      map: marsPack.map,
      bumpMap: marsPack.bumpMap,
      bumpScale: 0.035,
      roughness: 0.88,
      metalness: 0.04,
      envMapIntensity: 0.18
    });
    const marsMesh = new THREE.Mesh(marsGeo, marsMat);
    marsGroup.add(marsMesh);
    disposables.push(marsGeo, marsMat);

    const marsAtmoGeo = new THREE.SphereGeometry(0.74, 32, 24);
    const marsAtmoMat = createAtmosphereMaterial('#FB923C', sunWorld, 0.78);
    marsGroup.add(new THREE.Mesh(marsAtmoGeo, marsAtmoMat));
    disposables.push(marsAtmoGeo, marsAtmoMat);

    // 4. Floating Moon Sphere
    const moonGroup = new THREE.Group();
    const moonBasePos = new THREE.Vector3(-2.35, 1.48, -0.85);
    moonGroup.position.copy(moonBasePos);
    worldGroup.add(moonGroup);

    const moonPack = createSolarTexturePack('moon', maxAniso);
    disposables.push(moonPack.map);
    if (moonPack.bumpMap) disposables.push(moonPack.bumpMap);

    const moonGeo = new THREE.SphereGeometry(0.44, 36, 28);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonPack.map,
      bumpMap: moonPack.bumpMap,
      bumpScale: 0.028,
      roughness: 0.94,
      metalness: 0.02,
      envMapIntensity: 0.15
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);
    disposables.push(moonGeo, moonMat);

    // 5. Glowing Planetary Connection Arcs (Earth <-> Mars, Earth <-> Moon)
    const earthMarsCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.5, 0.45, 0.6),
      new THREE.Vector3(1.6, 1.85, 0.25),
      marsBasePos
    );
    const earthMarsTubeGeo = new THREE.TubeGeometry(earthMarsCurve, 72, 0.022, 8, false);
    const earthMarsBeamMat = createArcBeamMaterial('#38BDF8', '#F97316', 0.34);
    const earthMarsBeam = new THREE.Mesh(earthMarsTubeGeo, earthMarsBeamMat);
    worldGroup.add(earthMarsBeam);
    disposables.push(earthMarsTubeGeo, earthMarsBeamMat);

    const earthMoonCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.65, 0.52, 0.55),
      new THREE.Vector3(-1.45, 1.65, 0.35),
      moonBasePos
    );
    const earthMoonTubeGeo = new THREE.TubeGeometry(earthMoonCurve, 64, 0.018, 8, false);
    const earthMoonBeamMat = createArcBeamMaterial('#7DD3FC', '#E2E8F0', 0.46);
    const earthMoonBeam = new THREE.Mesh(earthMoonTubeGeo, earthMoonBeamMat);
    worldGroup.add(earthMoonBeam);
    disposables.push(earthMoonTubeGeo, earthMoonBeamMat);

    // 6. Floating Cosmic Particles around the Orbital Triad
    const particleCount = 260;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 2.6 + Math.random() * 4.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.cos(phi) * 0.65;
      pPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.036,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const particles = new THREE.Points(pGeo, pMat);
    worldGroup.add(particles);
    disposables.push(pGeo, pMat);

    // Mouse Parallax Tracking
    const pointerTarget = { x: 0, y: 0 };
    const pointerSmooth = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      pointerTarget.x = THREE.MathUtils.clamp(nx, -1, 1);
      pointerTarget.y = THREE.MathUtils.clamp(ny, -1, 1);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

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

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let disposed = false;
    let frameId = 0;
    const clock = new THREE.Clock();

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
          frameId = window.setTimeout(cb, 85);
        }
      };
      frameId = window.setTimeout(poll, 8);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const rm = reducedRef.current;

      if (!rm) {
        earthMesh.rotation.y += dt * 0.14;
        if (earthClouds) earthClouds.rotation.y += dt * 0.19;
        marsMesh.rotation.y += dt * 0.18;
        moonMesh.rotation.y += dt * 0.09;

        orbitalRings[0].rotation.z += dt * 0.12;
        orbitalRings[1].rotation.z -= dt * 0.08;
        orbitalRings[2].rotation.y += dt * 0.06;

        marsGroup.position.y = marsBasePos.y + Math.sin(elapsed * 0.85) * 0.1;
        moonGroup.position.y = moonBasePos.y + Math.cos(elapsed * 1.05) * 0.09;

        earthMarsBeamMat.uniforms.uTime.value = elapsed;
        earthMoonBeamMat.uniforms.uTime.value = elapsed;
        particles.rotation.y += dt * 0.025;

        pointerSmooth.x = THREE.MathUtils.damp(pointerSmooth.x, pointerTarget.x, 4.2, dt);
        pointerSmooth.y = THREE.MathUtils.damp(pointerSmooth.y, pointerTarget.y, 4.2, dt);
        worldGroup.rotation.y = pointerSmooth.x * 0.16;
        worldGroup.rotation.x = pointerSmooth.y * 0.09;
      }

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
      window.removeEventListener('pointermove', onPointerMove);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full pointer-events-none" aria-hidden="true" />;
}
