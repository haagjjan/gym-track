import { FRONT_X_SIGN, REGION_SLUGS } from "./heatmap";
import {
  MAP_LATERAL_RANGE,
  REGION_DECODE_MAX_DISTANCE_SQ,
  REGION_PALETTE
} from "./region-map";
import {
  PROJECTION_EPSILON,
  SIDE_ARM_GATE_MIN_ABS_ZN,
  SIDE_ARM_GATE_MIN_YN,
  SIDE_BLEND_END,
  SIDE_BLEND_START,
  SIDE_COVERAGE_ALPHA,
  SIDE_FOREARM_MIN_ABS_ZN,
  SIDE_FOREARM_REGION_ID,
  SIDE_SHOULDER_MAX_ABS_ZN,
  SIDE_SHOULDER_REGION_ID
} from "./region-projection";

const GLSL_PALETTE_CHECKS = REGION_PALETTE.map(
  ([r, g, b], region) =>
    `  candidate = vec3(${r.toFixed(1)}, ${g.toFixed(1)}, ${b.toFixed(1)}); ` +
    `distance = dot(color - candidate, color - candidate); ` +
    `if (distance < bestDistance) { bestDistance = distance; best = ${region}; }`
).join("\n");

export const MUSCLE_VERTEX_COMMON = [
  "#include <common>",
  "varying vec3 vMusclePos;",
  "varying vec3 vMuscleNrm;"
].join("\n");

export const MUSCLE_VERTEX_WORLD_POSITION = [
  "#include <worldpos_vertex>",
  "vMusclePos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
  "vMuscleNrm = normalize(mat3(modelMatrix) * objectNormal);"
].join("\n");

export const MUSCLE_FRAGMENT_COMMON = [
  "#include <common>",
  "varying vec3 vMusclePos;",
  "varying vec3 vMuscleNrm;",
  "uniform float uFeetY;",
  "uniform float uInvHeight;",
  "uniform float uInvHalf;",
  "uniform sampler2D uMapFront;",
  "uniform sampler2D uMapBack;",
  "uniform sampler2D uMapSide;",
  "uniform float uHidePedestal;",
  `uniform float uHeat[${REGION_SLUGS.length}];`,
  "uniform int uSelected;",
  "uniform float uMode;",
  "uniform float uTargetT;",
  "uniform vec3 uCyanDeep;",
  "uniform vec3 uCyan;",
  "uniform vec3 uViolet;",
  "uniform vec3 uLavender;",
  "uniform vec3 uStage1;",
  "uniform vec3 uStage2;",
  "uniform vec3 uStage3;",
  "uniform vec3 uStage4;",
  "uniform vec3 uStage5;",
  "",
  "// Nearest palette entry, failing closed for anti-aliased color blends.",
  "int decodeRegion(const in vec4 texel) {",
  "  vec3 color = texel.rgb * 255.0;",
  "  vec3 candidate;",
  "  float distance;",
  "  float bestDistance = 1e12;",
  "  int best = 0;",
  GLSL_PALETTE_CHECKS,
  `  return bestDistance <= ${REGION_DECODE_MAX_DISTANCE_SQ.toFixed(1)} ? best : 0;`,
  "}",
  "",
  "int sampleRegion(const in sampler2D map, const in float u, const in float yn) {",
  "  vec2 uv = vec2(clamp(u, 0.0, 1.0), clamp(yn, 0.0, 1.0));",
  "  return decodeRegion(texture2D(map, uv));",
  "}",
  "",
  "vec3 muscleRamp(const in float heat) {",
  "  float stage = ceil(clamp(heat, 0.0, 1.0) * 5.0);",
  "  if (stage < 1.5) return uStage1;",
  "  if (stage < 2.5) return uStage2;",
  "  if (stage < 3.5) return uStage3;",
  "  if (stage < 4.5) return uStage4;",
  "  return uStage5;",
  "}",
  "",
  "vec3 regionDebugColor(const in int region) {",
  "  if (region == 0) return vec3(0.16);",
  "  float h = float(region) * 0.618;",
  "  return 0.55 + 0.45 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67)));",
  "}"
].join("\n");

