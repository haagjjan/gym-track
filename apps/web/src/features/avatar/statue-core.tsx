import * as THREE from "three";

export const RIM_CYAN = "#00dbe7";
export const PULSE_GREEN = "#51fb37";

export interface RimUniforms {
  uRimColor: { value: THREE.Color };
  uPulseColor: { value: THREE.Color };
  uRimIntensity: { value: number };
  uRimPower: { value: number };
  uPulse: { value: number };
}

export function createStatueMaterial(): {
  material: THREE.MeshStandardMaterial;
  uniforms: RimUniforms;
} {
  const uniforms: RimUniforms = {
    uRimColor: { value: new THREE.Color(RIM_CYAN) },
    uPulseColor: { value: new THREE.Color(PULSE_GREEN) },
    uRimIntensity: { value: 0.9 },
    uRimPower: { value: 3.4 },
    uPulse: { value: 0 }
  };
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#171a20"),
    metalness: 0,
    roughness: 0.7
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
