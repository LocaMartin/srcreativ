import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import "./DroneModel.css";

const BASE = "/drone-parts";
const ROTOR_NAMES = ["front-left", "front-right", "rear-left", "rear-right"];

function colorizePropeller(geometry) {
  if (geometry.index) {
    const expanded = geometry.toNonIndexed();
    geometry.copy(expanded);
    expanded.dispose();
  }

  const pos = geometry.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);

  const bladeDark = new THREE.Color("#27292d");
  const bladeHighlight = new THREE.Color("#41454b");
  const tipOrange = new THREE.Color("#f2a64a");

  let maxRadius = 0;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const radius = Math.hypot(x, z);
    maxRadius = Math.max(maxRadius, radius);
  }

  const tipStart = maxRadius * 0.88;

  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const radius = Math.hypot(x, z);

    let color;
    if (radius >= tipStart) {
      color = tipOrange;
    } else {
      const blend = Math.min(radius / Math.max(maxRadius, 0.0001), 1) * 0.22;
      color = bladeDark.clone().lerp(bladeHighlight, blend);
    }

    for (let j = 0; j < 3; j++) {
      const index = (i + j) * 3;
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.attributes.color.needsUpdate = true;
}

function makeGlowSprite(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

  gradient.addColorStop(0, color);
  gradient.addColorStop(0.2, color);
  gradient.addColorStop(0.45, color.replace("1)", "0.35)"));
  gradient.addColorStop(0.75, color.replace("1)", "0.08)"));
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
  });

  const sprite = new THREE.Sprite(material);
  // Size is assigned after loading the STL, using its real units.
  sprite.scale.set(1, 1, 1);

  return sprite;
}

