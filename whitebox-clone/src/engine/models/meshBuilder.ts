import * as THREE from "three";

export function createChassisMesh(width: number, height: number, depth: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 });
  return new THREE.Mesh(geometry, material);
}

export function createWheelMesh(radius: number, thickness: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radius, radius, thickness, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.8 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}
