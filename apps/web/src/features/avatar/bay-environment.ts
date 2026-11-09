import * as THREE from "three";

/**
 * PMREM cube resolution. Prefiltering is the single most expensive thing this
 * scene does on a CPU rasterizer (see the note in HologramBay), and its
 * cost is dominated by the number of blur passes rather than their size — so a
 * small cube buys most of the saving while keeping real image-based lighting.
 *
 * Dropping the map ENTIRELY was measured and rejected: it is much faster still
 * (~0.8 s vs ~1.3 s bootstrap) but the pedestal stops reading as a sculpted
 * object — with nothing to reflect, its tiers, LED bands and front machinery
 * collapse into a flat silhouette. Fidelity wins here; see docs/14.
 */
export const ENVIRONMENT_SIZE = 256;
export const ENVIRONMENT_SIZE_SOFTWARE = 32;

/**
 * One-shot PMREM environment for the bay's metals. A throwaway scene of
 * overhead cool light bars over a dark void — the "ceiling lights" of the
 * mood refs exist only as these reflections (no visible source in frame),
 * which is what makes the floor and pedestal read as wet metal.
 */
export function createBayEnvironment(gl: THREE.WebGLRenderer, size: number): THREE.Texture {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#04060a");

  const barMaterial = new THREE.MeshBasicMaterial({ color: "#bfe9f2" });
  const dimBarMaterial = new THREE.MeshBasicMaterial({ color: "#3f6672" });
  const barGeometry = new THREE.BoxGeometry(2.6, 0.08, 0.5);
  // Irregular ring of bars so floor reflections streak unevenly like the ref.
  const bars: Array<[number, number, number, boolean]> = [
    [0.3, 6.4, 3.4, true],
    [1.4, 5.8, 4.6, false],
    [2.5, 6.8, 3.0, true],
    [3.5, 6.1, 5.2, false],
    [4.4, 6.6, 3.8, true],
    [5.4, 5.9, 4.4, false]
  ];

  for (const [angle, height, radius, bright] of bars) {
    const bar = new THREE.Mesh(barGeometry, bright ? barMaterial : dimBarMaterial);

    bar.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    bar.rotation.y = angle + Math.PI / 2;
    scene.add(bar);
  }

  // Two horizon rings the pedestal's outward metal faces reflect as a bright
  // waistline — a low, bright one near the pedestal's own height so its dark
  // outer tiers pick up a cyan sheen, plus a higher teal one for depth.
  const horizonLow = new THREE.Mesh(
    new THREE.TorusGeometry(5.2, 0.32, 8, 48),
    new THREE.MeshBasicMaterial({ color: "#37b8ce" })
  );
  horizonLow.rotation.x = Math.PI / 2;
  horizonLow.position.y = 0.5;
  scene.add(horizonLow);

  const horizon = new THREE.Mesh(
    new THREE.TorusGeometry(6.5, 0.14, 8, 48),
    new THREE.MeshBasicMaterial({ color: "#12707f" })
  );
  horizon.rotation.x = Math.PI / 2;
  horizon.position.y = 2.2;
  scene.add(horizon);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(20, 24),
    new THREE.MeshBasicMaterial({ color: "#05070a" })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const pmrem = new THREE.PMREMGenerator(gl);
  const environment = pmrem.fromScene(scene, 0.05, 0.1, 100, { size }).texture;

  pmrem.dispose();
  barGeometry.dispose();
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  });

  return environment;
}
