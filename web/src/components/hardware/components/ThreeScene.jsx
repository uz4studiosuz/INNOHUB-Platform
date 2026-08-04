import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

// Post-processing & Environments
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';

import { IconArrowsMove as Move, IconRotateClockwise2 as RotateCw, IconMaximize as Maximize2, IconRotate as RotateCcw, IconAdjustments as Sliders, IconTrash as Trash2, IconWorld as Globe, IconMagnet as Magnet, IconVideo, IconAlertTriangle, IconFlag, IconRadar2, IconClock, IconRefresh, IconPackage } from '@tabler/icons-react';
import { buildArena, LDU_TO_CM } from '../simulation/arenaBuilder';
import { createRobotState, stepRobot, keyRole, tryGrab, releaseHeld } from '../simulation/robotDriver';
import { getCatalogEntry, getMaterialConfig } from '../data/catalog';
import { findSnapTarget } from '../utils/snappingSystem';
import { loadLDrawPart, applyColorToLDrawGroup } from '../library/ldrawPartsCache';
import { exportToLdr } from '../utils/ldrConverter';
import { checkIs3mfModelUncolored } from '../utils/partThumbnails';
import {
  createGearGeometry,
  createSpringGeometry,
  createAxleGeometry,
  createFrameBeamGeometry,
  createServoMotorMesh,
  createStepperMotorMesh,
  createLegoBeamGeometry,
  createLegoGearGeometry,
  createLegoAxleGeometry,
  createLegoDistanceSensorMesh,
  createLegoPinGeometry,
  createLegoBushGeometry,
  createLegoConnectorGeometry,
  createLegoTireGeometry,
  createLegoRimGeometry,
  createLegoPanelGeometry,
  createLegoLBeamGeometry,
  createRobotChassisGeometry,
  createCasterMesh,
  createArmSegmentGeometry,
  createBucketGeometry,
} from '../utils/proceduralGeometries';

const TARGET_SIZE = 50;
const LOCAL_X_AXIS = new THREE.Vector3(1, 0, 0);

// Elektronika modellari (.3mf) millimetrda keladi, sahna esa LDraw birligida
// ishlaydi (1 LDU = 0.4 mm), chunki LEGO detallari shu birlikda. Shuning uchun
// mm ni 2.5 ga ko'paytiramiz.
//
// DIQQAT: bu modellar TARGET_SIZE bilan bir xil o'lchamga keltirilmaydi. Yig'ish
// platformasida detallarning bir-biriga nisbatan haqiqiy kattaligi muhim —
// hammasini bir o'lchamga keltirsa, 21 mm'lik MPU6050 va 78 mm'lik batareya
// boksi ekranda teng bo'lib qoladi va yig'ish ma'nosini yo'qotadi.
const MM_TO_LDU = 2.5;

import { useI18n } from '../i18n/index.jsx';

