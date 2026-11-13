import * as THREE from 'three';

export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vLocalPosition = normalize(position);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uGlowColor;
  uniform vec3 uTwilightColor;
  uniform vec3 uSunDirection;
  uniform float uFresnelPower;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 worldNormal = normalize(vWorldPosition);
    vec3 sunDir = normalize(uSunDirection);

    // Grazing angle rim factor
    float fresnel = pow(1.0 - clamp(abs(dot(vNormal, viewDirection)), 0.0, 1.0), uFresnelPower);

    // Solar incidence: +1 at subsolar point, 0 at terminator, -1 at midnight
    float sunDot = dot(worldNormal, sunDir);

    // Dayside Rayleigh blue scattering
    float dayFactor = smoothstep(-0.18, 0.35, sunDot);

    // Golden-crimson twilight band peaking right along the day-night terminator (sunDot ~ 0.0)
    float twilightBand = exp(-pow((sunDot + 0.04) * 5.5, 2.0)) * smoothstep(-0.35, 0.05, sunDot);

    vec3 scatteredColor = mix(uGlowColor, uTwilightColor, twilightBand * 0.78);
    float alpha = clamp(fresnel * uIntensity * (dayFactor * 0.92 + twilightBand * 0.55 + 0.04), 0.0, 1.0);

    gl_FragColor = vec4(scatteredColor, alpha);
  }
`;

export function createAtmosphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
      uGlowColor: { value: new THREE.Color('#3b9eff') },
      uTwilightColor: { value: new THREE.Color('#ff7b3b') },
      uSunDirection: { value: new THREE.Vector3(5, 2, 5).normalize() },
      uFresnelPower: { value: 3.6 },
      uIntensity: { value: 1.28 },
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}