export const MUSCLE_COLOR_FRAGMENT = [
  "#include <color_fragment>",
  "float mYn = (vMusclePos.y - uFeetY) * uInvHeight;",
  "vec3 mNrm = normalize(vMuscleNrm);",
  "// Hide the fused pedestal while preserving the feet at its contact plate.",
  "if (uHidePedestal > 0.5) {",
  "  float mRadial = length(vMusclePos.xz) * uInvHalf;",
  "  if (mYn < 0.033) discard;",
  "  if (mYn < 0.047 && (mRadial > 0.6 || mNrm.y > 0.55)) discard;",
  "  if (mYn < 0.32 && mRadial > 1.05) discard;",
  "}",
  "float mXn = vMusclePos.x * uInvHalf;",
  "float mZn = vMusclePos.z * uInvHalf;",
  `float mRange = ${MAP_LATERAL_RANGE.toFixed(4)};`,
  "int mRegionF = sampleRegion(uMapFront, (mRange - mZn) / (2.0 * mRange), mYn);",
  "int mRegionB = sampleRegion(uMapBack, (mZn + mRange) / (2.0 * mRange), mYn);",
  `float mFrontFacing = mNrm.x * ${FRONT_X_SIGN.toFixed(1)};`,
  "float mFrontMix = smoothstep(-0.18, 0.18, mFrontFacing);",
  "float mBaseHeat = mix(uHeat[mRegionB], uHeat[mRegionF], mFrontMix);",
  "int mBaseRegion = mFrontFacing >= 0.0 ? mRegionF : mRegionB;",
  "float mBaseSelF = (mRegionF != 0 && mRegionF == uSelected) ? 1.0 : 0.0;",
  "float mBaseSelB = (mRegionB != 0 && mRegionB == uSelected) ? 1.0 : 0.0;",
  "float mBaseSel = mix(mBaseSelB, mBaseSelF, mFrontMix);",
  "",
  "// The +z-authored side map mirrors for -z-facing fragments. Its alpha is",
  "// sparse coverage: transparent falls back; opaque black explicitly clears.",
  "float mSideU = mNrm.z >= 0.0",
  "  ? (mXn + mRange) / (2.0 * mRange)",
  "  : (mRange - mXn) / (2.0 * mRange);",
  "vec2 mSideUv = vec2(clamp(mSideU, 0.0, 1.0), clamp(mYn, 0.0, 1.0));",
  "vec4 mSideTexel = texture2D(uMapSide, mSideUv);",
  "int mSideRegion = decodeRegion(mSideTexel);",
  "// Above the shoulder line the flexed arms overlap the head in side-map",
  "// coordinates, so upper-body overrides must also be laterally arm-like.",
  `float mAbsZn = abs(mZn);`,
  `bool mSideGate = mYn < ${SIDE_ARM_GATE_MIN_YN.toFixed(4)} || mAbsZn >= ${SIDE_ARM_GATE_MIN_ABS_ZN.toFixed(4)};`,
  `if (mSideRegion == ${SIDE_SHOULDER_REGION_ID}) mSideGate = mSideGate && mAbsZn <= ${SIDE_SHOULDER_MAX_ABS_ZN.toFixed(4)};`,
  `if (mSideRegion == ${SIDE_FOREARM_REGION_ID}) mSideGate = mSideGate && mAbsZn >= ${SIDE_FOREARM_MIN_ABS_ZN.toFixed(4)};`,
  `bool mSideCovered = mSideTexel.a > ${SIDE_COVERAGE_ALPHA.toFixed(4)} && mSideGate;`,
  "float mHorizontal = abs(mNrm.x) + abs(mNrm.z);",
  `float mSideDominance = abs(mNrm.z) / max(mHorizontal, ${PROJECTION_EPSILON.toFixed(6)});`,
  `float mProjectionMix = mSideCovered ? smoothstep(${SIDE_BLEND_START.toFixed(4)}, ${SIDE_BLEND_END.toFixed(4)}, mSideDominance) : 0.0;`,
  "bool mUseSide = mSideCovered && abs(mNrm.z) > abs(mNrm.x);",
  "int muscleRegion = mUseSide ? mSideRegion : mBaseRegion;",
  "float muscleHeat = mix(mBaseHeat, uHeat[mSideRegion], mProjectionMix);",
  "float mSideSel = (mSideRegion != 0 && mSideRegion == uSelected) ? 1.0 : 0.0;",
  "float muscleSel = mix(mBaseSel, mSideSel, mProjectionMix);",
  "float muscleSelEdge = clamp(fwidth(muscleSel) * 1.5, 0.0, 1.0);",
  "if (uMode > 1.5) {",
  "  diffuseColor.rgb = regionDebugColor(muscleRegion);",
  "} else if (uMode > 0.5) {",
  "  diffuseColor.rgb = mix(diffuseColor.rgb, uCyan, muscleHeat * 0.5);",
  "  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), muscleSel * 0.14);",
  "}"
].join("\n");

export const MUSCLE_EMISSIVE_FRAGMENT = [
  "#include <emissivemap_fragment>",
  "if (uMode < 0.5) {",
  "  totalEmissiveRadiance += muscleRamp(muscleHeat) * (0.12 + 0.9 * muscleHeat) * step(0.004, muscleHeat);",
  "  vec3 muscleViewDir = normalize(vViewPosition);",
  "  float muscleFresnel = pow(1.0 - saturate(dot(muscleViewDir, normal)), 2.6);",
  "  totalEmissiveRadiance += uLavender * (muscleSelEdge * 1.5 + muscleFresnel * 0.5 * muscleSel);",
  "} else if (uMode < 1.5) {",
  "  totalEmissiveRadiance += uLavender * muscleSelEdge * 0.85;",
  "}"
].join("\n");
