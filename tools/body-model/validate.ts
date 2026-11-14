import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
// Resolve the renderer's installed versions without adding a separate tooling dependency.
const { GLTFLoader } = await import(requireWeb.resolve("three/examples/jsm/loaders/GLTFLoader.js"));
const { MeshoptDecoder } = await import(requireWeb.resolve("three/examples/jsm/libs/meshopt_decoder.module.js"));
const { Box3, Vector3, Raycaster } = await import(requireWeb.resolve("three"));
const slugs = ["chest", "delts_front", "delts_side", "delts_rear", "lats", "upper_back", "lower_back",
  "traps", "neck", "abs", "obliques", "glutes", "abductors", "quads", "adductors", "biceps",
  "triceps", "forearms", "hamstrings", "calves"];
const path = resolve(process.argv[2] ?? "apps/web/public/models/body/body.glb");
const bytes = await readFile(path);
if (!process.argv[2]) {
  const loaderSource = await readFile(new URL("../../apps/web/src/features/avatar/body-model.ts", import.meta.url), "utf8");
  const version = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  assert.ok(loaderSource.includes(`body.glb?v=${version}`), "refresh the asset URL fingerprint after replacing the GLB");
}
assert.equal(bytes.readUInt32LE(0), 0x46546c67, "GLB magic");
assert.equal(bytes.readUInt32LE(4), 2, "glTF version");
assert.equal(bytes.readUInt32LE(8), bytes.length, "declared file length");
assert.ok(bytes.length < 600_000, `asset exceeds 600 KB: ${bytes.length}`);
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
assert.ok(json.buffers.every((buffer: { uri?: string }) => !buffer.uri), "buffers must be bundled");
assert.equal(json.images?.length ?? 0, 0, "figure needs no textures");
assert.ok(json.extensionsUsed.includes("EXT_meshopt_compression"), "meshopt is required");
const triangles = json.meshes.reduce((total: number, mesh: { primitives: { indices: number; mode?: number }[] }) =>
  total + mesh.primitives.reduce((sum, primitive) => {
    assert.equal(primitive.mode ?? 4, 4, "only triangle primitives");
    return sum + json.accessors[primitive.indices].count / 3;
  }, 0), 0);
assert.ok(triangles > 25_000 && triangles <= 40_000, `triangle budget: ${triangles}`);
assert.equal(new Set(json.skins.map((skin: { joints: number[] }) => skin.joints.join(","))).size, 1, "one shared skeleton");
assert.equal(json.skins[0].joints.length, 19, "19 bones");
assert.deepEqual(json.animations.map((clip: { name: string }) => clip.name).sort(), ["ArmsRaised", "Relaxed"]);

await MeshoptDecoder.ready;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const start = performance.now();
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
const parseMs = performance.now() - start;
const meshNames: string[] = [];
gltf.scene.traverse((node: { isMesh?: boolean; name: string }) => { if (node.isMesh) meshNames.push(node.name); });
const expectedNames = [...slugs.flatMap((slug) => ["L", "R"].map((side) => `muscle_${slug}_${side}`)), "body_bone", "body_skin", "body_other"];
assert.deepEqual(meshNames.sort(), expectedNames.sort(), "exactly one named mesh per region/side and neutral part");
for (const slug of slugs) {
  const sides = ["L", "R"].map((side) => {
    const name = `muscle_${slug}_${side}`;
    const part = gltf.scene.getObjectByName(name);
    assert.ok(part?.isSkinnedMesh, `${name} must be a skinned mesh`);
    return new Box3().setFromObject(part);
  });
  const left = sides[0]; const right = sides[1];
  // The source anatomy is asymmetric. Flag a missing/misplaced side, allowing
  // up to 4 cm for its natural differences and the decimation step.
  assert.ok(Math.abs(left.min.x + right.max.x) < 0.04, `${slug}: mirrored inner bounds`);
  assert.ok(Math.abs(left.max.x + right.min.x) < 0.04, `${slug}: mirrored outer bounds`);
  assert.ok(Math.abs(left.min.y - right.min.y) < 0.04, `${slug}: lower bounds`);
  assert.ok(Math.abs(left.max.y - right.max.y) < 0.04, `${slug}: upper bounds`);
}
// Sample actual skinned vertices from front, back, sides and quarter views.
// The nearest hit includes neutral meshes, so an occluded muscle cannot pass.
gltf.scene.updateMatrixWorld(true);
const raycaster = new Raycaster();
const direction = new Vector3();
const target = new Vector3();
const visibleParts: string[] = [];
for (const slug of slugs) {
  for (const side of ["L", "R"]) {
    const name = `muscle_${slug}_${side}`;
    const mesh = gltf.scene.getObjectByName(name);
    let visible = false;
    for (let angle = 0; angle < 8 && !visible; angle += 1) {
      direction.set(Math.sin(angle * Math.PI / 4), 0.08, Math.cos(angle * Math.PI / 4)).normalize();
      const step = Math.max(1, Math.floor(mesh.geometry.attributes.position.count / 80));
      for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex += step) {
        mesh.getVertexPosition(vertex, target).applyMatrix4(mesh.matrixWorld);
        raycaster.set(target.clone().addScaledVector(direction, 4), direction.clone().negate());
        if (raycaster.intersectObject(gltf.scene, true)[0]?.object.name === name) { visible = true; break; }
      }
    }
    assert.ok(visible, `${name}: no exposed raycast target from eight views`);
    visibleParts.push(name);
  }
}
const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
assert.ok(size.y > 1.5 && size.y < 2, `height in metres: ${size.y}`);
assert.ok(parseMs < 1000, `parse exceeds one second: ${parseMs.toFixed(1)} ms`);
console.log(JSON.stringify({ path, regions: slugs.length, triangles, bytes: bytes.length,
  parseMs: Math.round(parseMs), raycastTargets: visibleParts.length, heightMetres: Number(size.y.toFixed(3)) }, null, 2));