export default function DronePage() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let animationId = 0;
    let hovering = false;
    let spinSpeed = 0;

    const geometries = [];
    const textures = [];
    const rotors = [];
    const hitMeshes = [];
    const disposables = [];

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;

    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.05);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 1.0;

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xe8edf5, 0x2a2f38, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.15);
    keyLight.position.set(5, 9, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaeb9c8, 0.95);
    fillLight.position.set(-6, 5, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf6f8fb, 0.55);
    rimLight.position.set(0, 7, -7);
    scene.add(rimLight);

    const frontLight = new THREE.DirectionalLight(0xfff4ea, 0.28);
    frontLight.position.set(0, 4, 8);
    scene.add(frontLight);

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x6f747b,
      metalness: 0.2,
      roughness: 0.46,
      clearcoat: 0.34,
      clearcoatRoughness: 0.42,
      sheen: 0.12,
      sheenRoughness: 0.72,
      envMapIntensity: 1.0,
      side: THREE.DoubleSide,
    });

    const rotorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      metalness: 0.08,
      roughness: 0.52,
      envMapIntensity: 0.55,
      side: THREE.DoubleSide,
    });

    const modelRoot = new THREE.Group();
    const modelContent = new THREE.Group();
    const fxGroup = new THREE.Group();

    modelRoot.add(modelContent);
    modelRoot.add(fxGroup);
    scene.add(modelRoot);

    const shadowTexture = makeShadowTexture();
    textures.push(shadowTexture);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.42,
    });

    const shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      shadowMaterial,
    );

    shadowMesh.rotation.x = -Math.PI / 2;
    modelRoot.add(shadowMesh);
    disposables.push(shadowMesh.geometry, shadowMaterial);

    const loader = new STLLoader();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let modelHalfSize = 1;
    let modelLoaded = false;

    // light effect sprites
    const frontLeftGlow = makeGlowSprite("rgba(80,255,140,1)", 0.55);
    const frontRightGlow = makeGlowSprite("rgba(80,255,140,1)", 0.55);
    const rearLeftGlow = makeGlowSprite("rgba(255,70,70,1)", 0.55);
    const rearRightGlow = makeGlowSprite("rgba(80,255,140,1)", 0.55);
    const bottomGlow = makeGlowSprite("rgba(255,255,235,1)", 1.05);

    function makeShadowTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;

      const ctx = canvas.getContext("2d");
      const gradient = ctx.createRadialGradient(256, 256, 30, 256, 256, 220);

      gradient.addColorStop(0, "rgba(0,0,0,0.30)");
      gradient.addColorStop(0.45, "rgba(0,0,0,0.18)");
      gradient.addColorStop(0.75, "rgba(0,0,0,0.08)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      return new THREE.CanvasTexture(canvas);
    }

    [
      frontLeftGlow,
      frontRightGlow,
      rearLeftGlow,
      rearRightGlow,
      bottomGlow,
    ].forEach((sprite) => {
      fxGroup.add(sprite);
      if (sprite.material.map) textures.push(sprite.material.map);
    });

    function fitCamera() {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (!width || !height) return;

      renderer.setSize(width, height, false);

      const aspect = width / height;
      const margin = 1.15;

      camera.left = -modelHalfSize * aspect * margin;
      camera.right = modelHalfSize * aspect * margin;
      camera.top = modelHalfSize * margin;
      camera.bottom = -modelHalfSize * margin;
      camera.near = 0.01;
      camera.far = 1000;

      camera.position.set(0, 10, 0);
      camera.up.set(0, 0, -1);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    }

    async function loadModel() {
      let loaded = [];

      try {
        const response = await fetch(`${BASE}/config.json`);
        if (!response.ok) {
          throw new Error(`Configuration HTTP ${response.status}`);
        }

        const config = await response.json();

        loaded = await Promise.all([
          loader.loadAsync(`${BASE}/body.stl`),
          ...ROTOR_NAMES.map((name) =>
            loader.loadAsync(`${BASE}/rotor-${name}.stl`),
          ),
        ]);

        if (disposed) {
          loaded.forEach((g) => g.dispose());
          return;
        }

        geometries.push(...loaded);

        const [bodyGeometry, ...rotorGeometries] = loaded;

        bodyGeometry.computeVertexNormals();

        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        modelContent.add(bodyMesh);
        hitMeshes.push(bodyMesh);

        const rotorPivots = {};

        ROTOR_NAMES.forEach((name, index) => {
          const settings = config.rotors[name];
          const pivot = new THREE.Vector3(...settings.pivot);

          rotorPivots[name] = pivot.clone();

          const geometry = rotorGeometries[index];
          geometry.translate(-pivot.x, -pivot.y, -pivot.z);
          geometry.computeVertexNormals();
          colorizePropeller(geometry);

          const rotorGroup = new THREE.Group();
          rotorGroup.position.copy(pivot);

          const bladeMesh = new THREE.Mesh(geometry, rotorMaterial);
          rotorGroup.add(bladeMesh);
          modelContent.add(rotorGroup);

          rotors.push({
            group: rotorGroup,
            direction: settings.direction,
          });

          hitMeshes.push(bladeMesh);
        });

        const bounds = new THREE.Box3().setFromObject(modelContent);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());

        modelContent.position.copy(center).negate();
        fxGroup.position.copy(center).negate();

        const longest = Math.max(size.x, size.z);
        const scale = 6 / longest;
        modelRoot.scale.setScalar(scale);

        const glowScale = 55;
        frontLeftGlow.scale.set(glowScale, glowScale, 1);
        frontRightGlow.scale.set(glowScale, glowScale, 1);
        rearLeftGlow.scale.set(glowScale, glowScale, 1);
        rearRightGlow.scale.set(glowScale, glowScale, 1);
        bottomGlow.scale.set(85, 85, 1);

        modelRoot.rotation.set(0, 0, 0);

        // soft contact shadow under drone
        shadowMesh.position.set(
          center.x,
          bounds.min.y - size.y * 0.11,
          center.z,
        );
        shadowMesh.scale.set(longest * 0.78, longest * 0.62, 1);

        // STL coordinates are hundreds of units across, so glows
        // must also use STL units (not a size of 0.8 or 1.6).
        // Position sprites slightly BELOW the drone so the body
        // naturally occludes their centers and light spills around it.

        const glowSize = longest * 0.2;

        // Position the glow slightly below the rotor
        // geometry without moving it horizontally.
        const glowY = bounds.min.y - size.y * 0.08;

        const glowEntries = [
          [frontLeftGlow, "front-left"],
          [frontRightGlow, "front-right"],
          [rearLeftGlow, "rear-left"],
          [rearRightGlow, "rear-right"],
        ];

        // Align each glow with its actual motor pivot.
        glowEntries.forEach(([sprite, name]) => {
          const [x, , z] = config.rotors[name].pivot;

          sprite.position.set(x, glowY, z);
          sprite.scale.set(glowSize, glowSize, 1);
        });

        // Auxiliary glow centered underneath drone body.
        bottomGlow.position.set(center.x, glowY, center.z);

        bottomGlow.scale.set(glowSize * 1.5, glowSize * 1.5, 1);

        modelHalfSize = (Math.max(size.x, size.z) * scale) / 2;
        modelLoaded = true;

        fitCamera();
      } catch (error) {
        if (disposed) {
          loaded.forEach((g) => g.dispose());
          return;
        }
        console.error("Drone loading failed:", error);
      }
    }

    function handlePointerMove(event) {
      if (!modelLoaded) return;

      const rect = renderer.domElement.getBoundingClientRect();

      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const intersections = raycaster.intersectObjects(hitMeshes, false);
      hovering = intersections.length > 0;
    }

    function handlePointerLeave() {
      hovering = false;
    }

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

    const observer = new ResizeObserver(() => {
      fitCamera();
    });

    observer.observe(container);

    const clock = new THREE.Clock();
    let elapsed = 0;

    function animate() {
      if (disposed) return;

      animationId = requestAnimationFrame(animate);

      // Read the clock only ONCE per frame. getElapsedTime() itself
      // advances the clock; calling getDelta() immediately afterward
      // returned ~0 and effectively stopped the rotor animation.
      const delta = Math.min(clock.getDelta(), 0.05);
      elapsed += delta;
      const targetSpeed = hovering ? 28 : 0;

      spinSpeed = THREE.MathUtils.damp(
        spinSpeed,
        targetSpeed,
        hovering ? 3.4 : 2.4,
        delta,
      );

      rotors.forEach((rotor) => {
        rotor.group.rotation.y += rotor.direction * spinSpeed * delta;
      });

      // blinking light effect only in background glow
      const greenPulse = 0.18 + Math.max(0, Math.sin(elapsed * 4.2)) * 0.55;
      const greenPulseOffset =
        0.1 + Math.max(0, Math.sin(elapsed * 4.2 + 0.8)) * 0.45;
      const redPulse =
        0.12 + Math.max(0, Math.sin(elapsed * 3.4 + Math.PI * 0.5)) * 0.6;
      const whitePulse = 0.05 + (Math.sin(elapsed * 2.1) * 0.5 + 0.5) * 0.14;

      frontLeftGlow.material.opacity = greenPulse;
      frontRightGlow.material.opacity = greenPulseOffset;

      rearLeftGlow.material.opacity = redPulse;
      rearRightGlow.material.opacity = greenPulseOffset * 0.9;

      bottomGlow.material.opacity = whitePulse;

      renderer.render(scene, camera);
    }

    loadModel();
    animate();

    return () => {
      disposed = true;

      cancelAnimationFrame(animationId);
      observer.disconnect();

      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener(
        "pointerleave",
        handlePointerLeave,
      );

      geometries.forEach((g) => g.dispose());
      disposables.forEach((item) => item.dispose());

      bodyMaterial.dispose();
      rotorMaterial.dispose();

      frontLeftGlow.material.dispose();
      frontRightGlow.material.dispose();
      rearLeftGlow.material.dispose();
      rearRightGlow.material.dispose();
      bottomGlow.material.dispose();

      envRT.dispose();
      pmremGenerator.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="drone-fullscreen"
      role="img"
      aria-label="Top-view 3D drone with spinning propellers and blinking light glow"
    />
  );
}
