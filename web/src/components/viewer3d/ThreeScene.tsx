"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface SceneObject {
  id: string;
  type: "box" | "cylinder" | "sphere" | "wing";
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color?: string;
}

interface ThreeSceneProps {
  objects?: SceneObject[];
  backgroundColor?: string;
}

function createMesh(obj: SceneObject): THREE.Mesh {
  const color = obj.color ?? "#38bdf8";
  let geometry: THREE.BufferGeometry;

  switch (obj.type) {
    case "box":
      geometry = new THREE.BoxGeometry(1, 1, 1);
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(0.5, 32, 32);
      break;
    case "wing": {
      const shape = new THREE.Shape();
      shape.moveTo(-1, 0);
      shape.quadraticCurveTo(-0.5, 0.4, 0, 0);
      shape.lineTo(1, 0);
      shape.lineTo(1, -0.05);
      shape.lineTo(-1, -0.05);
      shape.closePath();
      const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelSegments: 5 };
      geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      break;
    }
    default:
      geometry = new THREE.BoxGeometry(1, 1, 1);
  }

  // Enhanced PBR Physical Material (Three.js Materials Skill)
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.25,
    metalness: 0.15,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...obj.position);
  if (obj.rotation) mesh.rotation.set(...obj.rotation);
  if (obj.scale) mesh.scale.set(...obj.scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export default function ThreeScene({ objects = [], backgroundColor = "#0f172a" }: ThreeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    objectGroup: THREE.Group;
    frameId: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(3, 2, 5);
    camera.lookAt(0, 0, 0);

    // Renderer setup with ACESFilmic Tone Mapping (Three.js Fundamentals & Lighting Skills)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.5);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    const grid = new THREE.GridHelper(10, 10, "#475569", "#334155");
    grid.position.y = -0.5;
    scene.add(grid);

    const objectGroup = new THREE.Group();
    scene.add(objectGroup);

    const clock = new THREE.Clock();

    function animate() {
      const delta = clock.getDelta();
      controls.update();

      // Slow procedural rotation for objects (Three.js Animation Skill)
      objectGroup.children.forEach((child) => {
        child.rotation.y += delta * 0.2;
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    let frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    sceneRef.current = { scene, camera, renderer, controls, objectGroup, frameId };

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [backgroundColor]);

  useEffect(() => {
    const group = sceneRef.current?.objectGroup;
    if (!group) return;
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    objects.forEach((obj) => {
      group.add(createMesh(obj));
    });
  }, [objects]);

  return <div ref={containerRef} className="w-full h-full" />;
}
