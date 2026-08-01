import * as THREE from 'three';
import { getConnectorsForObject, areConnectorsCompatible } from './connectorDefinitions';

/**
 * Object3D va uning connectors ro'yxatidan World Space koordinata va yo'nalishlarini hisoblaydi.
 */
export function getConnectorsInWorldSpace(obj3d, objData) {
  if (!obj3d || !objData) return [];

  const localConnectors = getConnectorsForObject(objData);
  obj3d.updateMatrixWorld(true);

  const worldConnectors = localConnectors.map((conn) => {
    const localPos = new THREE.Vector3(...conn.pos);
    const worldPos = localPos.clone().applyMatrix4(obj3d.matrixWorld);

    const localDir = new THREE.Vector3(...conn.dir).normalize();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(obj3d.matrixWorld);
    const worldDir = localDir.clone().applyMatrix3(normalMatrix).normalize();

    return {
      ...conn,
      objectId: objData.id,
      objectName: objData.name,
      worldPos,
      worldDir,
      localPos,
      localDir,
    };
  });

  return worldConnectors;
}

/**
 * Faol ko'chirilayotgan `activeObj3d` va sahnadagi boshqa obyektlar orasidagi eng yaqin
 * va mos keluvchi konnektor pair bo'yicha snap pozitsiyasi va rotatsiyasini topadi.
 */
export function findSnapTarget(activeObj3d, activeObjData, sceneObjectsMap, sceneObjectsList, threshold = 15) {
  if (!activeObj3d || !activeObjData || !sceneObjectsMap || !sceneObjectsList) {
    return { snapped: false };
  }

  const activeWorldConnectors = getConnectorsInWorldSpace(activeObj3d, activeObjData);
  if (activeWorldConnectors.length === 0) return { snapped: false };

  let closestSnap = null;
  let minDistance = threshold;

  // Sahnadagi boshqa barcha ko'rinuvchi obyektlarni aylanib chiqish
  for (const targetData of sceneObjectsList) {
    if (targetData.id === activeObjData.id || !targetData.visible) continue;

    const targetObj3d = sceneObjectsMap.get(targetData.id);
    if (!targetObj3d || targetObj3d === 'loading') continue;

    const targetWorldConnectors = getConnectorsInWorldSpace(targetObj3d, targetData);

    for (const activeConn of activeWorldConnectors) {
      for (const targetConn of targetWorldConnectors) {
        if (!areConnectorsCompatible(activeConn.type, targetConn.type)) continue;

        // Allaqachon birikkan juftlik bo'lsa qayta yopishishni oldini olish
        if (
          activeObjData.joints &&
          activeObjData.joints.some(
            (j) => j.selfConnector === activeConn.id && j.otherId === targetData.id && j.otherConnector === targetConn.id
          )
        ) {
          continue;
        }

        // O'q yo'nalishlari qarama-qarshiligini tekshirish (180° ± 35°, cos(35°) ≈ 0.819)
        const targetDesiredWorldDir = targetConn.worldDir.clone().negate();
        const angle = activeConn.worldDir.angleTo(targetDesiredWorldDir);
        const maxAngleRad = (35 * Math.PI) / 180; // 35 daraja ruxsat berilgan og'ish
        const isBidirectional = activeConn.type === 'm3_hole' && targetConn.type === 'm3_hole';
        const effectiveAngle = isBidirectional ? Math.min(angle, Math.abs(Math.PI - angle)) : angle;
        if (effectiveAngle > maxAngleRad) continue;


        const dist = activeConn.worldPos.distanceTo(targetConn.worldPos);
        if (dist < minDistance) {
          minDistance = dist;
          closestSnap = {
            activeConn,
            targetConn,
            dist,
            targetObj3d,
          };
        }
      }
    }
  }

  if (!closestSnap) {
    return { snapped: false };
  }

  const { activeConn, targetConn } = closestSnap;

  // Active connector localPos va localDir bo'yicha target position va rotation'ni hisoblash
  const targetDesiredWorldDir = targetConn.worldDir.clone().negate(); // Qarama-qarshi tutashish
  const currentActiveWorldDir = activeConn.worldDir.clone();

  const alignQuaternion = new THREE.Quaternion().setFromUnitVectors(currentActiveWorldDir, targetDesiredWorldDir);
  const newActiveRotation = activeObj3d.quaternion.clone().premultiply(alignQuaternion);

  const rotatedLocalConnPos = activeConn.localPos.clone().applyQuaternion(newActiveRotation);
  const newObjectWorldPos = targetConn.worldPos.clone().sub(rotatedLocalConnPos);

  const euler = new THREE.Euler().setFromQuaternion(newActiveRotation, 'XYZ');

  return {
    snapped: true,
    position: [newObjectWorldPos.x, newObjectWorldPos.y, newObjectWorldPos.z],
    rotation: [euler.x, euler.y, euler.z],
    quaternion: newActiveRotation,
    activeConn,
    targetConn,
    distance: closestSnap.dist,
  };
}
