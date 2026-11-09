import * as THREE from "three";

export interface HomeAvatarSceneParts {
  avatar: THREE.Group;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  rings: THREE.Group;
  scene: THREE.Scene;
  sweep: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}

export interface AvatarPointerState {
  targetX: number;
  targetY: number;
  x: number;
  y: number;
}

export function createAvatarScene(host: HTMLElement): HomeAvatarSceneParts {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true
  });
  const avatar = createAvatar();
  const rings = createPlatformRings();
  const sweep = createSweep();

  camera.position.set(0, 0.9, 7.8);
  camera.lookAt(0, 0.65, 0);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.AmbientLight(0x8ffaff, 0.7));
  scene.add(createPointLight(0x00dbe7, 4.8, -2.4, 2.8, 3.2));
  scene.add(createPointLight(0xe1fdff, 3.6, 2.2, 2.2, 2.4));
  scene.add(avatar, rings, sweep);

  const parts = { avatar, camera, renderer, rings, scene, sweep };
  resizeAvatarScene(parts, host);

  return parts;
}

export function resizeAvatarScene(parts: HomeAvatarSceneParts, host: HTMLElement): void {
  const { height, width } = host.getBoundingClientRect();
  const safeHeight = Math.max(1, Math.floor(height));
  const safeWidth = Math.max(1, Math.floor(width));

  parts.camera.aspect = safeWidth / safeHeight;
  parts.camera.updateProjectionMatrix();
  parts.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  parts.renderer.setSize(safeWidth, safeHeight, false);
}

export function updateAvatarScene(
  parts: HomeAvatarSceneParts,
  pointer: AvatarPointerState,
  time: number,
  prefersReducedMotion: boolean
): void {
  const elapsed = prefersReducedMotion ? 900 : time;

  pointer.x += (pointer.targetX - pointer.x) * 0.055;
  pointer.y += (pointer.targetY - pointer.y) * 0.055;

  parts.avatar.rotation.y = pointer.x * 0.22 + Math.sin(elapsed * 0.00035) * 0.08;
  parts.avatar.rotation.x = pointer.y * -0.05;
  parts.avatar.position.y = -0.45 + Math.sin(elapsed * 0.0012) * 0.035;
  parts.rings.rotation.z = elapsed * 0.00016;
  parts.rings.rotation.x = pointer.y * 0.035;
  parts.sweep.position.y = -0.3 + (Math.sin(elapsed * 0.0015) * 0.5 + 0.5) * 2.2;
  parts.sweep.material.opacity = 0.12 + (Math.sin(elapsed * 0.0021) * 0.5 + 0.5) * 0.18;
  parts.camera.position.x = pointer.x * 0.18;
  parts.camera.position.y = 0.9 + pointer.y * 0.08;
  parts.camera.lookAt(0, 0.65, 0);
}

export function disposeAvatarScene(parts: HomeAvatarSceneParts): void {
  disposeObject(parts.scene);
  parts.renderer.dispose();
  parts.renderer.domElement.remove();
}

function createPointLight(
  color: number,
  intensity: number,
  x: number,
  y: number,
  z: number
): THREE.PointLight {
  const light = new THREE.PointLight(color, intensity, 7);
  light.position.set(x, y, z);
  return light;
}

function createAvatar(): THREE.Group {
  const avatar = new THREE.Group();
  const coreMaterial = createHologramMaterial(0.44);
  const shellMaterial = createHologramMaterial(0.3);

  avatar.add(createBodyPart(new THREE.SphereGeometry(0.34, 32, 18), shellMaterial, [0, 2.08, 0], [1, 1.08, 0.82]));
  avatar.add(createBodyPart(new THREE.CapsuleGeometry(0.52, 1.05, 12, 28), coreMaterial, [0, 1.05, 0], [1.02, 1, 0.52]));
  avatar.add(createBodyPart(new THREE.CapsuleGeometry(0.13, 1.42, 8, 18), shellMaterial, [0, 1.5, 0], [1, 1, 0.8], [0, 0, Math.PI / 2]));
  avatar.add(createBodyPart(new THREE.CapsuleGeometry(0.13, 1.08, 8, 18), shellMaterial, [-0.78, 0.78, 0], [0.86, 1, 0.78], [0, 0, -0.18]));
  avatar.add(createBodyPart(new THREE.CapsuleGeometry(0.13, 1.08, 8, 18), shellMaterial, [0.78, 0.78, 0], [0.86, 1, 0.78], [0, 0, 0.18]));
  avatar.add(createBodyPart(new THREE.CapsuleGeometry(0.16, 1.28, 8, 18), coreMaterial, [-0.24, -0.2, 0], [0.84, 1, 0.8], [0, 0, 0.05]));
  avatar.add(createBodyPart(new THREE.CapsuleGeometry(0.16, 1.28, 8, 18), coreMaterial, [0.24, -0.2, 0], [0.84, 1, 0.8], [0, 0, -0.05]));
  avatar.add(createTelemetryLines());
  avatar.position.y = -0.45;

  return avatar;
}

function createBodyPart(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  scale: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.Group {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 12),
    new THREE.LineBasicMaterial({ color: 0xe1fdff, transparent: true, opacity: 0.18 })
  );

  group.add(mesh, edges);
  group.position.set(...position);
  group.rotation.set(...rotation);
  group.scale.set(...scale);

  return group;
}

function createHologramMaterial(opacity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x6ff7ff,
    emissive: 0x00dbe7,
    emissiveIntensity: 0.48,
    metalness: 0.18,
    opacity,
    roughness: 0.32,
    transparent: true
  });
}

function createTelemetryLines(): THREE.LineSegments {
  const points = [
    -0.55, 1.28, 0.03, 0.55, 1.28, 0.03,
    -0.44, 0.78, 0.03, 0.44, 0.78, 0.03,
    -0.32, 0.24, 0.03, 0.32, 0.24, 0.03,
    0, 1.76, 0.04, 0, -0.78, 0.04
  ];
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xe1fdff, transparent: true, opacity: 0.34 })
  );
}

function createPlatformRings(): THREE.Group {
  const rings = new THREE.Group();
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0x00dbe7, transparent: true, opacity: 0.26 }),
    new THREE.MeshBasicMaterial({ color: 0xe1fdff, transparent: true, opacity: 0.14 }),
    new THREE.MeshBasicMaterial({ color: 0x78ff5d, transparent: true, opacity: 0.1 })
  ];

  [1.9, 1.45, 0.92].forEach((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 8, 120), materials[index]);
    ring.position.y = -1.16 + index * 0.035;
    ring.rotation.x = Math.PI / 2;
    rings.add(ring);
  });

  return rings;
}

function createSweep(): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const material = new THREE.MeshBasicMaterial({
    color: 0xe1fdff,
    opacity: 0.24,
    transparent: true
  });
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 0.018), material);

  sweep.position.set(0, 0.4, 0.12);

  return sweep;
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
      object.geometry.dispose();
      disposeMaterial(object.material);
    }
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
  } else {
    material.dispose();
  }
}
