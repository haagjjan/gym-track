"use client";

import { Grid, Html, OrbitControls, Stats, useFBX } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useMemo, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import type { SpikeControlState } from "./avatar-spike-state";

const AVATAR_MODEL_URL = "/models/avatar/avatar-base.fbx";
const STATUE_HEIGHT = 2.1;
const RIM_CYAN = "#00dbe7";
const PULSE_GREEN = "#51fb37";
const PARTICLE_COUNT = 140;
const BURST_ORIGIN = new THREE.Vector3(0, 1.25, 0);

interface RimUniforms {
  uRimColor: { value: THREE.Color };
  uPulseColor: { value: THREE.Color };
  uRimIntensity: { value: number };
  uRimPower: { value: number };
  uPulse: { value: number };
}

interface AvatarSpikeSceneProps {
  controls: RefObject<SpikeControlState>;
  reducedMotion: boolean;
}

export function AvatarSpikeScene({ controls, reducedMotion }: AvatarSpikeSceneProps): ReactNode {
  const turntableRef = useRef<THREE.Group>(null);
  const statue = useMemo(createStatueMaterial, []);
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(RIM_CYAN),
        opacity: 0.5,
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true
      }),
    []
  );

  return (
    <Canvas camera={{ fov: 38, position: [0, 1.7, 4.7] }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={["#0a0a0a"]} />
      <fog attach="fog" args={["#0a0a0a", 7.5, 15]} />

      <ambientLight color="#22343c" intensity={0.45} />
      <directionalLight color="#d8f7fa" intensity={1.6} position={[3.5, 4.5, 2.5]} />
      <directionalLight color="#d9b9ff" intensity={0.7} position={[-3, 2.5, -3.5]} />
      <pointLight color={RIM_CYAN} distance={3.2} intensity={1.1} position={[0, 0.45, 0]} />

      <Suspense fallback={<SceneLoadingLabel />}>
        <group ref={turntableRef}>
          <Statue material={statue.material} />
          {/* The FBX ships with its own sculpted pedestal; only the glow ring is procedural. */}
          <mesh material={ringMaterial} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.95, 1.06, 96]} />
          </mesh>
        </group>
        <PrBurst controls={controls} />
      </Suspense>

      <Grid
        cellColor="#123236"
        cellSize={0.6}
        cellThickness={0.6}
        fadeDistance={16}
        fadeStrength={2.4}
        infiniteGrid
        position={[0, -0.71, 0]}
        sectionColor="#0f4c52"
        sectionSize={3}
        sectionThickness={1}
      />

      <SceneDriver
        controls={controls}
        reducedMotion={reducedMotion}
        ringMaterial={ringMaterial}
        turntable={turntableRef}
        uniforms={statue.uniforms}
      />

      <OrbitControls
        enableDamping
        enablePan={false}
        maxDistance={7.5}
        maxPolarAngle={1.5}
        minDistance={3}
        minPolarAngle={0.7}
        target={[0, 1.05, 0]}
      />

      <EffectComposer multisampling={4}>
        <Bloom intensity={0.9} luminanceSmoothing={0.25} luminanceThreshold={0.2} mipmapBlur />
      </EffectComposer>

      <Stats />
    </Canvas>
  );
}

function SceneLoadingLabel(): ReactNode {
  return (
    <Html center>
      <span
        style={{
          color: "#00dbe7",
          fontFamily: "ui-monospace, monospace",
          fontSize: 12,
          letterSpacing: "0.1em",
          whiteSpace: "nowrap"
        }}
      >
        LOADING_MESH
      </span>
    </Html>
  );
}

function createStatueMaterial(): { material: THREE.MeshStandardMaterial; uniforms: RimUniforms } {
  const uniforms: RimUniforms = {
    uRimColor: { value: new THREE.Color(RIM_CYAN) },
    uPulseColor: { value: new THREE.Color(PULSE_GREEN) },
    uRimIntensity: { value: 0.9 },
    uRimPower: { value: 3.4 },
    uPulse: { value: 0 }
  };
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#171a20"),
    metalness: 0.35,
    roughness: 0.5
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "uniform vec3 uRimColor;",
          "uniform vec3 uPulseColor;",
          "uniform float uRimIntensity;",
          "uniform float uRimPower;",
          "uniform float uPulse;"
        ].join("\n")
      )
      .replace(
        "#include <emissivemap_fragment>",
        [
          "#include <emissivemap_fragment>",
          "{",
          "  vec3 rimViewDir = normalize(vViewPosition);",
          "  float rimFresnel = pow(1.0 - saturate(dot(rimViewDir, normal)), uRimPower);",
          "  vec3 rimTint = mix(uRimColor, uPulseColor, uPulse);",
          "  totalEmissiveRadiance += rimTint * rimFresnel * (uRimIntensity + uPulse * 2.2);",
          "}"
        ].join("\n")
      );
  };

  return { material, uniforms };
}

function boundsAboveHeight(root: THREE.Object3D, minWorldY: number): THREE.Box3 {
  const bounds = new THREE.Box3();
  const vertex = new THREE.Vector3();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const positionAttribute = child.geometry.getAttribute("position");

    if (!positionAttribute) {
      return;
    }

    for (let index = 0; index < positionAttribute.count; index += 1) {
      vertex.fromBufferAttribute(positionAttribute, index).applyMatrix4(child.matrixWorld);

      if (vertex.y >= minWorldY) {
        bounds.expandByPoint(vertex);
      }
    }
  });

  return bounds;
}

