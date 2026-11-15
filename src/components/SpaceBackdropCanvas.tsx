import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { TargetBody } from '../types/analog';
import {
  SOLAR_PLANETS,
  auToDisplayCoords,
  buildKeplerOrbitDisplayPoints,
  dateToJulianDate,
  solveKeplerHeliocentricAu,
  type SolarEphemerisReport
} from '../lib/solarSystemData';
import {
  createAtmosphereMaterial,
  createMilkyWaySkyTexture,
  createSaturnRingMaterial,
  createSaturnRingTexture,
  createSolarTexturePack,
  createSunShaderMaterial
} from '../lib/solarTextures';

export type SolarFocusMode = 'overview' | 'earth' | 'moon' | 'mars';

interface SpaceBackdropCanvasProps {
  targetBody: TargetBody;
  solarFocus: SolarFocusMode;
  ephemeris: SolarEphemerisReport | null;
  simDaysPerSec: number;
  targetSlopeDeg: number;
  earthElevationM: number;
  similarityPct: number;
  reducedMotion: boolean;
}

function createRadialGlowTexture(innerRgba: string, midRgba: string, edgeRgba = 'rgba(0,0,0,0)'): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.28, midRgba);
  grad.addColorStop(1, edgeRgba);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRadialRingGeometry(innerR: number, outerR: number, segments = 96): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(innerR, outerR, segments);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const r = v3.length();
    const u = (r - innerR) / Math.max(1e-4, outerR - innerR);
    uv.setXY(i, u, 0.5);
  }
  return geo;
}

