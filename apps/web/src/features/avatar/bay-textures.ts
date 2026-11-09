import * as THREE from "three";

/** Procedural canvas textures for the hologram bay (no external images). */

/** Soft radial gradient canvas texture — shared for glow pools/pads/halos. */
export function createRadialGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  if (ctx) {
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.28)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

/**
 * Vertical white gradient strip (v axis) for the additive wall-base horizon
 * glow that stands in for the removed pilaster colonnade.
 */
export function createVerticalGradientTexture(
  stops: ReadonlyArray<readonly [number, number]>
): THREE.Texture {
  const width = 4;
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Canvas y grows downward while cylinder v grows upward — flip so stop 0
    // is the BOTTOM of the mesh.
    const gradient = ctx.createLinearGradient(0, height, 0, 0);

    for (const [offset, alpha] of stops) {
      gradient.addColorStop(offset, `rgba(255,255,255,${alpha})`);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

/**
 * Dark metal deck plates (mood ref: hologram-bay-mood.png): a 4×4 tile sheet
 * with seams, per-tile tone variance, and worn brushed streaks. The matching
 * roughness map polishes tile centers and roughens seams/wear so the env-map
 * reflection streaks break up like a used, slightly wet deck.
 */
export function createFloorTextures(size: number): {
  map: THREE.Texture;
  roughnessMap: THREE.Texture;
} {
  const tiles = 4;
  const tile = size / tiles;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;

  const color = colorCanvas.getContext("2d");
  const rough = roughCanvas.getContext("2d");

  if (color && rough) {
    color.fillStyle = "#0f141c";
    color.fillRect(0, 0, size, size);
    // Mid-gray base roughness ≈ 0.42 — wet-metal territory once env-mapped.
    rough.fillStyle = "#6b6b6b";
    rough.fillRect(0, 0, size, size);

    // Deterministic pseudo-random so HMR/StrictMode re-runs render identically.
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;

      return seed / 2147483647;
    };

    for (let tileY = 0; tileY < tiles; tileY += 1) {
      for (let tileX = 0; tileX < tiles; tileX += 1) {
        const x = tileX * tile;
        const y = tileY * tile;

        // Per-tile tone variance: some plates darker, some barely lighter.
        const tone = (random() - 0.45) * 10;
        color.fillStyle = `rgba(${tone > 0 ? "170,190,210" : "0,2,6"},${Math.abs(tone) / 100})`;
        color.fillRect(x, y, tile, tile);

        // Per-tile polish variance for uneven reflections.
        const polish = Math.floor(random() * 46) - 23;
        rough.fillStyle = `rgba(${polish > 0 ? "255,255,255" : "0,0,0"},${Math.abs(polish) / 255})`;
        rough.fillRect(x, y, tile, tile);

        // Brushed wear streaks, biased along one axis per plate.
        const horizontal = random() > 0.5;

        for (let streak = 0; streak < 9; streak += 1) {
          const along = random() * tile;
          const across = random() * tile;
          const length = tile * (0.2 + random() * 0.5);
          const lightness = random() > 0.6 ? "150,170,190" : "0,0,0";

          color.fillStyle = `rgba(${lightness},0.045)`;
          rough.fillStyle = "rgba(255,255,255,0.05)";

          if (horizontal) {
            color.fillRect(x + along, y + across, length, 1);
            rough.fillRect(x + along, y + across, length, 1);
          } else {
            color.fillRect(x + across, y + along, 1, length);
            rough.fillRect(x + across, y + along, 1, length);
          }
        }
      }
    }

    // Seams: dark groove + a faint worn highlight lip, rough in the groove.
    for (let line = 0; line <= tiles; line += 1) {
      const at = Math.min(line * tile, size - 2);

      color.fillStyle = "rgba(2,4,7,0.95)";
      color.fillRect(0, at, size, 3);
      color.fillRect(at, 0, 3, size);
      color.fillStyle = "rgba(150,175,200,0.12)";
      color.fillRect(0, at + 3, size, 1);
      color.fillRect(at + 3, 0, 1, size);

      rough.fillStyle = "rgba(255,255,255,0.5)";
      rough.fillRect(0, at, size, 3);
      rough.fillRect(at, 0, 3, size);
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  // Floor circle spans 80 world units; the 4-tile sheet covers 8 → 2u plates.
  map.repeat.set(10, 10);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(10, 10);

  return { map, roughnessMap };
}