function Statue({ material }: { material: THREE.MeshStandardMaterial }): ReactNode {
  const fbx = useFBX(AVATAR_MODEL_URL);

  const statue = useMemo(() => {
    // Reset first so normalization is idempotent under StrictMode re-runs.
    fbx.scale.setScalar(1);
    fbx.position.set(0, 0, 0);
    fbx.updateMatrixWorld(true);

    const rawSize = new THREE.Box3().setFromObject(fbx).getSize(new THREE.Vector3());

    fbx.scale.setScalar(STATUE_HEIGHT / rawSize.y);
    fbx.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(fbx);

    // The built-in pedestal has an asymmetric slab, so the full bounding box is skewed.
    // Center the turntable axis on the figure instead: bounds of vertices above 40% height.
    const figureBounds = boundsAboveHeight(
      fbx,
      scaledBox.min.y + (scaledBox.max.y - scaledBox.min.y) * 0.4
    );
    const figureCenter = figureBounds.getCenter(new THREE.Vector3());

    fbx.position.set(-figureCenter.x, -scaledBox.min.y, -figureCenter.z);
    fbx.updateMatrixWorld(true);

    // Spike-only diagnostics: map the FBX scene graph so the built-in base can be handled.
    const meshReport: Array<Record<string, number | string>> = [];

    fbx.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const bounds = new THREE.Box3().setFromObject(child);

        meshReport.push({
          height: Number((bounds.max.y - bounds.min.y).toFixed(3)),
          maxY: Number(bounds.max.y.toFixed(3)),
          minY: Number(bounds.min.y.toFixed(3)),
          name: child.name || "(unnamed)",
          vertices: child.geometry.getAttribute("position")?.count ?? 0
        });
        child.material = material;
        child.frustumCulled = false;
      }
    });
    (window as unknown as Record<string, unknown>).__avatarSpikeMeshes = meshReport;

    return fbx;
  }, [fbx, material]);

  return <primitive object={statue} />;
}

function SceneDriver({
  controls,
  reducedMotion,
  ringMaterial,
  turntable,
  uniforms
}: {
  controls: RefObject<SpikeControlState>;
  reducedMotion: boolean;
  ringMaterial: THREE.MeshBasicMaterial;
  turntable: RefObject<THREE.Group | null>;
  uniforms: RimUniforms;
}): ReactNode {
  const ringCyan = useMemo(() => new THREE.Color(RIM_CYAN), []);
  const ringGreen = useMemo(() => new THREE.Color(PULSE_GREEN), []);

  useFrame((_, delta) => {
    const state = controls.current;

    state.pulse = Math.max(0, state.pulse - delta / 3);
    state.burstProgress = Math.min(1, state.burstProgress + delta / 2.2);

    const readiness = state.readiness / 100;

    uniforms.uRimIntensity.value = 0.25 + readiness * 1.25 + state.pulse * 0.6;
    uniforms.uPulse.value = state.pulse;
    ringMaterial.color.copy(ringCyan).lerp(ringGreen, state.pulse);
    ringMaterial.opacity = 0.12 + readiness * 0.3 + state.pulse * 0.3;

    if (!reducedMotion && turntable.current) {
      turntable.current.rotation.y += delta * 0.16;
    }
  });

  return null;
}

function PrBurst({ controls }: { controls: RefObject<SpikeControlState> }): ReactNode {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const seeds = useMemo(() => {
    const directions = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const theta = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.15;
      const radial = Math.sqrt(Math.max(0, 1 - up * up));

      directions[index * 3] = Math.cos(theta) * radial;
      directions[index * 3 + 1] = up;
      directions[index * 3 + 2] = Math.sin(theta) * radial;
      speeds[index] = 1.2 + Math.random() * 1.6;
    }

    return { directions, speeds };
  }, []);

  useFrame(() => {
    const points = pointsRef.current;
    const material = materialRef.current;

    if (!points || !material) {
      return;
    }

    const progress = controls.current.burstProgress;

    if (progress >= 1) {
      points.visible = false;
      return;
    }

    points.visible = true;

    const eased = 1 - Math.pow(1 - progress, 2.2);
    const attribute = points.geometry.getAttribute("position") as THREE.BufferAttribute;

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const distance = (seeds.speeds[index] ?? 0) * eased;
      const directionX = seeds.directions[index * 3] ?? 0;
      const directionY = seeds.directions[index * 3 + 1] ?? 0;
      const directionZ = seeds.directions[index * 3 + 2] ?? 0;

      attribute.setXYZ(
        index,
        BURST_ORIGIN.x + directionX * distance,
        BURST_ORIGIN.y + directionY * distance * 1.15 - 0.35 * eased * eased,
        BURST_ORIGIN.z + directionZ * distance
      );
    }

    attribute.needsUpdate = true;
    material.opacity = (1 - progress) * 0.95;
  });

  return (
    <points ref={pointsRef} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        blending={THREE.AdditiveBlending}
        color={PULSE_GREEN}
        depthWrite={false}
        opacity={0}
        ref={materialRef}
        size={0.05}
        sizeAttenuation
        toneMapped={false}
        transparent
      />
    </points>
  );
}