export function SpaceBackdropCanvas({
  targetBody,
  solarFocus,
  ephemeris,
  simDaysPerSec,
  targetSlopeDeg,
  earthElevationM,
  similarityPct,
  reducedMotion
}: SpaceBackdropCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    targetBody,
    solarFocus,
    ephemeris,
    simDaysPerSec,
    targetSlopeDeg,
    earthElevationM,
    similarityPct,
    reducedMotion
  });
  stateRef.current = {
    targetBody,
    solarFocus,
    ephemeris,
    simDaysPerSec,
    targetSlopeDeg,
    earthElevationM,
    similarityPct,
    reducedMotion
  };

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
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#02040b');

    // Subtle studio PMREM environment for ocean specular sheen & dielectric grazing highlights
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 320);
    const currentCamPos = new THREE.Vector3(0, 12.2, 31.2);
    const currentLookAt = new THREE.Vector3(0.4, -0.3, -2.5);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    const disposables: Array<{ dispose: () => void }> = [envTarget, envTarget.texture];

    // 1. Milky Way Deep-Space Galactic Band Sphere
    const skyGeo = new THREE.SphereGeometry(180, 40, 24);
    const skyTex = createMilkyWaySkyTexture(maxAniso);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.rotation.set(0.45, 0.2, 0.52);
    scene.add(skyDome);
    disposables.push(skyGeo, skyTex, skyMat);

    // 2. Spectral O/B/A/F/G/K/M Starfield
    const starCount = 1900;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starPhase = new Float32Array(starCount);
    const starSize = new Float32Array(starCount);
    const starColor = new Float32Array(starCount * 3);

    const spectralPalette = [
      new THREE.Color('#E0F2FE'), // O/B blue-white
      new THREE.Color('#FFFFFF'), // A white
      new THREE.Color('#FEF9C3'), // F/G yellow-white
      new THREE.Color('#FED7AA'), // K warm orange
      new THREE.Color('#CBD5E1') // Faint star
    ];

    for (let i = 0; i < starCount; i++) {
      const r = 68 + Math.random() * 96;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) * 0.85;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      starPhase[i] = Math.random() * Math.PI * 2;
      starSize[i] = 1.4 + Math.random() * 2.5;
      const col = spectralPalette[i % spectralPalette.length];
      starColor[i * 3] = col.r;
      starColor[i * 3 + 1] = col.g;
      starColor[i * 3 + 2] = col.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColor, 3));

    const starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aPhase;
        attribute float aSize;
        attribute vec3 aColor;
        varying float vTwinkle;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vTwinkle = 0.62 + 0.38 * sin(uTime * 1.8 + aPhase);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (88.0 / max(18.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vTwinkle;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.04, d) * vTwinkle;
          gl_FragColor = vec4(vColor, alpha);
        }
      `
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    disposables.push(starGeo, starMat);

    // 3. Real Keplerian Solar System Group
    const solarGroup = new THREE.Group();
    solarGroup.position.set(0.4, -0.2, -3.5);
    solarGroup.rotation.set(0.28, 0.08, -0.06);
    scene.add(solarGroup);

    const sunWorldOrigin = new THREE.Vector3();
    solarGroup.getWorldPosition(sunWorldOrigin);

    // Realistic Animated Solar Photosphere + Limb-Darkened Chromosphere + Layered Corona
    const sunGeo = new THREE.SphereGeometry(2.35, 48, 36);
    const sunMat = createSunShaderMaterial();
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    solarGroup.add(sunMesh);

    const innerCoronaTex = createRadialGlowTexture('rgba(255, 251, 224, 0.95)', 'rgba(251, 146, 60, 0.48)');
    const outerCoronaTex = createRadialGlowTexture('rgba(253, 224, 71, 0.36)', 'rgba(234, 88, 12, 0.14)');
    const innerCorona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: innerCoronaTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    innerCorona.scale.set(9.2, 9.2, 1);
    solarGroup.add(innerCorona);

    const outerCorona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: outerCoronaTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    outerCorona.scale.set(18.5, 18.5, 1);
    solarGroup.add(outerCorona);

    // Realistic Sun PointLight (low decay so Neptune still receives crisp directional terminator lighting)
    const solarLight = new THREE.PointLight(0xfffaf0, 7.2, 220, 0.28);
    solarLight.position.set(0, 0, 0);
    solarGroup.add(solarLight);

    // Subtle deep-space starlight bounce fill (keeps dark hemispheres dark yet faintly legible)
    const spaceFill = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.22);
    scene.add(spaceFill);

    disposables.push(sunGeo, sunMat, innerCoronaTex, outerCoronaTex, innerCorona.material, outerCorona.material);

    // 4. 3D Instanced Rocky Main Asteroid Belt (2.2 - 3.2 AU)
    const asteroidCount = 420;
    const baseRockGeo = new THREE.DodecahedronGeometry(0.062, 0);
    // Slightly irregular faceted rock vertices
    const rockPos = baseRockGeo.attributes.position;
    for (let i = 0; i < rockPos.count; i++) {
      const vx = rockPos.getX(i);
      const vy = rockPos.getY(i);
      const vz = rockPos.getZ(i);
      const jitter = 0.8 + 0.35 * Math.sin(vx * 41 + vy * 29 + vz * 17);
      rockPos.setXYZ(i, vx * jitter, vy * jitter * 0.85, vz * jitter);
    }
    baseRockGeo.computeVertexNormals();

    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.92,
      metalness: 0.14,
      envMapIntensity: 0.2
    });
    const asteroidMesh = new THREE.InstancedMesh(baseRockGeo, asteroidMat, asteroidCount);
    const dummy = new THREE.Object3D();
    const rockColor = new THREE.Color();

    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const rAu = 2.18 + Math.random() * 1.06;
      const zAu = (Math.random() - 0.5) * 0.28;
      const p = auToDisplayCoords(Math.cos(angle) * rAu, Math.sin(angle) * rAu, zAu);

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = 0.65 + Math.random() * 1.15;
      dummy.scale.set(s * (0.8 + Math.random() * 0.4), s * (0.7 + Math.random() * 0.4), s);
      dummy.updateMatrix();
      asteroidMesh.setMatrixAt(i, dummy.matrix);

      const shade = 0.55 + Math.random() * 0.45;
      rockColor.setRGB(shade, shade * 0.96, shade * 0.9);
      asteroidMesh.setColorAt(i, rockColor);
    }
    asteroidMesh.instanceMatrix.needsUpdate = true;
    if (asteroidMesh.instanceColor) asteroidMesh.instanceColor.needsUpdate = true;
    asteroidMesh.computeBoundingSphere();
    solarGroup.add(asteroidMesh);
    disposables.push(baseRockGeo, asteroidMat);

    // 5. Realistic Planets + Bump/Roughness Maps + Atmospheres + Shadowed Saturn Rings + Moons
    interface MoonRuntime {
      pivot: THREE.Group;
      mesh: THREE.Mesh;
      periodDays: number;
    }

    interface PlanetRuntime {
      el: (typeof SOLAR_PLANETS)[number];
      container: THREE.Group;
      tiltGroup: THREE.Group;
      mesh: THREE.Mesh;
      cloudMesh?: THREE.Mesh;
      atmoMat?: THREE.ShaderMaterial;
      saturnRingMat?: THREE.ShaderMaterial;
      earthSunUniform?: { value: THREE.Vector3 };
      moons: MoonRuntime[];
    }

    const planetRuntimes: PlanetRuntime[] = [];
    let earthMeshRef: THREE.Mesh | null = null;
    let moonMeshRef: THREE.Mesh | null = null;
    let marsMeshRef: THREE.Mesh | null = null;

    for (const el of SOLAR_PLANETS) {
      // Elliptical Keplerian orbital track
      const orbitPts = buildKeplerOrbitDisplayPoints(el, 224).map((p) => new THREE.Vector3(p.x, p.y, p.z));
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
      const isFocusPlanet = el.id === 'earth' || el.id === 'mars';
      const orbitMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(el.orbitColorHex),
        transparent: true,
        opacity: isFocusPlanet ? 0.54 : 0.22
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      solarGroup.add(orbitLine);
      disposables.push(orbitGeo, orbitMat);

      const containerGroup = new THREE.Group();
      solarGroup.add(containerGroup);

      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = THREE.MathUtils.degToRad(el.axialTiltDeg);
      containerGroup.add(tiltGroup);

      const texPack = createSolarTexturePack(el.id, maxAniso);
      disposables.push(texPack.map);
      if (texPack.bumpMap) disposables.push(texPack.bumpMap);
      if (texPack.roughnessMap) disposables.push(texPack.roughnessMap);
      if (texPack.nightMap) disposables.push(texPack.nightMap);
      if (texPack.cloudsMap) disposables.push(texPack.cloudsMap);

      const pGeo = new THREE.SphereGeometry(el.displayScale, 48, 36);
      let earthSunUniform: { value: THREE.Vector3 } | undefined;

      const pMat = new THREE.MeshStandardMaterial({
        map: texPack.map,
        bumpMap: texPack.bumpMap,
        bumpScale: el.id === 'mars' || el.id === 'mercury' ? 0.032 : 0.018,
        roughnessMap: texPack.roughnessMap,
        roughness: el.id === 'earth' ? 0.85 : el.id === 'mercury' || el.id === 'mars' ? 0.88 : 0.65,
        metalness: 0.04,
        envMapIntensity: el.id === 'earth' ? 0.35 : 0.14
      });

      // Inject solar-terminator Earth city nightlights onto Earth's dark hemisphere
      if (el.id === 'earth' && texPack.nightMap) {
        const uSunWorld = { value: sunWorldOrigin.clone() };
        const uNightMap = { value: texPack.nightMap };
        earthSunUniform = uSunWorld;

        pMat.onBeforeCompile = (shader) => {
          shader.uniforms.uSunWorld = uSunWorld;
          shader.uniforms.uNightMap = uNightMap;

          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              `#include <common>
               varying vec3 vPlanetWorldPos;
               varying vec3 vPlanetWorldNorm;`
            )
            .replace(
              '#include <worldpos_vertex>',
              `#include <worldpos_vertex>
               vec4 wpCustom = modelMatrix * vec4(transformed, 1.0);
               vPlanetWorldPos = wpCustom.xyz;
               vPlanetWorldNorm = normalize(mat3(modelMatrix) * objectNormal);`
            );

          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <common>',
              `#include <common>
               uniform vec3 uSunWorld;
               uniform sampler2D uNightMap;
               varying vec3 vPlanetWorldPos;
               varying vec3 vPlanetWorldNorm;`
            )
            .replace(
              '#include <emissivemap_fragment>',
              `#include <emissivemap_fragment>
               vec3 sunDirNight = normalize(uSunWorld - vPlanetWorldPos);
               float nightMask = smoothstep(0.08, -0.25, dot(normalize(vPlanetWorldNorm), sunDirNight));
               vec3 cityGlow = texture2D(uNightMap, vMapUv).rgb * nightMask * 1.45;
               totalEmissiveRadiance += cityGlow;`
            );
        };
      }

      const mesh = new THREE.Mesh(pGeo, pMat);
      tiltGroup.add(mesh);
      disposables.push(pGeo, pMat);

      if (el.id === 'earth') earthMeshRef = mesh;
      if (el.id === 'mars') marsMeshRef = mesh;

      let cloudMesh: THREE.Mesh | undefined;
      if (el.id === 'earth' && texPack.cloudsMap) {
        const cGeo = new THREE.SphereGeometry(el.displayScale * 1.018, 40, 28);
        const cMat = new THREE.MeshStandardMaterial({
          map: texPack.cloudsMap,
          transparent: true,
          opacity: 0.82,
          roughness: 0.9,
          depthWrite: false,
          envMapIntensity: 0.15
        });
        cloudMesh = new THREE.Mesh(cGeo, cMat);
        tiltGroup.add(cloudMesh);
        disposables.push(cGeo, cMat);
      }

      // Rayleigh atmospheric Fresnel shell (Earth, Mars, Venus)
      let atmoMat: THREE.ShaderMaterial | undefined;
      if (el.id === 'earth' || el.id === 'mars' || el.id === 'venus') {
        const atmoColor = el.id === 'earth' ? '#38BDF8' : el.id === 'mars' ? '#FB923C' : '#FDE68A';
        const atmoIntensity = el.id === 'earth' ? 1.15 : el.id === 'mars' ? 0.65 : 0.8;
        const aGeo = new THREE.SphereGeometry(el.displayScale * 1.075, 36, 26);
        atmoMat = createAtmosphereMaterial(atmoColor, sunWorldOrigin, atmoIntensity);
        const aMesh = new THREE.Mesh(aGeo, atmoMat);
        containerGroup.add(aMesh);
        disposables.push(aGeo, atmoMat);
      }

      // Shadowed Saturn Rings (C, B, Cassini Division, A, Encke Gap, F Ring)
      let saturnRingMat: THREE.ShaderMaterial | undefined;
      if (el.id === 'saturn') {
        const rGeo = createRadialRingGeometry(el.displayScale * 1.32, el.displayScale * 2.52, 96);
        const rTex = createSaturnRingTexture(maxAniso);
        saturnRingMat = createSaturnRingMaterial(rTex, el.displayScale, sunWorldOrigin);
        const ring = new THREE.Mesh(rGeo, saturnRingMat);
        ring.rotation.x = Math.PI / 2;
        tiltGroup.add(ring);
        disposables.push(rGeo, rTex, saturnRingMat);
      }

      if (el.id === 'uranus') {
        const rGeo = createRadialRingGeometry(el.displayScale * 1.44, el.displayScale * 1.76, 64);
        const rMat = new THREE.MeshBasicMaterial({
          color: 0xa5f3fc,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.36
        });
        const ring = new THREE.Mesh(rGeo, rMat);
        ring.rotation.x = Math.PI / 2;
        tiltGroup.add(ring);
        disposables.push(rGeo, rMat);
      }

      // Authentic planetary moons
      const moons: MoonRuntime[] = [];
      const addMoon = (
        radius: number,
        orbitDist: number,
        periodDays: number,
        incDeg: number,
        colorHex: string,
        isEarthsMoon = false
      ) => {
        const pivot = new THREE.Group();
        pivot.rotation.x = THREE.MathUtils.degToRad(incDeg);
        containerGroup.add(pivot);

        const mOrbitGeo = new THREE.TorusGeometry(orbitDist, 0.008, 6, 64);
        const mOrbitMat = new THREE.MeshBasicMaterial({
          color: 0xe2e8f0,
          transparent: true,
          opacity: isEarthsMoon ? 0.32 : 0.14
        });
        const mOrbit = new THREE.Mesh(mOrbitGeo, mOrbitMat);
        mOrbit.rotation.x = Math.PI / 2;
        pivot.add(mOrbit);
        disposables.push(mOrbitGeo, mOrbitMat);

        const mGeo = new THREE.SphereGeometry(radius, isEarthsMoon ? 32 : 18, isEarthsMoon ? 24 : 14);
        let mMat: THREE.MeshStandardMaterial;
        if (isEarthsMoon) {
          const moonTex = createSolarTexturePack('moon', maxAniso);
          disposables.push(moonTex.map);
          if (moonTex.bumpMap) disposables.push(moonTex.bumpMap);
          mMat = new THREE.MeshStandardMaterial({
            map: moonTex.map,
            bumpMap: moonTex.bumpMap,
            bumpScale: 0.025,
            roughness: 0.94,
            metalness: 0.02,
            envMapIntensity: 0.12
          });
        } else {
          mMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(colorHex),
            roughness: 0.85,
            metalness: 0.04,
            envMapIntensity: 0.15
          });
        }

        const mMesh = new THREE.Mesh(mGeo, mMat);
        mMesh.position.set(orbitDist, 0, 0);
        pivot.add(mMesh);
        disposables.push(mGeo, mMat);

        if (isEarthsMoon) moonMeshRef = mMesh;
        moons.push({ pivot, mesh: mMesh, periodDays });
      };

      if (el.id === 'earth') {
        addMoon(0.165, 1.18, 27.32166, 5.145, '#E2E8F0', true);
      } else if (el.id === 'mars') {
        addMoon(0.052, 0.62, 0.3189, 1.09, '#9CA3AF');
        addMoon(0.04, 0.88, 1.263, 0.93, '#A8A29E');
      } else if (el.id === 'jupiter') {
        addMoon(0.095, 1.55, 1.769, 0.05, '#FACC15'); // Io
        addMoon(0.082, 1.88, 3.551, 0.47, '#E0F2FE'); // Europa
        addMoon(0.125, 2.25, 7.155, 0.2, '#94A3B8'); // Ganymede
        addMoon(0.11, 2.65, 16.689, 0.19, '#64748B'); // Callisto
      } else if (el.id === 'saturn') {
        addMoon(0.135, 2.82, 15.945, 0.35, '#F59E0B'); // Titan
      } else if (el.id === 'neptune') {
        addMoon(0.09, 1.06, -5.877, 156.8, '#BAE6FD'); // Triton
      }

      planetRuntimes.push({
        el,
        container: containerGroup,
        tiltGroup,
        mesh,
        cloudMesh,
        atmoMat,
        saturnRingMat,
        earthSunUniform,
        moons
      });
    }

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Track page scroll progress (0 = top -> 1 = bottom) for smooth Solar System zoom
    let targetScrollProgress = 0;
    let smoothScrollProgress = 0;
    const onScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetScrollProgress = THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let disposed = false;
    let frameId = 0;
    const clock = new THREE.Clock();
    let simJd = stateRef.current.ephemeris?.julianDate ?? dateToJulianDate(Date.now());

    // Pre-allocated math helpers (zero per-frame allocations)
    const overviewLookAt = new THREE.Vector3(0.4, -0.3, -2.5);
    const focusWorld = new THREE.Vector3();
    const radialOut = new THREE.Vector3();
    const desiredCamPos = new THREE.Vector3();
    const desiredLookAt = new THREE.Vector3();
    const saturnWorld = new THREE.Vector3();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) frameId = window.setTimeout(poll, 8);
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
      const {
        solarFocus: focusMode,
        ephemeris: liveEphem,
        simDaysPerSec: rateDaysPerSec,
        targetSlopeDeg: slope,
        earthElevationM: elev,
        similarityPct: simPct,
        reducedMotion: rm
      } = stateRef.current;

      const effectiveRate =
        rm || rateDaysPerSec === 0
          ? 0
          : focusMode === 'moon'
            ? Math.min(rateDaysPerSec, 0.35)
            : focusMode === 'earth' || focusMode === 'mars'
              ? Math.min(rateDaysPerSec, 2.0)
              : rateDaysPerSec;

      if (effectiveRate === 0) {
        simJd = dateToJulianDate(Date.now());
      } else {
        simJd += dt * effectiveRate;
      }

      if (!rm) {
        sunMat.uniforms.uTime.value = elapsed;
        starMat.uniforms.uTime.value = elapsed;
        stars.rotation.y += dt * 0.002;
        skyDome.rotation.y += dt * 0.0008;
        sunMesh.rotation.y += dt * 0.05;
        asteroidMesh.rotation.y += dt * (0.012 + Math.min(0.1, effectiveRate * 0.003));

        const coronaBreath = 9.0 + Math.sin(elapsed * 1.3) * 0.4;
        innerCorona.scale.set(coronaBreath, coronaBreath, 1);
      }

      solarGroup.getWorldPosition(sunWorldOrigin);

      for (const p of planetRuntimes) {
        const liveVec = liveEphem?.planets?.[p.el.id];
        if (rateDaysPerSec === 0 && liveVec && liveVec.status === 'live') {
          const disp = auToDisplayCoords(liveVec.xAu, liveVec.yAu, liveVec.zAu);
          p.container.position.set(disp.x, disp.y, disp.z);
        } else {
          const k = solveKeplerHeliocentricAu(p.el, simJd);
          const disp = auToDisplayCoords(k.xAu, k.yAu, k.zAu);
          p.container.position.set(disp.x, disp.y, disp.z);
        }

        if (!rm) {
          const spinSign = p.el.rotationHours < 0 ? -1 : 1;
          const spinMag = Math.min(1.6, 24 / Math.abs(p.el.rotationHours));
          p.mesh.rotation.y += dt * spinSign * (0.24 + spinMag * 0.5);
          if (p.cloudMesh) {
            p.cloudMesh.rotation.y += dt * 0.88;
          }
        }

        if (p.atmoMat) {
          p.atmoMat.uniforms.uSunWorld.value.copy(sunWorldOrigin);
        }
        if (p.earthSunUniform) {
          p.earthSunUniform.value.copy(sunWorldOrigin);
        }

        for (const m of p.moons) {
          if (p.el.id === 'earth' && rateDaysPerSec === 0 && liveEphem?.moonGeocentric?.status === 'live') {
            const { xKm, yKm } = liveEphem.moonGeocentric;
            m.pivot.rotation.y = Math.atan2(-yKm, xKm);
          } else {
            const daysSinceJ2000 = simJd - 2451545.0;
            m.pivot.rotation.y = ((daysSinceJ2000 / m.periodDays) * Math.PI * 2) % (Math.PI * 2);
          }
        }
      }

      solarGroup.updateMatrixWorld(true);

      // Update Saturn ring shadow shader with Saturn's exact world position
      const saturnRuntime = planetRuntimes.find((p) => p.el.id === 'saturn');
      if (saturnRuntime?.saturnRingMat) {
        saturnRuntime.mesh.getWorldPosition(saturnWorld);
        saturnRuntime.saturnRingMat.uniforms.uPlanetWorld.value.copy(saturnWorld);
        saturnRuntime.saturnRingMat.uniforms.uSunWorld.value.copy(sunWorldOrigin);
      }

      // Smooth scroll progress for cinematic Solar System zoom
      smoothScrollProgress = rm
        ? targetScrollProgress
        : THREE.MathUtils.damp(smoothScrollProgress, targetScrollProgress, 5.2, dt);

      const scrollZoomMultiplier = 1.0 - smoothScrollProgress * 0.42;
      const scrollOrbitAngle = smoothScrollProgress * 1.05;
      const cosOrbit = Math.cos(scrollOrbitAngle);
      const sinOrbit = Math.sin(scrollOrbitAngle);

      // Smooth exponentially damped camera focus + scroll zoom onto Solar System, Earth, Moon, or Mars
      if (focusMode === 'earth' && earthMeshRef) {
        earthMeshRef.getWorldPosition(focusWorld);
        const baseDist = THREE.MathUtils.clamp(3.0 - (elev / 4000) * 0.45 - (simPct / 100) * 0.35, 1.95, 3.1);
        const dist = baseDist * scrollZoomMultiplier;
        radialOut.copy(focusWorld).sub(sunWorldOrigin).normalize();
        const offX = radialOut.x * cosOrbit - radialOut.z * sinOrbit;
        const offZ = radialOut.x * sinOrbit + radialOut.z * cosOrbit;
        desiredCamPos.set(
          focusWorld.x + offX * dist * 0.85,
          focusWorld.y + dist * (0.48 - smoothScrollProgress * 0.16),
          focusWorld.z + offZ * dist * 0.85 + dist * 0.32
        );
        desiredLookAt.copy(focusWorld);
      } else if (focusMode === 'moon' && moonMeshRef) {
        moonMeshRef.getWorldPosition(focusWorld);
        const baseDist = THREE.MathUtils.clamp(1.55 - (slope / 15) * 0.3, 0.98, 1.65);
        const dist = baseDist * scrollZoomMultiplier;
        desiredCamPos.set(
          focusWorld.x + dist * (0.72 * cosOrbit - 1.08 * sinOrbit),
          focusWorld.y + dist * (0.42 - smoothScrollProgress * 0.14),
          focusWorld.z + dist * (0.72 * sinOrbit + 1.08 * cosOrbit)
        );
        desiredLookAt.copy(focusWorld);
      } else if (focusMode === 'mars' && marsMeshRef) {
        marsMeshRef.getWorldPosition(focusWorld);
        const baseDist = THREE.MathUtils.clamp(2.45 - (slope / 15) * 0.32 - (simPct / 100) * 0.32, 1.55, 2.6);
        const dist = baseDist * scrollZoomMultiplier;
        radialOut.copy(focusWorld).sub(sunWorldOrigin).normalize();
        const offX = radialOut.x * cosOrbit - radialOut.z * sinOrbit;
        const offZ = radialOut.x * sinOrbit + radialOut.z * cosOrbit;
        desiredCamPos.set(
          focusWorld.x + offX * dist * 0.86,
          focusWorld.y + dist * (0.45 - smoothScrollProgress * 0.14),
          focusWorld.z + offZ * dist * 0.86 + dist * 0.3
        );
        desiredLookAt.copy(focusWorld);
      } else {
        // Overview mode: scrolling zooms smoothly from outer Neptune view inward to inner Earth/Mars habitable zone
        const overviewRadius = THREE.MathUtils.lerp(31.2, 9.4, smoothScrollProgress);
        const overviewElev = THREE.MathUtils.lerp(12.2, 2.35, smoothScrollProgress);
        const overviewAzimuth = smoothScrollProgress * 0.68;
        desiredCamPos.set(
          Math.sin(overviewAzimuth) * overviewRadius,
          overviewElev,
          Math.cos(overviewAzimuth) * overviewRadius
        );
        desiredLookAt.set(
          overviewLookAt.x * (1 - smoothScrollProgress * 0.45),
          overviewLookAt.y * (1 - smoothScrollProgress * 0.5),
          overviewLookAt.z * (1 - smoothScrollProgress * 0.4)
        );
      }

      if (rm) {
        currentCamPos.copy(desiredCamPos);
        currentLookAt.copy(desiredLookAt);
      } else {
        currentCamPos.x = THREE.MathUtils.damp(currentCamPos.x, desiredCamPos.x, 3.8, dt);
        currentCamPos.y = THREE.MathUtils.damp(currentCamPos.y, desiredCamPos.y, 3.8, dt);
        currentCamPos.z = THREE.MathUtils.damp(currentCamPos.z, desiredCamPos.z, 3.8, dt);
        currentLookAt.x = THREE.MathUtils.damp(currentLookAt.x, desiredLookAt.x, 4.2, dt);
        currentLookAt.y = THREE.MathUtils.damp(currentLookAt.y, desiredLookAt.y, 4.2, dt);
        currentLookAt.z = THREE.MathUtils.damp(currentLookAt.z, desiredLookAt.z, 4.2, dt);
      }
      camera.position.copy(currentCamPos);
      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />;
}