export default function ThreeScene({
  objects,
  selectedId,
  isSimulating = false,
  simState = {},
  /** Sinov poligoni: 'slalom' | 'maze' | 'warehouse' */
  /** 'auto' — kod bo'yicha o'zi yuradi, 'manual' — WASD bilan boshqariladi */
  simDriveMode = 'auto',
  /** Kodda to'siq "yaqin" deb hisoblanadigan masofa (sm) */
  simStopCm = 15,
  /** Har ~200 ms da sinov ko'rsatkichlarini tashqariga uzatadi */
  onTelemetry,
  onSelect,
  onRemove,
  onUpdate,
  onUpdateParams,
  onDropPart,
  onExportLdrReady
}) {
  const { t } = useI18n();

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const ldrawRootGroupRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const outlinePassRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const objectsMapRef = useRef(new Map()); // id -> mesh/group
  const requestRenderRef = useRef(null); // sahnani qayta chizishni so'rash (render on demand)
  const requestShadowUpdateRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const dropPreviewRef = useRef(null);
  const [dropActive, setDropActive] = useState(false);

  // Visual mode state (Aylantirish - rotate, Surish - translate, Masshtab - scale)
  const [transformMode, setTransformMode] = useState('rotate');
  const [transformSpace, setTransformSpace] = useState('local');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const isDraggingRef = useRef(false);

  const snapEnabledRef = useRef(snapEnabled);
  const objectsRef = useRef(objects);
  const snapGroupRef = useRef(null);

  const isSimulatingRef = useRef(isSimulating);
  const simStateRef = useRef(simState);

  // ── Sinov xonasi (simulation room) ──
  // robotBody butun yig'mani bitta jism sifatida harakatlantiradi; detallar
  // esa har doimgidek o'z lokal koordinatalarida qoladi, shuning uchun
  // simulyatsiya tugagach hech narsani "orqaga hisoblash" kerak emas.
  const robotBodyRef = useRef(null);
  const robotAlignRef = useRef(null);
  const robotCenterRef = useRef(null);
  const partsRootRef = useRef(null);
  const groundRef = useRef(null);
  const gridRef = useRef(null);
  const arenaRef = useRef(null);
  const arenaClockRef = useRef(0);
  const robotStateRef = useRef(null);
  const robotRadiusRef = useRef(120);
  const sensorYRef = useRef(60);
  const wheelBaseRotationRef = useRef(new Map());
  const driveKeysRef = useRef({ forward: false, back: false, left: false, right: false });
  const simDriveModeRef = useRef(simDriveMode);
  const simStopCmRef = useRef(simStopCm);
  const onTelemetryRef = useRef(onTelemetry);
  const telemetryClockRef = useRef(0);
  const simCameraModeRef = useRef('chase');
  const [simCameraMode, setSimCameraMode] = useState('chase');
  const [hud, setHud] = useState(null);

  const onSelectRef = useRef(onSelect);
  const onRemoveRef = useRef(onRemove);
  const onUpdateRef = useRef(onUpdate);
  const selectedIdRef = useRef(selectedId);
  const cameraTweenRef = useRef(null);
  const focusSceneRef = useRef(null);
  const frameSceneRef = useRef(null);
  const assemblyFocusTimerRef = useRef(null);


  useEffect(() => { snapEnabledRef.current = snapEnabled; }, [snapEnabled]);
  useEffect(() => { objectsRef.current = objects; }, [objects]);
  useEffect(() => { isSimulatingRef.current = isSimulating; }, [isSimulating]);
  useEffect(() => { simStateRef.current = simState; }, [simState]);
  useEffect(() => { simDriveModeRef.current = simDriveMode; }, [simDriveMode]);
  useEffect(() => { simStopCmRef.current = simStopCm; }, [simStopCm]);
  useEffect(() => { onTelemetryRef.current = onTelemetry; }, [onTelemetry]);
  useEffect(() => { simCameraModeRef.current = simCameraMode; }, [simCameraMode]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onRemoveRef.current = onRemove; }, [onRemove]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const clearDropPreview = () => {
    const preview = dropPreviewRef.current;
    if (preview && sceneRef.current) {
      sceneRef.current.remove(preview);
      preview.geometry.dispose();
      preview.material.dispose();
    }
    dropPreviewRef.current = null;
    setDropActive(false);
    requestRenderRef.current?.();
  };

  const updateDropPreview = (clientX, clientY) => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!camera || !renderer || !scene) return null;

    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycasterRef.current.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (!raycasterRef.current.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;

    hit.x = Math.round(hit.x / 10) * 10;
    hit.z = Math.round(hit.z / 10) * 10;
    if (!dropPreviewRef.current) {
      const geometry = new THREE.BoxGeometry(30, 25, 30);
      const material = new THREE.MeshStandardMaterial({
        color: 0x2f80ed,
        transparent: true,
        opacity: 0.42,
        roughness: 0.55,
        metalness: 0.08,
        depthWrite: false,
      });
      dropPreviewRef.current = new THREE.Mesh(geometry, material);
      dropPreviewRef.current.renderOrder = 20;
      scene.add(dropPreviewRef.current);
    }
    dropPreviewRef.current.position.set(hit.x, 12.5, hit.z);
    setDropActive(true);
    requestRenderRef.current?.();
    return [hit.x, 25, hit.z];
  };

  const handleCatalogDragOver = (event) => {
    if (!event.dataTransfer.types.includes('application/x-innohub-part')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    updateDropPreview(event.clientX, event.clientY);
  };

  const handleCatalogDrop = (event) => {
    const encoded = event.dataTransfer.getData('application/x-innohub-part');
    if (!encoded) return;
    event.preventDefault();
    const position = updateDropPreview(event.clientX, event.clientY);
    try {
      const payload = JSON.parse(encoded);
      if (position) onDropPart?.(payload, position);
    } finally {
      clearDropPreview();
    }
  };

  useEffect(() => {
    if (onExportLdrReady) {
      onExportLdrReady(() => {
        exportToLdr(objects, objectsMapRef.current);
      });
    }
  }, [objects, onExportLdrReady]);

  // Snap visual marker generator
  const updateSnapIndicators = (snapResult) => {
    const group = snapGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    if (!snapResult || !snapResult.snapped) return;

    const { targetConn } = snapResult;

    // Glowing green snap ring indicator
    const ringGeo = new THREE.RingGeometry(2, 5, 24);
    const greenMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ringMesh = new THREE.Mesh(ringGeo, greenMat);
    ringMesh.position.copy(targetConn.worldPos);
    ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), targetConn.worldDir);

    const sphereGeo = new THREE.SphereGeometry(2.5, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    sphereMesh.position.copy(targetConn.worldPos);

    group.add(ringMesh);
    group.add(sphereMesh);

    // Yashil indikator paydo bo'lganda ham qayta chizish kerak — aks holda
    // sichqoncha to'xtab qolgan paytda indikator ko'rinmaydi.
    requestRenderRef.current?.();
  };

  // Mode almashtirish (Surish, Aylantirish, Masshtab)
  const handleModeChange = (mode) => {
    setTransformMode(mode);
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(mode);
    }
  };

  // Space almashtirish (Local / World)
  const handleSpaceToggle = () => {
    const nextSpace = transformSpace === 'local' ? 'world' : 'local';
    setTransformSpace(nextSpace);
    if (transformControlsRef.current) {
      transformControlsRef.current.setSpace(nextSpace);
    }
  };

  // Tezkor burchakka burish (+90 deg / -90 deg)
  const handleQuickRotate = (axis, angleDeg) => {
    if (!selectedId) return;
    const obj3d = objectsMapRef.current.get(selectedId);
    if (obj3d && obj3d !== 'loading') {
      const rad = THREE.MathUtils.degToRad(angleDeg);
      if (axis === 'y') obj3d.rotation.y += rad;
      if (axis === 'x') obj3d.rotation.x += rad;
      if (axis === 'z') obj3d.rotation.z += rad;

      obj3d.updateMatrixWorld(true);

      if (onUpdateRef.current) {
        const pos = [obj3d.position.x, obj3d.position.y, obj3d.position.z];
        const rot = [obj3d.rotation.x, obj3d.rotation.y, obj3d.rotation.z];
        onUpdateRef.current(selectedId, pos, rot);
      }
    }
  };

  // Initialize Three.js scene (YORUG' VA TOZA STUDIO REJIMI)
  useEffect(() => {
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene - Qorong'u, shinam va professional studio foni (#0f172a / #0f1115)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    scene.fog = new THREE.Fog('#0f172a', 600, 3000);
    sceneRef.current = scene;

    // Robot tanasi — yig'ilgan detallarni o'z ichiga oladi.
    //
    // Yig'ish rejimida bu guruh butunlay qimirlamaydi (position/rotation nol),
    // ya'ni detallar sahnaga to'g'ridan-to'g'ri qo'shilgandagidek turadi.
    // Simulyatsiya boshlanganda esa robotni surish uchun faqat shu bitta
    // guruhni harakatlantirish kifoya — detallarning o'z transformlariga
    // tegilmaydi, shuning uchun sinovdan chiqqach yig'ma buzilmaydi.
    // Uch qavat, har biri bitta vazifani bajaradi — shunda hech qaysi
    // burilish boshqasining hisobini buzmaydi:
    //   robotBody   — poligondagi joylashuv va yo'nalish (faqat simulyatsiyada)
    //   robotAlign  — yig'ma "oldi" +X ga qaramasa, uni burib qo'yadi
    //   robotCenter — yig'ma markazini koordinata boshiga suradi, shunda
    //                 robot o'z markazi atrofida buriladi, sahna markazi emas
    const robotBody = new THREE.Group();
    robotBody.name = 'robot-body';
    scene.add(robotBody);
    robotBodyRef.current = robotBody;

    const robotAlign = new THREE.Group();
    robotAlign.name = 'robot-align';
    robotBody.add(robotAlign);
    robotAlignRef.current = robotAlign;

    const robotCenter = new THREE.Group();
    robotCenter.name = 'robot-center';
    robotAlign.add(robotCenter);
    robotCenterRef.current = robotCenter;

    const partsRoot = new THREE.Group();
    partsRoot.name = 'robot-parts';
    partsRoot.userData.isRoot = true;
    robotCenter.add(partsRoot);
    partsRootRef.current = partsRoot;

    // LDraw Root Group (+Y = DOWN handling: rotation.x = Math.PI)
    const ldrawRootGroup = new THREE.Group();
    ldrawRootGroup.rotation.x = Math.PI;
    ldrawRootGroup.userData.isRoot = true;
    robotCenter.add(ldrawRootGroup);
    ldrawRootGroupRef.current = ldrawRootGroup;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(150, 140, 220);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Sahna scene.environment (studiya IBL) + 4 ta yorug'lik bilan yoritiladi,
    // shuning uchun ekspozitsiya 1 dan past bo'lishi kerak - aks holda och
    // sirtlar toza oqqa to'yinadi va nuans yo'qoladi.
    renderer.toneMappingExposure = 0.85;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Studio Environment Map for realistic PBR reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment(renderer);
    scene.environment = pmremGenerator.fromScene(roomEnv).texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 4. Studio yoritilishi.
    //
    // Yorug'lik budjeti: avval tekis to'ldiruvga 0.90 (ambient 0.40 + hemi 0.50)
    // sarflanardi, ustiga scene.environment ham har tomondan yoritadi. Natijada
    // soya yuvilib, hamma sirt bir xil qiymatda turardi - sahna "yorug', lekin
    // tekis" ko'rinardi. To'ldiruv kamaytirildi, asosiy yorug'lik ko'tarildi:
    // kontrast shundan paydo bo'ladi, umumiy yorqinlikdan emas.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    // Rangi neytral: avval ko'k (0x38bdf8) edi va oq detallarga ko'k tus berardi.
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x64748b, 0.3);
    hemiLight.position.set(0, 300, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(150, 250, 150);
    keyLight.castShadow = true;
    // Soya kamerasi ortogonal. Avval 800x800 birlik maydonni qoplardi va
    // 4096 px shu maydonga cho'zilib, soya xiralashardi. Sahna ~150-500 birlik,
    // shuning uchun frustum kichraytirildi: bir piksel kamroq maydonni qoplaydi,
    // soya keskinroq chiqadi va 2048 px yetarli bo'ladi (tezlik ham yaxshilanadi).
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.radius = 2;
    // ±560 LDU = ±224 mm. Ish maydoni kengaytirilgach (grid 2000 LDU) yig'ma
    // ham markazdan uzoqroqqa qo'yilishi mumkin, shuning uchun soya frustumi
    // ham kengaydi — aks holda chetdagi detal soya bermay qolardi.
    keyLight.shadow.camera.left = -560;
    keyLight.shadow.camera.right = 560;
    keyLight.shadow.camera.top = 560;
    keyLight.shadow.camera.bottom = -560;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 1400;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc3d8f2, 0.25);
    fillLight.position.set(-150, 120, -100);
    scene.add(fillLight);

    // 5. Ground Plane & Grid - Shaffof va shinam to'q zamin
    const groundGeometry = new THREE.PlaneGeometry(6000, 6000);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.7,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);
    groundRef.current = ground;

    // Ish maydoni 800 -> 2000 LDU (320 -> 800 mm). Katta yig'malar va bir
    // nechta robot bir vaqtda joylashadigan bo'ldi; katak qadami 10 LDU
    // snap qadamining karrasi bo'lib qoladi.
    const gridHelper = new THREE.GridHelper(2000, 100, '#3b82f6', '#334155');
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // 6. Orbit Controls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.08;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
    orbitControls.minDistance = 20;
    // Ish maydoni kengaygach kamera ham uzoqroqqa chiqa olishi kerak, aks
    // holda butun sahnani bir kadrga sig'dirib bo'lmaydi.
    orbitControls.maxDistance = 2400;
    orbitControls.target.set(0, 20, 0);
    orbitControls.screenSpacePanning = true;
    orbitControlsRef.current = orbitControls;

    /** Sahnadagi barcha ko'rinadigan detallarning chegara qutisi. */
    const measureScene = () => {
      const bounds = new THREE.Box3();
      let hasParts = false;
      objectsMapRef.current.forEach((part) => {
        if (!part || part === 'loading' || !part.visible) return;
        part.updateMatrixWorld(true);
        bounds.expandByObject(part);
        hasParts = true;
      });
      return hasParts && !bounds.isEmpty() ? bounds : null;
    };

    /**
     * Kamerani sahnaga qaratadi.
     *
     * @param direction  Qaysi tomondan qarash (normallanmagan bo'lsa ham bo'ladi).
     *                   null bo'lsa hozirgi qarash burchagi saqlanadi — "sig'dir"
     *                   tugmasi shu bilan ishlaydi.
     * @param options.duration  Animatsiya davomiyligi (ms). Yig'ish vaqtida
     *                   qisqaroq: har detalda 900 ms cho'zilsa, kamera detal
     *                   qo'shilishidan orqada qolib ketadi.
     */
    const frameScene = (direction = null, { duration = 850, padding = 1.35 } = {}) => {
      const bounds = measureScene();
      // Sahna bo'sh bo'lsa ham "reset" ishlashi kerak: o'shanda ish maydonining
      // o'ziga qaraymiz, aks holda tugma hech nima qilmagandek tuyuladi.
      const size = bounds ? bounds.getSize(new THREE.Vector3()) : new THREE.Vector3(300, 120, 300);
      const center = bounds ? bounds.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, 20, 0);
      center.y = Math.max(18, center.y * 0.82);

      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const fitHeight = size.y / (2 * Math.tan(verticalFov / 2));
      const fitWidth = size.x / (2 * Math.tan(verticalFov / 2) * camera.aspect);
      const distance = Math.max(fitHeight, fitWidth, size.z * 1.25, 95) * padding;

      const dir = direction
        ? direction.clone().normalize()
        : camera.position.clone().sub(orbitControls.target).normalize();
      if (dir.lengthSq() < 0.01) dir.set(0.7, 0.45, 1).normalize();

      cameraTweenRef.current = {
        startedAt: performance.now(),
        duration,
        fromPosition: camera.position.clone(),
        toPosition: center.clone().add(dir.multiplyScalar(Math.min(distance, 1800))),
        fromTarget: orbitControls.target.clone(),
        toTarget: center,
      };
      requestRenderRef.current?.();
    };

    frameSceneRef.current = frameScene;
    // Eski nom bilan chaqiriladigan joylar (yig'ish tugagandagi fokus) uchun.
    focusSceneRef.current = () => frameScene(null);

    // Snap visual indicators container group
    const snapGroup = new THREE.Group();
    scene.add(snapGroup);
    snapGroupRef.current = snapGroup;

    // 7. Transform Controls — Detallarni Sichqoncha bilan X, Y, Z o'qlarida silliq aylantirish va surish
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setMode('rotate');
    transformControls.setSpace('local');
    transformControls.setSize(1.2); // Sezilarli katta va aniq gizmo halqalari

    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
      isDraggingRef.current = event.value;
      if (!event.value) {
        updateSnapIndicators(null);
      }
    });

    transformControls.addEventListener('objectChange', () => {
      const activeObj = transformControls.object;
      if (activeObj && activeObj.userData && activeObj.userData.id && onUpdateRef.current) {
        const activeId = activeObj.userData.id;
        const activeData = objectsRef.current.find(o => o.id === activeId);

        if (snapEnabledRef.current && isDraggingRef.current) {
          // Grid snapping: 10 LDU translation, 45° (PI/4) rotation
          activeObj.position.x = Math.round(activeObj.position.x / 10) * 10;
          activeObj.position.y = Math.round(activeObj.position.y / 10) * 10;
          activeObj.position.z = Math.round(activeObj.position.z / 10) * 10;

          const stepRot = Math.PI / 4; // 45 deg
          activeObj.rotation.x = Math.round(activeObj.rotation.x / stepRot) * stepRot;
          activeObj.rotation.y = Math.round(activeObj.rotation.y / stepRot) * stepRot;
          activeObj.rotation.z = Math.round(activeObj.rotation.z / stepRot) * stepRot;
        }

        let snapResult = null;
        if (snapEnabledRef.current && activeData && isDraggingRef.current) {
          snapResult = findSnapTarget(
            activeObj,
            activeData,
            objectsMapRef.current,
            objectsRef.current,
            15
          );

          if (snapResult.snapped) {
            activeObj.position.set(...snapResult.position);
            activeObj.rotation.set(...snapResult.rotation);
            activeObj.updateMatrixWorld(true);
          }
        }

        updateSnapIndicators(snapResult);

        const pos = [activeObj.position.x, activeObj.position.y, activeObj.position.z];
        const rot = [activeObj.rotation.x, activeObj.rotation.y, activeObj.rotation.z];
        onUpdateRef.current(activeId, pos, rot, snapResult);
      }
    });

    // MUHIM: three r0.169+ da TransformControls Object3D emas,
    // Gizmo (surish/aylantirish/masshtab strelkalari) getHelper() orqali qo'shiladi.
    const transformGizmo = transformControls.getHelper();
    scene.add(transformGizmo);
    transformControlsRef.current = transformControls;

    // 8. Post-Processing & Outline
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const outlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      scene,
      camera
    );
    outlinePass.edgeStrength = 4;
    outlinePass.edgeGlow = 0.18;
    outlinePass.edgeThickness = 2;
    // A pulsing outline re-rendered its off-screen pass during RUN and looked
    // like object flicker on lower-end GPUs. Keep selection feedback steady.
    outlinePass.pulsePeriod = 0;
    outlinePass.visibleEdgeColor.set('#2563eb');
    outlinePass.hiddenEdgeColor.set('#1d4ed8');
    composer.addPass(outlinePass);
    outlinePassRef.current = outlinePass;

    composerRef.current = composer;

    // 3D Click Selection
    const handleClick = (event) => {
      if (isDraggingRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const interactiveObjects = [];
      objectsMapRef.current.forEach((obj3d) => {
        if (obj3d && obj3d !== 'loading') {
          if (obj3d.isMesh) {
            interactiveObjects.push(obj3d);
          } else if (obj3d.isGroup) {
            obj3d.traverse((child) => {
              if (child.isMesh) interactiveObjects.push(child);
            });
          }
        }
      });

      const intersects = raycasterRef.current.intersectObjects(interactiveObjects, false);

      if (intersects.length > 0) {
        let topObj = intersects[0].object;
        // Detallar robot tanasi ostidagi guruhlarda turadi, shuning uchun
        // yuqoriga chiqish shu ildiz guruhlarda to'xtashi kerak.
        while (topObj.parent && !topObj.userData?.id && !topObj.parent.userData?.isRoot && topObj.parent !== scene) {
          topObj = topObj.parent;
        }
        if (topObj.userData && topObj.userData.id) {
          onSelectRef.current(topObj.userData.id);
        }
      } else {
        onSelectRef.current(null);
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Keyboard Shortcuts
    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') return;
      // Sinov paytida W/A/S/D robotni haydaydi — ular bir vaqtning o'zida
      // gizmo rejimini ham almashtirsa, boshqaruv umuman ishlamay qoladi.
      if (isSimulatingRef.current) return;

      switch (event.key.toLowerCase()) {
        case 'g':
          handleModeChange('translate');
          break;
        case 'r':
          handleModeChange('rotate');
          break;
        case 's':
          if (!event.ctrlKey && !event.metaKey) {
            handleModeChange('scale');
          }
          break;
        case 'delete':
        case 'backspace':
          if (selectedIdRef.current && onRemoveRef.current) {
            onRemoveRef.current(selectedIdRef.current);
          }
          break;
        case 'm':
          setSnapEnabled(prev => !prev);
          break;
        case 'escape':
          onSelectRef.current(null);
          transformControls.detach();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Hover cursor
    const handleMouseMove = (event) => {
      if (isDraggingRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(new THREE.Vector2(mx, my), camera);

      const interactiveObjects = [];
      objectsMapRef.current.forEach((obj3d) => {
        if (obj3d && obj3d !== 'loading') {
          if (obj3d.isMesh) {
            interactiveObjects.push(obj3d);
          } else if (obj3d.isGroup) {
            obj3d.traverse((child) => {
              if (child.isMesh) interactiveObjects.push(child);
            });
          }
        }
      });

      const intersects = raycasterRef.current.intersectObjects(interactiveObjects, false);
      renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);

    let needsRender = true;

    /**
     * Kadrni qayta chizishni so'raydi — soyaga tegmasdan.
     *
     * Soya kartasi 2048x2048 va uni qayta chizish butun sahnani yana bir marta
     * render qilish demakdir. Avval har qanday `requestRender` soyani ham
     * "iflos" deb belgilardi, shu jumladan OrbitControls ning har bir
     * `change` hodisasi — ya'ni sichqonchani surganda har kadrda soya
     * qaytadan hisoblanardi. Kamera harakati esa soyani umuman
     * o'zgartirmaydi: soya faqat jismlar yoki yorug'lik siljiganda o'zgaradi.
     * Avtomatik yig'ish paytida (u har kadrda render qiladi) kamerani
     * qimirlatish shu sababdan sezilarli lag berardi.
     */
    const requestRender = () => {
      needsRender = true;
    };

    /** Jismlar siljigan/qo'shilgan/o'chirilgan payt — soya ham yangilanadi. */
    const requestShadowUpdate = () => {
      needsRender = true;
      if (rendererRef.current) {
        rendererRef.current.shadowMap.needsUpdate = true;
      }
    };

    orbitControls.addEventListener('change', requestRender);
    transformControls.addEventListener('change', requestRender);
    transformControls.addEventListener('objectChange', requestShadowUpdate);

    // Modellar asinxron yuklanadi (3MF, GLTF, STL, LDraw) va yuklanish tugaganda
    // sahna o'zgaradi — lekin bu hodisa emas, shuning uchun requestRender ni
    // boshqa useEffect ichidan ham chaqirish kerak. Ref orqali tashqariga
    // chiqaramiz, aks holda detal qo'shilganda u kamerani harakatlantirmaguncha
    // ekranda paydo bo'lmaydi.
    requestRenderRef.current = requestShadowUpdate;
    requestShadowUpdateRef.current = requestShadowUpdate;

    let animationFrameId;

    // Simulyatsiya uchun bir marta yaratiladigan yordamchilar. Har kadrda
    // yangi Raycaster/Vector3 yaratish sekundiga yuzlab ob'ekt demakdir.
    const simRaycaster = new THREE.Raycaster();
    let lastSimTime = performance.now();
    const camDesired = new THREE.Vector3();
    const camLook = new THREE.Vector3();

    /** Sinov paytidagi kamera. 'orbit' da kamera foydalanuvchida qoladi. */
    const applySimulationCamera = (state, delta) => {
      const mode = simCameraModeRef.current;
      if (mode === 'orbit') return;
      const blend = Math.min(1, delta * 6);

      if (mode === 'top') {
        camDesired.set(state.x, 2400, state.z + 260);
        camLook.set(state.x, 0, state.z);
      } else {
        // Robot ortidan ergashuvchi kamera: yo'nalish bo'yicha orqaga va tepaga.
        camDesired.set(
          state.x - Math.cos(state.heading) * 620,
          390,
          state.z + Math.sin(state.heading) * 620,
        );
        camLook.set(state.x, 55, state.z);
      }

      camera.position.lerp(camDesired, blend);
      orbitControls.target.lerp(camLook, blend);
      camera.lookAt(orbitControls.target);
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const hasAssemblyMotion = Array.from(objectsMapRef.current.values()).some(
        (part) => part && part !== 'loading' && part.userData?.assemblyAnimation,
      );
      const continuous = isSimulatingRef.current || isDraggingRef.current || hasAssemblyMotion || !!cameraTweenRef.current;
      if (!needsRender && !continuous) return;
      needsRender = false;

      // Soya faqat jismlar harakatlanayotganda yangilanadi. Kamera tweeni
      // bunga kirmaydi — u jismlarni qimirlatmaydi.
      if (hasAssemblyMotion || isSimulatingRef.current || isDraggingRef.current) {
        renderer.shadowMap.needsUpdate = true;
      }

      // Ergashuvchi kamera rejimida kamerani applySimulationCamera boshqaradi.
      // OrbitControls.update() ni ham chaqirsak, ikkalasi har kadrda bir-birini
      // qaytarib, kamera titrab turadi.
      const cameraLocked = isSimulatingRef.current && arenaRef.current && simCameraModeRef.current !== 'orbit';
      if (!cameraLocked) orbitControls.update();

      const cameraTween = cameraTweenRef.current;
      if (cameraTween) {
        const raw = Math.min(1, (performance.now() - cameraTween.startedAt) / cameraTween.duration);
        const eased = 1 - Math.pow(1 - raw, 3);
        camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
        orbitControls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
        orbitControls.update();
        if (raw >= 1) cameraTweenRef.current = null;
      }

      const now = performance.now();
      objectsMapRef.current.forEach((part) => {
        if (!part || part === 'loading') return;
        const motion = part.userData?.assemblyAnimation;
        if (!motion) return;
        const raw = Math.min(1, (now - motion.startedAt) / motion.duration);
        const eased = 1 - Math.pow(1 - raw, 3);
        part.position.lerpVectors(motion.fromPosition, motion.toPosition, eased);
        const scale = THREE.MathUtils.lerp(motion.fromScale, motion.toScale, eased);
        part.scale.setScalar(scale);
        part.rotation.y = motion.finalRotationY + (1 - eased) * motion.spin;
        if (raw >= 1) {
          part.position.copy(motion.toPosition);
          part.scale.setScalar(motion.toScale);
          part.rotation.y = motion.finalRotationY;
          delete part.userData.assemblyAnimation;
        }
      });

      // ── Sinov xonasidagi real-vaqt simulyatsiyasi ──
      const arena = arenaRef.current;
      const robotState = robotStateRef.current;
      if (isSimulatingRef.current && arena && robotState) {
        // Kadrlar orasidagi haqiqiy vaqt. Fizika kadr tezligiga bog'liq
        // bo'lmasligi uchun shart; 100 ms bilan cheklaymiz, aks holda tab
        // fondan qaytganda robot bir kadrda devor ichidan o'tib ketadi.
        const deltaSeconds = Math.min(0.1, (now - lastSimTime) / 1000) || 0;
        lastSimTime = now;

        const live = simStateRef.current || {};
        const motorSpeed = Number(live.motorSpeed) || 0;
        // `?? 90` bu yerda ishlamaydi: Number(undefined) NaN qaytaradi, NaN esa
        // null ham, undefined ham emas — sensor burchagi NaN bo'lib qolardi.
        const rawServo = Number(live.servoAngle);
        const servoAngle = Number.isFinite(rawServo) ? rawServo : 90;

        const result = stepRobot({
          state: robotState,
          delta: deltaSeconds,
          arena,
          raycaster: simRaycaster,
          radius: robotRadiusRef.current,
          sensorY: sensorYRef.current,
          motorSpeed,
          servoAngle,
          stopCm: simStopCmRef.current,
          manual: simDriveModeRef.current === 'manual',
          keys: driveKeysRef.current,
        });

        const body = robotBodyRef.current;
        if (body) {
          body.position.set(robotState.x, 0, robotState.z);
          body.rotation.y = robotState.heading;
        }

        // Olov tebranishi va suv oqimi — fizikadan mustaqil, faqat vaqtga
        // bog'liq, shuning uchun robot to'xtab qolsa ham davom etadi.
        arenaClockRef.current += deltaSeconds;
        arena.update?.(arenaClockRef.current);

        // Ko'chirilgan yuklarning meshlarini yangi joyiga ko'chiramiz.
        // Fizika p.x/p.z da yuritiladi, mesh esa faqat ko'rinish — ikkalasini
        // ajratib turish to'qnashuv hisobini Three.js transformlaridan xoli
        // qiladi va sinovni test qilishni ham osonlashtiradi.
        arena.payloads?.forEach((p) => {
          const liftY = p.held ? p.restY + 190 : p.restY;
          p.mesh.position.set(p.x, liftY, p.z);
          if (p.delivered) {
            p.mesh.material.emissive?.set('#a855f7');
            p.mesh.material.emissiveIntensity = 0.5;
          }
        });

        objectsMapRef.current.forEach((obj3d) => {
          if (!obj3d || obj3d === 'loading') return;
          const type = (obj3d.userData?.type || '').toLowerCase();

          // G'ildiraklar robotning haqiqiy tezligiga qarab aylanadi: turgan
          // joyida g'ildirak ham aylanmaydi, orqaga yurganda teskari aylanadi.
          if (!type.includes('caster') && (type.includes('wheel') || type.includes('gear') || type.includes('tire'))) {
            const spin = (robotState.speed * deltaSeconds) / 26;
            // TT wheel CAD models are authored around their local X axle.
            // Changing Euler Z rotated the whole tyre sideways after its kit
            // orientation was applied. Local-axis rotation preserves the axle.
            if (type.includes('tt-wheel')) obj3d.rotateOnAxis(LOCAL_X_AXIS, spin);
            else obj3d.rotateZ(spin);
          }
          // Servo sensor kallagini buradi (90° = to'g'ri oldinga).
          if (type.includes('servo') || type.includes('sg90') || type.includes('mg90s')) {
            const baseY = obj3d.userData?.baseRotation?.[1] || 0;
            obj3d.rotation.y = THREE.MathUtils.lerp(obj3d.rotation.y, baseY + (servoAngle - 90) * Math.PI / 180, 0.12);
          }
        });

        applySimulationCamera(robotState, deltaSeconds);

        // Telemetriya sekundiga ~5 marta — har kadrda React ni yangilash
        // sahnani sekinlashtiradi va ekranda o'qib bo'lmaydigan raqam beradi.
        telemetryClockRef.current += deltaSeconds;
        if (telemetryClockRef.current >= 0.2) {
          telemetryClockRef.current = 0;
          const elapsed = ((robotState.finishedAt || now) - robotState.startedAt) / 1000;
          const snapshot = {
            distanceCm: Number(result.distanceCm.toFixed(1)),
            speedMmS: Math.round(Math.abs(robotState.speed) * 0.4),
            collisions: robotState.collisions,
            elapsed: Number(elapsed.toFixed(1)),
            goalReached: robotState.goalReached,
            goalDistanceCm: Number(
              (Math.hypot(robotState.x - arena.goal.x, robotState.z - arena.goal.z) * LDU_TO_CM).toFixed(0),
            ),
            justReachedGoal: result.justReachedGoal,
            hazard: robotState.hazard,
            holding: !!robotState.heldPayloadId,
            delivered: arena.payloads.filter((p) => p.delivered).length,
            payloadTotal: arena.payloads.length,
          };
          setHud(snapshot);
          onTelemetryRef.current?.(snapshot);
        } else if (result.justReachedGoal) {
          onTelemetryRef.current?.({
            distanceCm: Number(result.distanceCm.toFixed(1)),
            speedMmS: Math.round(Math.abs(robotState.speed) * 0.4),
            collisions: robotState.collisions,
            elapsed: Number(((robotState.finishedAt - robotState.startedAt) / 1000).toFixed(1)),
            goalReached: true,
            goalDistanceCm: 0,
            justReachedGoal: true,
          });
        }
      } else {
        lastSimTime = now;
      }

      // Shartli render pass: faqat detal tanlangandagina composer ishlaydi
      const hasSelection = outlinePassRef.current?.selectedObjects?.length > 0;
      if (hasSelection && composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }

    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      // Nol o'lcham bilan setSize chaqirsak tuval 0x0 bo'lib qoladi va sahna
      // umuman chizilmaydi. Bu holat init paytida yuz beradi (pastga qara).
      if (newWidth === 0 || newHeight === 0) return;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      composer.setSize(newWidth, newHeight);
      outlinePass.resolution.set(newWidth, newHeight);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    // ResizeObserver — window resize hodisasi yetarli emas.
    //
    // Sahna konteyneri flex qatori ichida `height: 100%` bilan turadi. Init
    // paytida flex balandligi hali hisoblanmagan bo'lishi mumkin, o'shanda
    // clientWidth/clientHeight NOL qaytaradi va renderer 0x0 o'lchamda qoladi.
    // Natijada detallar sahnaga qo'shiladi, modellar yuklanadi, lekin ekranda
    // hech narsa ko'rinmaydi — chizish uchun piksel yo'q. Oyna o'lchami
    // o'zgarmaguncha bu holat saqlanadi.
    //
    // ResizeObserver konteyner o'lchami har o'zgarganda ishga tushadi, ya'ni
    // balandlik nolдan haqiqiy qiymatga o'tgan zahoti renderer to'g'rilanadi.
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountRef.current);

    // ResizeObserver o'zi yetarli emas — tekshirib ko'rilgan.
    //
    // Init paytida mountRef.current.clientHeight 0 qaytadi (flex balandligi
    // hali hisoblanmagan). Keyin element haqiqiy o'lchamga ega bo'ladi, lekin
    // ResizeObserver ning birinchi chaqirig'i ham nol o'lchamni ko'radi va
    // yuqoridagi tekshiruv uni o'tkazib yuboradi. Shundan keyin o'lcham
    // boshqa o'zgarmaydi, ya'ni kuzatuvchi hech qachon qayta ishga tushmaydi
    // va tuval 0x0 bo'lib qoladi: detallar sahnaga qo'shiladi, modellar
    // yuklanadi, lekin ekranda hech narsa ko'rinmaydi.
    //
    // Shuning uchun birinchi kadrlarda o'lchamni majburan tekshiramiz va
    // haqiqiy qiymat paydo bo'lgan zahoti bir marta o'lchab olamiz.
    let sizeTries = 0;
    const ensureSize = () => {
      if (!mountRef.current) return;
      if (mountRef.current.clientWidth > 0 && mountRef.current.clientHeight > 0) {
        handleResize();
        return;
      }
      if (sizeTries++ < 30) requestAnimationFrame(ensureSize);
    };
    requestAnimationFrame(ensureSize);

    const mountEl = mountRef.current;

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (assemblyFocusTimerRef.current) clearTimeout(assemblyFocusTimerRef.current);
      focusSceneRef.current = null;
      if (mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
      transformControls.detach();
      transformControls.dispose();
      renderer.dispose();
      composer.dispose();
      scene.clear();
    };
  }, []);

  /**
   * Sinov xonasini qurish/yig'ishtirish.
   *
   * Simulyatsiya yoqilganda: poligon quriladi, yig'ma bitta jismga aylanadi va
   * start maydonchasiga qo'yiladi. O'chirilganda hammasi aynan oldingi holiga
   * qaytadi — detallarning o'z koordinatalariga umuman tegilmagani uchun
   * "qaytarish" deganimiz shunchaki uchta guruhni nolga qo'yish.
   */
  useEffect(() => {
    const scene = sceneRef.current;
    const robotBody = robotBodyRef.current;
    const robotAlign = robotAlignRef.current;
    const robotCenter = robotCenterRef.current;
    if (!scene || !robotBody || !robotAlign || !robotCenter) return undefined;

    if (!isSimulating) return undefined;

    // Yig'maning haqiqiy o'lchamini o'lchaymiz: bu robot radiusini (to'qnashuv
    // uchun), sensor balandligini va markazini beradi.
    const partsMap = objectsMapRef.current;
    const bounds = new THREE.Box3();
    let hasParts = false;
    partsMap.forEach((part) => {
      if (!part || part === 'loading' || !part.visible) return;
      part.updateMatrixWorld(true);
      bounds.expandByObject(part);
      hasParts = true;
    });

    const size = hasParts ? bounds.getSize(new THREE.Vector3()) : new THREE.Vector3(200, 80, 140);
    const center = hasParts ? bounds.getCenter(new THREE.Vector3()) : new THREE.Vector3();
    const minY = hasParts ? bounds.min.y : 0;

    // Robotning "oldi" uzun o'qi bo'ylab. Tayyor yig'malarda u +X (kaster
    // oldinda, motorlar orqada), lekin erkin qurilgan robot ko'ndalang ham
    // bo'lishi mumkin — o'shanda uni burib qo'yamiz.
    const yawOffset = size.z > size.x * 1.2 ? Math.PI / 2 : 0;
    robotAlign.rotation.set(0, yawOffset, 0);
    robotCenter.position.set(-center.x, -minY, -center.z);

    robotRadiusRef.current = Math.max(60, Math.max(size.x, size.z) * 0.5);
    sensorYRef.current = Math.max(25, size.y * 0.45);

    const arena = buildArena();
    arenaRef.current = arena;
    arenaClockRef.current = 0;
    scene.add(arena.group);

    // Poligon o'z poliga ega — yig'ish gridi va zamin bu yerda ortiqcha.
    if (groundRef.current) groundRef.current.visible = false;
    if (gridRef.current) gridRef.current.visible = false;

    // Sinov paytida detallarni surib bo'lmaydi: gizmo robot bilan birga
    // uchib yurishi mantiqsiz, ustiga u har kadrda pozitsiyani state ga
    // qaytarib yozib, yig'mani buzib yuborardi.
    transformControlsRef.current?.detach();

    robotStateRef.current = createRobotState(arena.spawn);
    robotBody.position.set(arena.spawn.x, 0, arena.spawn.z);
    robotBody.rotation.set(0, arena.spawn.heading, 0);

    // G'ildiraklar aylantiriladi, shuning uchun ularning boshlang'ich
    // burchagini eslab qolamiz va sinovdan keyin joyiga qaytaramiz.
    const wheelBase = wheelBaseRotationRef.current;
    wheelBase.clear();
    partsMap.forEach((part, id) => {
      if (!part || part === 'loading') return;
      wheelBase.set(id, part.rotation.clone());
    });

    telemetryClockRef.current = 0;
    requestRenderRef.current?.();

    return () => {
      scene.remove(arena.group);
      arena.dispose();
      arenaRef.current = null;
      robotStateRef.current = null;

      robotBody.position.set(0, 0, 0);
      robotBody.rotation.set(0, 0, 0);
      robotAlign.rotation.set(0, 0, 0);
      robotCenter.position.set(0, 0, 0);

      wheelBase.forEach((rotation, id) => {
        const part = partsMap.get(id);
        if (part && part !== 'loading') part.rotation.copy(rotation);
      });
      wheelBase.clear();

      if (groundRef.current) groundRef.current.visible = true;
      if (gridRef.current) gridRef.current.visible = true;
      setHud(null);
      requestRenderRef.current?.();
    };
  }, [isSimulating]);

  // Qo'lda boshqarish klavishlari (WASD / strelkalar). Faqat qo'lda rejimda
  // tinglaymiz, aks holda 'S' tugmasi sahna "Masshtab" rejimiga ham tushadi.
  useEffect(() => {
    if (!isSimulating || simDriveMode !== 'manual') {
      driveKeysRef.current = { forward: false, back: false, left: false, right: false };
      return undefined;
    }

    const setKey = (event, pressed) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
      const role = keyRole(event.key);
      if (!role) return;
      driveKeysRef.current[role] = pressed;
      event.preventDefault();
    };

    // Space — manipulyator: bo'sh bo'lsa oldidagi yukni ushlaydi, ushlab
    // turgan bo'lsa qo'yib yuboradi. Bitta tugma, chunki ikkita alohida
    // tugma (ol / qo'y) o'quvchini "qaysi biri hozir kerak?" degan ortiqcha
    // qarorga majbur qilardi.
    const onGrabKey = (event) => {
      if (event.code !== 'Space') return;
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
      event.preventDefault();
      const arena = arenaRef.current;
      const robotState = robotStateRef.current;
      if (!arena || !robotState) return;

      if (robotState.heldPayloadId) {
        const released = releaseHeld(robotState, arena);
        if (released?.delivered) requestShadowUpdateRef.current?.();
      } else {
        tryGrab(robotState, arena, robotRadiusRef.current);
      }
    };

    const onDown = (event) => setKey(event, true);
    const onUp = (event) => setKey(event, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('keydown', onGrabKey);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('keydown', onGrabKey);
      driveKeysRef.current = { forward: false, back: false, left: false, right: false };
    };
  }, [isSimulating, simDriveMode]);

  // Dispose helper
  const disposeObject3D = (obj3d) => {
    if (!obj3d || obj3d === 'loading') return;
    obj3d.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  };

  // Helper: Protsedural mesh yaratish
  const createProceduralObject = (obj) => {
    let object3d;
    const entry = getCatalogEntry(obj.type);
    const config = getMaterialConfig(obj.type);

    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: config.metalness,
      roughness: config.roughness,
      envMapIntensity: config.envMapIntensity,
    });

    // Katalogda ikki xil nom ishlatilgan: LEGO_TECHNIC_PARTS dan kelgan yozuvlarda
    // `generatorType`, CATALOG dagi yozuvlarda esa `generator`. Avval faqat
    // birinchisi o'qilardi, shuning uchun CATALOG dagi protsedural detallar
    // (shesternya, balka, shassi...) generatorga tushmay placeholder ko'rsatardi.
    const genType = entry?.generatorType || entry?.generator || obj.type;

    if (genType === 'lego_beam') {
      const geo = createLegoBeamGeometry({ holes: obj.params?.holes || entry?.defaultParams?.holes || 7 });
      object3d = new THREE.Mesh(geo, material);
    } else if (genType === 'lego_gear') {
      const geo = createLegoGearGeometry({ teeth: obj.params?.teeth || entry?.defaultParams?.teeth || 16 });
      object3d = new THREE.Mesh(geo, material);
    } else if (genType === 'lego_axle') {
      const geo = createLegoAxleGeometry({ lengthStuds: obj.params?.lengthStuds || entry?.defaultParams?.lengthStuds || 5 });
      object3d = new THREE.Mesh(geo, material);
    } else if (genType === 'gear') {
      const geo = createGearGeometry({ teeth: obj.params?.teeth || 12 });
      object3d = new THREE.Mesh(geo, material);
    } else if (genType === 'spring') {
      const geo = createSpringGeometry({ springSize: obj.params?.springSize || 'kichik' });
      object3d = new THREE.Mesh(geo, material);
    } else if (genType === 'axle') {
      const geo = createAxleGeometry();
      object3d = new THREE.Mesh(geo, material);
    } else if (genType === 'frame_beam') {
      const geo = createFrameBeamGeometry();
      object3d = new THREE.Mesh(geo, material);
    } else if (genType === 'servo') {
      object3d = createServoMotorMesh();
    } else if (genType === 'stepper') {
      object3d = createStepperMotorMesh();
    } else if (genType === 'caster') {
      object3d = createCasterMesh({
        wheelDiaMm: obj.params?.wheelDiaMm || entry?.defaultParams?.wheelDiaMm || 25,
      });
    } else if (genType === 'arm_segment') {
      object3d = createArmSegmentGeometry({
        lengthMm: obj.params?.lengthMm || entry?.defaultParams?.lengthMm || 90,
        widthMm: obj.params?.widthMm || entry?.defaultParams?.widthMm || 22,
      });
    } else if (genType === 'bucket') {
      object3d = createBucketGeometry({
        widthMm: obj.params?.widthMm || entry?.defaultParams?.widthMm || 46,
      });
    } else if (genType === 'robot_chassis') {
      const geo = createRobotChassisGeometry({
        lengthMm: obj.params?.lengthMm || entry?.defaultParams?.lengthMm || 160,
        widthMm: obj.params?.widthMm || entry?.defaultParams?.widthMm || 110,
        thickMm: obj.params?.thickMm || entry?.defaultParams?.thickMm || 3,
      });
      object3d = new THREE.Mesh(geo, material);
    }

    return object3d;
  };

  // LEGO Technic katalogidan (1000+ detal) obyekt yaratish.
  const createLegoObject3D = (obj) => {
    const material = new THREE.MeshStandardMaterial({
      color: obj.colorHex || '#cccccc',
      metalness: 0.25,
      roughness: 0.45,
    });

    switch (obj.generator) {
      case 'lego_beam':
        return new THREE.Mesh(createLegoBeamGeometry({ holes: obj.params?.holes || 5 }), material);
      case 'lego_gear':
        return new THREE.Mesh(createLegoGearGeometry({ teeth: obj.params?.teeth || 16 }), material);
      case 'lego_axle':
        return new THREE.Mesh(createLegoAxleGeometry({ lengthStuds: obj.params?.lengthStuds || 5 }), material);
      default:
        return createLegoPlaceholder(obj, material);
    }
  };

  // Har bir subkategoriyaga mos HAQIQIY 3D LEGO formalari (Hech qanday KUB bo'lib qolmaydi!)
  function createLegoPlaceholder(obj, material) {
    const sc = obj.subcat;
    if (sc === 'electric') return createStepperMotorMesh();
    if (sc === 'sensor') return createLegoDistanceSensorMesh();

    let geo;
    switch (sc) {
      case 'pin':
        geo = createLegoPinGeometry({}); break;
      case 'bush':
        geo = createLegoBushGeometry({}); break;
      case 'connector':
        geo = createLegoConnectorGeometry({}); break;
      case 'tire':
        geo = createLegoTireGeometry(); break;
      case 'wheel':
      case 'pulley':
        geo = createLegoRimGeometry(); break;
      case 'panel':
        geo = createLegoPanelGeometry(); break;
      case 'beam_angular':
        geo = createLegoLBeamGeometry({ holes1: 3, holes2: 5 }); break;
      case 'beam_straight':
      case 'beam_frame':
      case 'beam_studded':
        geo = createLegoBeamGeometry({ holes: obj.params?.holes || 5 }); break;
      case 'gear':
        geo = createLegoGearGeometry({ teeth: obj.params?.teeth || 16 }); break;
      case 'axle':
        geo = createLegoAxleGeometry({ lengthStuds: obj.params?.lengthStuds || 5 }); break;
      case 'pneumatic':
      case 'steering':
        geo = createLegoBushGeometry({ isHalf: false }); break;
      default:
        geo = createLegoBeamGeometry({ holes: 3 });
    }
    return new THREE.Mesh(geo, material);
  }

  // Add / Update Objects effect — Dynamic Real-Time Scale & Geometry Params Sync!
  useEffect(() => {
    if (!sceneRef.current) return;

    const currentIds = objects.map(o => o.id);
    const map = objectsMapRef.current;

    // 1. O'chirilgan obyektlarni tozalash
    for (const [id, obj3d] of map.entries()) {
      if (!currentIds.includes(id)) {
        if (obj3d && obj3d !== 'loading') {
          // Detal robot tanasi ostidagi guruhlardan birida turadi, sahnada emas.
          obj3d.parent?.remove(obj3d);
          disposeObject3D(obj3d);
        }
        map.delete(id);

        if (selectedId === id) {
          transformControlsRef.current.detach();
        }
      }
    }

    // 2. Obyektlarni yangilash yoki zudlik bilan scale qo'llash
    objects.forEach(obj => {
      const existingObj = map.get(obj.id);
      const paramsKey = JSON.stringify(obj.params || {});
      const scaleMult = ((obj.params?.scalePercent || 100) / 100);

      if (existingObj && existingObj !== 'loading') {
        const baseScale = existingObj.userData?.baseScale || 1;
        const finalScale = baseScale * scaleMult;

        // SCALE NI REAL-VAQTDA ZUDLIK BILAN QO'LLASH:
        if (!existingObj.userData?.assemblyAnimation) {
          existingObj.scale.set(finalScale, finalScale, finalScale);
        }
        existingObj.updateMatrixWorld(true);
        existingObj.visible = obj.visible;

        // Color update for LDraw
        if (obj.isLDraw && obj.colorCode !== undefined && existingObj.userData?.colorCode !== obj.colorCode) {
          applyColorToLDrawGroup(existingObj, obj.colorCode);
          existingObj.userData.colorCode = obj.colorCode;
        }

        // Agar geometriyaning shakli (holes, teeth, studs) o'zgargan bo'lsa — qayta yaratish
        if (existingObj.userData?.paramsKey !== paramsKey) {
          if (existingObj.parent) existingObj.parent.remove(existingObj);
          disposeObject3D(existingObj);
          map.delete(obj.id);
        }
      }

      if (!map.has(obj.id)) {
        map.set(obj.id, 'loading');
        const entry = getCatalogEntry(obj.type);
        const modelFileName = obj.file || entry?.file;

        const applyTransform = (object3d, baseScale = 1, isLDraw = false) => {
          const finalScale = baseScale * scaleMult;
          object3d.scale.set(finalScale, finalScale, finalScale);

          if (obj.position) {
            object3d.position.set(obj.position[0], obj.position[1], obj.position[2]);
          } else {
            object3d.position.set(0, 20, 0);
          }

          if (obj.rotation) {
            object3d.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
          }

          const finalRotationY = object3d.rotation.y;
          object3d.userData = {
            id: obj.id,
            type: obj.type,
            paramsKey,
            baseScale,
            isLDraw,
            colorCode: obj.colorCode,
            baseRotation: obj.rotation ? [...obj.rotation] : [0, 0, 0],
          };

          if (obj.assemblySpawn) {
            const toPosition = object3d.position.clone();
            const direction = (Number(String(obj.id).replace(/\D/g, '').slice(-2)) || 1) % 2 ? 1 : -1;
            const fromPosition = toPosition.clone().add(new THREE.Vector3(direction * 90, 150, 80));
            object3d.position.copy(fromPosition);
            object3d.scale.setScalar(finalScale * 0.7);
            object3d.rotation.y = finalRotationY + direction * 0.35;
            object3d.userData.assemblyAnimation = {
              startedAt: performance.now(),
              duration: 760,
              fromPosition,
              toPosition,
              fromScale: finalScale * 0.7,
              toScale: finalScale,
              finalRotationY,
              spin: direction * 0.35,
            };
          }
          
          if (isLDraw && ldrawRootGroupRef.current) {
            ldrawRootGroupRef.current.add(object3d);
          } else if (partsRootRef.current) {
            partsRootRef.current.add(object3d);
          } else if (sceneRef.current) {
            sceneRef.current.add(object3d);
          }

          map.set(obj.id, object3d);
          object3d.visible = obj.visible;

          if (selectedId === obj.id) {
            transformControlsRef.current.attach(object3d);
          }

          // Har yuklash yo'li (3MF, GLTF, STL, LDraw, protsedural, placeholder)
          // shu funksiya bilan tugaydi, shuning uchun qayta chizishni shu yerda
          // so'raymiz — bitta joy hammasini qoplaydi.
          requestRenderRef.current?.();

          // Avtomatik yig'ish davomida kamera o'sib borayotgan yig'mani
          // kadrda ushlab turadi. Avval fokus faqat oxirgi detaldan keyin
          // bir marta chaqirilardi — shu sababli birinchi detallar kadr
          // chetida yoki umuman tashqarida qo'yilar, foydalanuvchi nima
          // yig'ilayotganini ko'rmasdi. Qisqa tween (420 ms) har detalda
          // qayta boshlanadi va sakrash o'rniga silliq ergashish beradi.
          if (obj.assemblySpawn && frameSceneRef.current) {
            if (assemblyFocusTimerRef.current) clearTimeout(assemblyFocusTimerRef.current);
            assemblyFocusTimerRef.current = setTimeout(
              () => frameSceneRef.current?.(null, { duration: obj.assemblyLast ? 800 : 420, padding: 1.6 }),
              obj.assemblyLast ? 780 : 120,
            );
          }
        };

        const createMissingModelPlaceholder = (fileName, partName = 'Detal') => {
          console.warn(`[GLTFLoader] Model fayli topilmadi: /models/${fileName}`);

          const group = new THREE.Group();

          const boxGeo = new THREE.BoxGeometry(30, 14, 30);
          const boxMat = new THREE.MeshStandardMaterial({
            color: '#1e293b',
            metalness: 0.3,
            roughness: 0.5,
          });
          const boxMesh = new THREE.Mesh(boxGeo, boxMat);
          boxMesh.castShadow = true;
          boxMesh.receiveShadow = true;

          const wireGeo = new THREE.EdgesGeometry(boxGeo);
          const wireMat = new THREE.LineBasicMaterial({ color: '#f59e0b', linewidth: 2 });
          const wireMesh = new THREE.LineSegments(wireGeo, wireMat);

          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 512, 256);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 8;
          ctx.strokeRect(8, 8, 496, 240);

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('MODEL TOPILMADI', 256, 70);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 30px sans-serif';
          ctx.fillText((partName || 'Detal').substring(0, 24), 256, 140);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '22px monospace';
          ctx.fillText((fileName || '').substring(0, 32), 256, 200);

          const texture = new THREE.CanvasTexture(canvas);
          const labelMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
          const labelGeo = new THREE.PlaneGeometry(28, 14);
          const labelMesh = new THREE.Mesh(labelGeo, labelMat);
          labelMesh.position.set(0, 7.1, 0);
          labelMesh.rotation.x = -Math.PI / 2;

          group.add(boxMesh);
          group.add(wireMesh);
          group.add(labelMesh);

          return group;
        };

        const createFallback = () => {
          const fallbackName = modelFileName || obj.name || entry?.name || 'Unknown Part';
          const placeholder = createMissingModelPlaceholder(modelFileName || `${obj.type}.glb`, fallbackName);
          applyTransform(placeholder, 1);
        };

        // LDraw Model Loader
        if (obj.isLDraw || (obj.type && obj.type.startsWith('ldraw:'))) {
          const partNum = obj.partNum || obj.type.replace('ldraw:', '');
          loadLDrawPart(partNum, obj.colorCode || 71, obj.name).then((partGroup) => {
            if (!map.has(obj.id)) return;
            applyTransform(partGroup, 1, true);
          }).catch((err) => {
            console.warn("LDraw part error, fallback used:", err);
            createFallback();
          });
        } else if ((obj.isLego || (entry && entry.isProcedural)) || !modelFileName) {
          const object3d = obj.isLego ? createLegoObject3D(obj) : createProceduralObject(obj);
          if (object3d) {
            object3d.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            applyTransform(object3d, 1);
          } else {
            createFallback();
          }
        } else {
          // 3D Model Fayllar (3MF / GLTF / GLB / STL)
          const fileName = modelFileName;
          const isGlb = fileName.endsWith('.glb') || fileName.endsWith('.gltf');
          const is3mf = fileName.endsWith('.3mf');

          const manager = new THREE.LoadingManager();

          if (is3mf) {
            // Rangli 3MF — elektronika detallari (Fusion 360 dan C3MF sifatida
            // chiqarilgan, SPEC.md §4.0). Rang model ichida vertex rang bo'lib
            // keladi, shuning uchun uni kodda BERMAYMIZ — bersak detalning
            // haqiqiy ranglari (yashil plata, sariq reduktor) o'chib ketadi.
            const loader = new ThreeMFLoader(manager);
            loader.load(
              `/models/${fileName}`,
              (model) => {
                if (!map.has(obj.id)) return;

                const box = new THREE.Box3().setFromObject(model);
                model.position.sub(box.getCenter(new THREE.Vector3()));

                // Ba'zi CAD modellarini muallifi bo'yamagan — ular bitta kulrang
                // bilan keladi (masalan Arduino Uno, L298N). Bunday holda katalogdagi
                // haqiqiy rangni qo'llaymiz, aks holda plata kulrang bo'lib qoladi.
                // Ko'p rangli modellarga (TT motor, SG90, g'ildirak) tegmaymiz.
                const rangsiz = checkIs3mfModelUncolored(model);
                const zaxiraRang = rangsiz
                  ? obj.colorHex || getMaterialConfig(obj.type)?.color
                  : null;

                // PERFORMANCE SPEC §2: 3MF ichidagi barcha mesh'larni bitta mesh'ga birlashtirish (Draw calls 158 -> 1)
                const geoms = [];
                model.updateMatrixWorld(true);

                model.traverse((child) => {
                  if (!child.isMesh || !child.geometry) return;

                  const g = child.geometry.clone();
                  g.applyMatrix4(child.matrixWorld);

                  // Faqat kerakli atributlarni saqlash (mergeGeometries xatosini oldini olish)
                  for (const key of Object.keys(g.attributes)) {
                    if (!['position', 'normal', 'color'].includes(key)) {
                      g.deleteAttribute(key);
                    }
                  }

                  const count = g.attributes.position.count;
                  if (!g.attributes.color) {
                    const colors = new Float32Array(count * 3);
                    if (zaxiraRang) {
                      const c = new THREE.Color(zaxiraRang);
                      for (let i = 0; i < count; i++) {
                        colors[i * 3] = c.r;
                        colors[i * 3 + 1] = c.g;
                        colors[i * 3 + 2] = c.b;
                      }
                    } else if (child.material?.color) {
                      const c = child.material.color;
                      for (let i = 0; i < count; i++) {
                        colors[i * 3] = c.r;
                        colors[i * 3 + 1] = c.g;
                        colors[i * 3 + 2] = c.b;
                      }
                    } else {
                      colors.fill(1);
                    }
                    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                  }

                  const nonIndexed = g.index ? g.toNonIndexed() : g;
                  geoms.push(nonIndexed);

                  if (child.material?.dispose) child.material.dispose();
                });

                let finalObject;
                if (geoms.length > 0) {
                  const mergedGeometry = BufferGeometryUtils.mergeGeometries(geoms, false);
                  geoms.forEach((g) => g.dispose());

                  // Rang manbai: modelning o'z vertex ranglari, LEKIN ba'zi CAD
                  // modellarini muallifi bo'yamagan va ular bitta kulrang bilan
                  // keladi (Arduino Uno, L298N shunday). Bunday holda katalogdagi
                  // haqiqiy rang qo'llanadi va vertex rang o'chiriladi — aks holda
                  // plata kulrang bo'lib qoladi (SPEC.md §4.0).
                  const material = new THREE.MeshStandardMaterial({
                    color: rangsiz && zaxiraRang ? zaxiraRang : 0xffffff,
                    vertexColors: !rangsiz,
                    metalness: 0.05,
                    roughness: 0.6,
                    envMapIntensity: 0.25,
                  });

                  const mergedMesh = new THREE.Mesh(mergedGeometry, material);
                  mergedMesh.castShadow = true;
                  mergedMesh.receiveShadow = true;
                  finalObject = mergedMesh;
                } else {
                  finalObject = model;
                }

                const wrapper = new THREE.Group();
                wrapper.add(finalObject);
                applyTransform(wrapper, MM_TO_LDU);
              },
              undefined,
              (error) => {
                console.warn(`[3MFLoader] Model fayli topilmadi: /models/${fileName}`, error);
                const placeholder = createMissingModelPlaceholder(fileName, obj.name || entry?.name);
                applyTransform(placeholder, 1);
              }
            );
          } else if (isGlb) {
            const loader = new GLTFLoader(manager);
            loader.load(
              `/models/${fileName}`,
              (gltf) => {
                if (!map.has(obj.id)) return;

                const modelScene = gltf.scene;
                const box = new THREE.Box3().setFromObject(modelScene);
                const center = box.getCenter(new THREE.Vector3());
                const sphere = box.getBoundingSphere(new THREE.Sphere());
                const radius = sphere.radius || 10;

                modelScene.position.sub(center);

                const wrapper = new THREE.Group();
                wrapper.add(modelScene);

                // GLTF Empty Anchor nodelarini yig'ish (anchor_*, conn_*)
                const anchors = [];
                modelScene.traverse((child) => {
                  if (child.name && (child.name.startsWith('anchor_') || child.name.startsWith('conn_'))) {
                    anchors.push({
                      id: child.name,
                      name: child.name,
                      pos: [child.position.x, child.position.y, child.position.z],
                    });
                  }
                });
                wrapper.userData.anchors = anchors;

                const baseScale = radius > 0 ? TARGET_SIZE / radius : 1;
                const colorToUse = obj.colorHex || getMaterialConfig(obj.type)?.color;

                modelScene.traverse((child) => {
                  if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (colorToUse && !child.material?.map) {
                      child.material = new THREE.MeshStandardMaterial({
                        color: colorToUse,
                        metalness: 0.2,
                        roughness: 0.4,
                      });
                    }
                  }
                });

                applyTransform(wrapper, baseScale);
              },
              undefined,
              (error) => {
                console.warn(`[GLTFLoader] Model fayli topilmadi: /models/${fileName}`, error);
                const placeholder = createMissingModelPlaceholder(fileName, obj.name || entry?.name);
                applyTransform(placeholder, 1);
              }
            );
          } else {
            // STL Loader
            const loader = new STLLoader(manager);
            loader.load(
              `/models/${fileName}`,
              (geometry) => {
                if (!map.has(obj.id)) {
                  geometry.dispose();
                  return;
                }

                geometry.center();
                geometry.computeBoundingSphere();
                geometry.computeVertexNormals();

                const radius = geometry.boundingSphere.radius;
                const baseScale = radius > 0 ? TARGET_SIZE / radius : 1;

                const config = getMaterialConfig(obj.type);
                const material = new THREE.MeshStandardMaterial({
                  color: config.color,
                  metalness: config.metalness,
                  roughness: config.roughness,
                  envMapIntensity: config.envMapIntensity,
                  flatShading: false,
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                if (!obj.rotation || obj.rotation.every(r => r === 0)) {
                  mesh.rotation.set(-Math.PI / 2, 0, 0);
                }

                applyTransform(mesh, baseScale);
              },
              undefined,
              (error) => {
                console.warn(`STL fayli topilmadi (${fileName}), protsedural modelga o'tiladi:`, error);
                createFallback();
              }
            );
          }
        }
      }
    });

  }, [objects, selectedId]);

  // Selection + OutlinePass & TransformControls attach effect
  useEffect(() => {
    if (!transformControlsRef.current || !objectsMapRef.current) return;

    // Sinov paytida gizmo biriktirilmaydi: u harakatdagi detal bilan birga
    // uchib yuradi va har kadrda pozitsiyani state ga qaytarib yozib, yig'mani
    // buzib yuboradi. Kontur (outline) esa qoladi — u zararsiz.
    if (selectedId) {
      const obj3d = objectsMapRef.current.get(selectedId);
      if (obj3d && obj3d !== 'loading') {
        if (!isSimulating) transformControlsRef.current.attach(obj3d);
        transformControlsRef.current.setMode(transformMode);
        if (outlinePassRef.current) {
          const meshes = [];
          if (obj3d.isMesh) meshes.push(obj3d);
          else if (obj3d.isGroup) {
            obj3d.traverse(c => { if (c.isMesh) meshes.push(c); });
          }
          outlinePassRef.current.selectedObjects = meshes;
        }
      }
    } else {
      transformControlsRef.current.detach();
      if (outlinePassRef.current) {
        outlinePassRef.current.selectedObjects = [];
      }
    }
  }, [selectedId, transformMode, isSimulating]);

  /** Kamera ko'rinishlari. Yo'nalish vektori — kameradan sahnaga emas,
   * sahnadan kameraga qarab (frameScene uni shunday kutadi). */
  const applyCameraView = (view) => {
    const frame = frameSceneRef.current;
    if (!frame) return;
    const dirs = {
      reset: new THREE.Vector3(0.7, 0.45, 1),
      iso: new THREE.Vector3(0.7, 0.45, 1),
      front: new THREE.Vector3(0, 0.12, 1),
      side: new THREE.Vector3(1, 0.12, 0),
      // Sof tepadan qaralganda OrbitControls ning "up" vektori aniqlanmay
      // qoladi va kamera sakraydi, shuning uchun ozgina egiltiramiz.
      top: new THREE.Vector3(0.001, 1, 0.14),
    };
    frame(dirs[view] ?? null, { duration: 700, padding: view === 'fit' ? 1.35 : 1.5 });
  };

  const selectedObj = objects.find(o => o.id === selectedId);
  const catalogEntry = selectedObj ? getCatalogEntry(selectedObj.type) : null;
  const paramSchema = catalogEntry?.paramSchema;
  const currentScale = selectedObj?.params?.scalePercent || 100;

  return (
    <div
      className={`hardware-scene-shell${dropActive ? ' is-drop-active' : ''}`}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onDragOver={handleCatalogDragOver}
      onDrop={handleCatalogDrop}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) clearDropPreview();
      }}
    >
      {/* 1. 3D Rejim Mode Bar (Aylantirish R / Surish G / Masshtab S + Local/World)
          Sinov xonasida yashiriladi: u yerda detal surilmaydi ham, aylantirilmaydi
          ham, shuning uchun bu panel faqat ekranni band qilib turadi. */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 10,
          display: isSimulating ? 'none' : 'flex',
          gap: '4px',
          padding: '6px',
          borderRadius: '10px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <button
          className="btn-icon"
          title={t('scene.modeRotate')}
          onClick={() => handleModeChange('rotate')}
          style={{
            background: transformMode === 'rotate' ? 'var(--primary-color)' : 'transparent',
            color: transformMode === 'rotate' ? '#fff' : 'var(--text-secondary)',
            padding: '8px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
          }}
        >
          <RotateCw size={16} />
          {t('scene.modeRotate')}
        </button>
        <button
          className="btn-icon"
          title={t('scene.modeMove')}
          onClick={() => handleModeChange('translate')}
          style={{
            background: transformMode === 'translate' ? 'var(--primary-color)' : 'transparent',
            color: transformMode === 'translate' ? '#fff' : 'var(--text-secondary)',
            padding: '8px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
          }}
        >
          <Move size={16} />
          {t('scene.modeMove')}
        </button>
        <button
          className="btn-icon"
          title={t('scene.modeScale')}
          onClick={() => handleModeChange('scale')}
          style={{
            background: transformMode === 'scale' ? 'var(--primary-color)' : 'transparent',
            color: transformMode === 'scale' ? '#fff' : 'var(--text-secondary)',
            padding: '8px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
          }}
        >
          <Maximize2 size={16} />
          {t('scene.modeScale')}
        </button>
        <button
          className="btn-icon"
          title="Local / World"
          onClick={handleSpaceToggle}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#fff',
            padding: '8px 10px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.78rem',
          }}
        >
          <Globe size={14} />
          {transformSpace.toUpperCase()}
        </button>

        <button
          className="btn-icon"
          title="Snap"
          onClick={() => setSnapEnabled(prev => !prev)}
          style={{
            background: snapEnabled ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            color: snapEnabled ? '#4ade80' : 'var(--text-secondary)',
            border: snapEnabled ? '1px solid rgba(74, 222, 128, 0.5)' : '1px solid transparent',
            padding: '8px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <Magnet size={16} />
          {snapEnabled ? t('scene.snapOn') : t('scene.snapOff')}
        </button>

      </div>

      {/* 2. Tanlangan Detal O'lchamlari va Tezkor Aylantirish Paneli (Floating Card).
          Sinov paytida ham yashiriladi — o'lcham/burchak o'zgartirish sinovni
          o'rtasida yig'mani buzib yuborardi. */}
      {selectedObj && !isSimulating && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 10,
            width: '270px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={16} style={{ color: '#38bdf8' }} />
              {selectedObj.name}
            </h3>
            <button
              onClick={() => onRemove(selectedObj.id)}
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
              title="O'chirish"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Special Parameter (Axle length, Gear teeth, Beam holes) */}
          {paramSchema && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>
                {paramSchema.label}
              </label>
              <select
                value={selectedObj.params?.[paramSchema.key] ?? catalogEntry?.defaultParams?.[paramSchema.key]}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  const val = isNaN(Number(rawVal)) ? rawVal : Number(rawVal);
                  onUpdateParams(selectedObj.id, { [paramSchema.key]: val });
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  background: '#1e293b',
                  color: '#fff',
                  border: '1px solid #334155',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                {paramSchema.options.map(opt => (
                  <option key={opt} value={opt}>
                    {typeof opt === 'string' ? opt.toUpperCase() : opt} {paramSchema.key === 'holes' ? 'teshikli' : paramSchema.key === 'teeth' ? 'tishli' : paramSchema.key === 'lengthStuds' ? 'stud (L)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Umumiy O'lcham (Masshtab / Scale %) Slider — Real-vaqtda darhol katta-kichik bo'ladi */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
              <span>O&apos;lchami (Masshtab)</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>{currentScale}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="300"
              step="5"
              value={currentScale}
              onChange={(e) => {
                const scaleVal = Number(e.target.value);
                if (onUpdateParams) {
                  onUpdateParams(selectedObj.id, { scalePercent: scaleVal });
                }
              }}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
            />
          </div>

          {/* Tezkor X, Y, Z Aylantirish */}
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>
              Tezkor X, Y, Z Aylantirish
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                className="btn-icon"
                onClick={() => handleQuickRotate('y', -90)}
                style={{ fontSize: '0.75rem', padding: '6px', background: '#1e293b', color: '#fff', borderRadius: '6px', gap: '4px' }}
              >
                <RotateCcw size={14} /> -90° Y
              </button>
              <button
                className="btn-icon"
                onClick={() => handleQuickRotate('y', 90)}
                style={{ fontSize: '0.75rem', padding: '6px', background: '#1e293b', color: '#fff', borderRadius: '6px', gap: '4px' }}
              >
                <RotateCw size={14} /> +90° Y
              </button>
              <button
                className="btn-icon"
                onClick={() => handleQuickRotate('x', 90)}
                style={{ fontSize: '0.75rem', padding: '6px', background: '#1e293b', color: '#fff', borderRadius: '6px', gap: '4px' }}
              >
                <RotateCw size={14} /> +90° X
              </button>
              <button
                className="btn-icon"
                onClick={() => handleQuickRotate('z', 90)}
                style={{ fontSize: '0.75rem', padding: '6px', background: '#1e293b', color: '#fff', borderRadius: '6px', gap: '4px' }}
              >
                <RotateCw size={14} /> +90° Z
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2b. Kamera boshqaruvi — yig'ish rejimlarida.
          Sinovda o'z tanlagichi bor (pastda), shuning uchun takrorlanmaydi. */}
      {!isSimulating && (
        <div className="scene-camera-bar">
          <button type="button" onClick={() => applyCameraView('reset')} title="Boshlang‘ich ko‘rinishga qaytarish">
            <IconRefresh size={15} />
            <span>Reset</span>
          </button>
          <button type="button" onClick={() => applyCameraView('fit')} title="Yig‘mani kadrga sig‘dirish">
            <Maximize2 size={15} />
            <span>Sig‘dirish</span>
          </button>
          <span className="scene-camera-sep" />
          {[
            { id: 'front', label: 'Old' },
            { id: 'side', label: 'Yon' },
            { id: 'top', label: 'Tepa' },
            { id: 'iso', label: 'Izo' },
          ].map((preset) => (
            <button key={preset.id} type="button" onClick={() => applyCameraView(preset.id)} title={`${preset.label} ko‘rinish`}>
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* 3. Sinov xonasi HUD — faqat simulyatsiya paytida */}
      {isSimulating && hud && (
        <div className="sim-hud">
          <div className="sim-hud-row">
            <div className={`sim-hud-stat${hud.distanceCm < simStopCm ? ' is-alert' : ''}`}>
              <IconRadar2 size={15} />
              <div>
                <span className="sim-hud-label">To‘siq</span>
                <strong>{hud.distanceCm} sm</strong>
              </div>
            </div>
            <div className="sim-hud-stat">
              <IconClock size={15} />
              <div>
                <span className="sim-hud-label">Vaqt</span>
                <strong>{hud.elapsed.toFixed(1)} s</strong>
              </div>
            </div>
            <div className={`sim-hud-stat${hud.collisions > 0 ? ' is-warn' : ''}`}>
              <IconAlertTriangle size={15} />
              <div>
                <span className="sim-hud-label">Urilish</span>
                <strong>{hud.collisions}</strong>
              </div>
            </div>
            <div className={`sim-hud-stat${hud.goalReached ? ' is-done' : ''}`}>
              <IconFlag size={15} />
              <div>
                <span className="sim-hud-label">Finishgacha</span>
                <strong>{hud.goalReached ? 'YETDI' : `${hud.goalDistanceCm} sm`}</strong>
              </div>
            </div>
            {hud.payloadTotal > 0 && (
              <div className={`sim-hud-stat${hud.delivered > 0 ? ' is-done' : ''}`}>
                <IconPackage size={15} />
                <div>
                  <span className="sim-hud-label">Yetkazilgan</span>
                  <strong>{hud.delivered}/{hud.payloadTotal}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Xavf zonasi ogohlantirishi — olov yoki suv ustida turibdi */}
          {hud.hazard && (
            <div className={`sim-hud-hazard is-${hud.hazard}`}>
              <IconAlertTriangle size={15} />
              <span>
                {hud.hazard === 'fire'
                  ? 'OLOV! Robot issiqlik zonasida — orqaga qayting'
                  : 'SUV! Elektronika suvga tushdi — orqaga qayting'}
              </span>
            </div>
          )}

          {/* Sensor masofasi chizig'i — 0..100 sm oralig'ida */}
          <div className="sim-hud-gauge">
            <div
              className="sim-hud-gauge-fill"
              style={{
                width: `${Math.max(3, Math.min(100, hud.distanceCm))}%`,
                background: hud.distanceCm < simStopCm ? '#ef4444' : hud.distanceCm < simStopCm * 2.5 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>

          <div className="sim-hud-foot">
            <span>{Math.round(hud.speedMmS)} mm/s</span>
            <span>
              {simDriveMode === 'manual'
                ? `W/A/S/D — haydash · Space — ${hud.holding ? 'qo‘yish' : 'yukni olish'}`
                : 'Avtonom: kod boshqarmoqda'}
            </span>
          </div>
        </div>
      )}

      {/* 4. Sinov kamerasi tanlagichi */}
      {isSimulating && (
        <div className="sim-camera-switch">
          <IconVideo size={15} />
          {[
            { id: 'chase', label: 'Ergashuvchi' },
            { id: 'top', label: 'Yuqoridan' },
            { id: 'orbit', label: 'Erkin' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSimCameraMode(option.id)}
              className={simCameraMode === option.id ? 'is-active' : ''}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {dropActive && <div className="drop-placement-hint">Qo‘yish uchun qo‘yib yuboring · 10 birlik grid</div>}
    </div>
  );
}
