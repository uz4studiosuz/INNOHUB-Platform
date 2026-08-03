'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SidebarRight from './components/SidebarRight';
import KitAssemblyPanel from './components/KitAssemblyPanel';
import SimulationPanel from './components/SimulationPanel';
import ThreeScene from './components/ThreeScene';
import Header from './components/Header';
import BomModal from './components/BomModal';
import ArduinoPanel from './components/ArduinoPanel';
import LDrawSourceModal from './components/LDrawSourceModal';
import { I18nProvider } from './i18n/index.jsx';
import { getCatalogEntry } from './data/catalog';
import { getKitParts } from './data/robotKits';
import './hardware.css';

function App() {
  // Sahnadagi barcha obyektlar ro'yxati
  const [sceneObjects, setSceneObjects] = useState([]);

  // Mode state: 'free_build' | 'kit_assembly' | 'simulation'
  const [activeMode, setActiveMode] = useState('free_build');

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simState, setSimState] = useState({ motorSpeed: 180, servoAngle: 90, sensorDistance: 35.0 });

  // Hozirda tanlangan obyekt ID si
  const [selectedObjectId, setSelectedObjectId] = useState(null);

  // Arduino pin mappings va Modallar state-i
  const [pinMappings, setPinMappings] = useState({});
  const [isBomOpen, setIsBomOpen] = useState(false);
  const [isArduinoOpen, setIsArduinoOpen] = useState(false);
  const [isLDrawSourceOpen, setIsLDrawSourceOpen] = useState(false);

  const exportLdrFnRef = useRef(null);
  const kitTimersRef = useRef([]);
  const [assemblyProgress, setAssemblyProgress] = useState({ active: false, current: 0, total: 0, partName: '' });

  useEffect(() => () => {
    kitTimersRef.current.forEach(window.clearTimeout);
  }, []);

  // Loyihani JSON fayldan yuklash
  const handleLoadProject = useCallback((data) => {
    if (data.sceneObjects) setSceneObjects(data.sceneObjects);
    if (data.pinMappings) setPinMappings(data.pinMappings);
    setSelectedObjectId(null);
  }, []);

  // .LDR faylidan obyektlarni sahnaga yuklash
  const handleImportLdrObjects = useCallback((importedObjects) => {
    setSceneObjects(importedObjects);
    setSelectedObjectId(null);
  }, []);

  // Sahnani tozalash
  const handleClearScene = useCallback(() => {
    setSceneObjects([]);
    setSelectedObjectId(null);
    setPinMappings({});
  }, []);

  // Sahnaga LDraw modelini qo'shish
  const handleAddLDrawPart = useCallback((partNum, name = '', dropPosition = null) => {
    const newId = uuidv4();
    setSceneObjects(prev => {
      const idx = prev.length;
      const posX = (idx % 4) * 40 - 60;
      const posZ = Math.floor(idx / 4) * 40 - 40;
      const newObj = {
        id: newId,
        isLDraw: true,
        partNum: partNum,
        type: `ldraw:${partNum}`,
        name: name || `Part ${partNum}`,
        colorCode: 71, // Standart Light Gray
        visible: true,
        position: dropPosition || [posX, 0, posZ],
        rotation: [0, 0, 0],
        params: { scalePercent: 100 },
      };
      return [...prev, newObj];
    });
    setSelectedObjectId(newId);
  }, []);

  // Sahnaga yangi qism qo'shish — CATALOG dan o'qiydi (Faza 0)
  const handleAddComponent = useCallback((typeInput, dropPosition = null) => {
    const type = typeof typeInput === 'string' ? typeInput : typeInput.type;
    const customName = typeof typeInput === 'object' ? typeInput.name : null;
    const entry = getCatalogEntry(type);

    const newId = uuidv4();

    setSceneObjects(prev => {
      const idx = prev.length;
      const posX = (idx % 4) * 50 - 75;
      const posZ = Math.floor(idx / 4) * 50 - 50;
      const count = prev.filter(o => o.type === type).length + 1;
      const newObj = {
        id: newId,
        type: entry ? entry.type : type,
        name: customName || (entry ? `${entry.name} ${count}` : `Part ${type}`),
        file: entry ? entry.file : null,
        isLDraw: entry ? (entry.isLDraw || false) : false,
        partNum: entry ? entry.partNum : null,
        colorCode: entry ? (entry.colorCode || 71) : 71,
        visible: true,
        position: dropPosition || [posX, 25, posZ],
        rotation: [0, 0, 0],
        params: entry?.defaultParams ? { ...entry.defaultParams } : null,
      };
      return [...prev, newObj];
    });

    setSelectedObjectId(newId);
  }, []);

  // Tayyor robot yig'masini sahnaga tushirish ("Tayyorini yukla" rejimi).
  // handleAddComponent dan farqi: joylashuv va burilish yig'mada aniq
  // berilgan, to'r bo'yicha avtomatik joylashtirilmaydi.
  const handleLoadKit = useCallback((kitId) => {
    const parts = getKitParts(kitId);
    if (!parts.length) return;

    kitTimersRef.current.forEach(window.clearTimeout);
    kitTimersRef.current = [];

    const objects = parts.map((p, index) => {
      const entry = getCatalogEntry(p.type);
      return {
        id: uuidv4(),
        type: entry ? entry.type : p.type,
        name: p.name,
        file: entry ? entry.file : null,
        isLDraw: entry ? (entry.isLDraw || false) : false,
        partNum: entry ? entry.partNum : null,
        colorCode: entry ? (entry.colorCode || 71) : 71,
        visible: true,
        // Kit koordinatalari shassi markaziga nisbatan yozilgan. Yig‘mani
        // grid ostiga kesilib ketmasligi uchun butun robotni yer sathidan
        // yuqoriga ko‘taramiz; g‘ildiraklarning pastki nuqtasi y=0 ga yaqin.
        position: [p.position[0], p.position[1] + 140, p.position[2]],
        rotation: p.rotation,
        params: p.params ? { ...p.params } : (entry?.defaultParams ? { ...entry.defaultParams } : null),
        assemblySpawn: true,
        assemblyLast: index === parts.length - 1,
      };
    });

    setSceneObjects([]);
    setSelectedObjectId(null);
    setAssemblyProgress({ active: true, current: 0, total: objects.length, partName: '' });

    objects.forEach((object, index) => {
      const timer = window.setTimeout(() => {
        setSceneObjects((current) => [...current, object]);
        setAssemblyProgress({
          active: index < objects.length - 1,
          current: index + 1,
          total: objects.length,
          partName: object.name,
        });
        if (index === objects.length - 1) setSelectedObjectId(object.id);
      }, 180 + index * 480);
      kitTimersRef.current.push(timer);
    });
  }, []);

  // LEGO Technic katalogidan (1000+ detal) qism qo'shish
  const handleAddLego = useCallback((part, dropPosition = null) => {
    const newId = uuidv4();
    setSceneObjects(prev => {
      const idx = prev.length;
      const posX = (idx % 4) * 50 - 75;
      const posZ = Math.floor(idx / 4) * 50 - 50;
      const newObj = {
        id: newId,
        isLego: true,
        legoId: part.id,
        partNum: part.partNum,
        type: `lego:${part.id}`,
        name: `${part.name} — ${part.color}`,
        generator: part.generator,
        subcat: part.subcat,
        colorHex: part.colorHex,
        visible: true,
        position: dropPosition || [posX, 25, posZ],
        rotation: [0, 0, 0],
        params: { ...(part.params || {}), scalePercent: 100 },
      };
      return [...prev, newObj];
    });
    setSelectedObjectId(newId);
  }, []);

  const handleDropPart = useCallback((payload, position) => {
    if (!payload || !position) return;
    if (payload.kind === 'ldraw') {
      handleAddLDrawPart(payload.partNum, payload.name, position);
    } else if (payload.kind === 'lego') {
      handleAddLego(payload.part, position);
    } else {
      handleAddComponent(payload.type || payload.partNum, position);
    }
  }, [handleAddComponent, handleAddLDrawPart, handleAddLego]);

  // Obyektni o'chirish
  const handleRemoveObject = useCallback((id) => {
    setSceneObjects(prev => prev.filter(obj => obj.id !== id));
    setSelectedObjectId(prev => prev === id ? null : prev);
  }, []);

  // TransformControls → State sinxronizatsiyasi
  const handleUpdateTransform = useCallback((id, position, rotation, snapResult = null) => {
    setSceneObjects(prev => prev.map(obj => {
      if (obj.id !== id) return obj;
      let updatedObj = { ...obj, position, rotation };
      if (snapResult && snapResult.snapped && snapResult.activeConn && snapResult.targetConn) {
        const newJoint = {
          selfConnector: snapResult.activeConn.id,
          otherId: snapResult.targetConn.objectId,
          otherConnector: snapResult.targetConn.id,
        };
        const existingJoints = obj.joints || [];
        const exists = existingJoints.some(
          j => j.selfConnector === newJoint.selfConnector && j.otherId === newJoint.otherId && j.otherConnector === newJoint.otherConnector
        );
        if (!exists) {
          updatedObj.joints = [...existingJoints, newJoint];
        }
      }
      return updatedObj;
    }));
  }, []);

  // Parametrik o'lchamlarni o'zgartirish
  const handleUpdateParams = useCallback((id, newParams) => {
    setSceneObjects(prev => prev.map(obj =>
      obj.id === id
        ? { ...obj, params: { ...obj.params, ...newParams } }
        : obj
    ));
  }, []);

  return (
    // .hardware-root carries the module's variables and pins it to the route's
    // box. It sized itself to the viewport when it was the whole page; here the
    // route decides how much room it gets.
    <div className="hardware-root" style={{ flexDirection: 'column', background: 'var(--bg-color)' }}>
      {/* Yuqori Header va Asboblar Paneli */}
      <Header
        sceneObjects={sceneObjects}
        pinMappings={pinMappings}
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        onLoadProject={handleLoadProject}
        onClearScene={handleClearScene}
        onOpenBomModal={() => setIsBomOpen(true)}
        onOpenArduinoModal={() => setIsArduinoOpen(true)}
        onExportLdr={() => exportLdrFnRef.current && exportLdrFnRef.current()}
        onImportLdrObjects={handleImportLdrObjects}
        onOpenLDrawSourceModal={() => setIsLDrawSourceOpen(true)}
      />

      {/* Asosiy kontent qatori (Row container) */}
      <div style={{ display: 'flex', flex: 1, width: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Markaziy 3D Oyna */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <ThreeScene 
            objects={sceneObjects}
            selectedId={selectedObjectId}
            isSimulating={isSimulating}
            simState={simState}
            onSelect={setSelectedObjectId}
            onRemove={handleRemoveObject}
            onUpdate={handleUpdateTransform}
            onUpdateParams={handleUpdateParams}
            onDropPart={handleDropPart}
            onExportLdrReady={(exportFn) => { exportLdrFnRef.current = exportFn; }}
          />
          <div className="scene-count-badge" aria-live="polite">
            {sceneObjects.length} detal · katalogdan sudrab sahnaga qo‘ying
          </div>
        </div>

        {/* O'ng panel: Rejimga qarab dinamik panel (Erkin qurish, Tayyor Yig'ish, Simulyatsiya) */}
        {activeMode === 'free_build' && (
          <SidebarRight
            onAdd={handleAddComponent}
            onAddLego={handleAddLego}
            onAddLDrawPart={handleAddLDrawPart}
          />
        )}

        {activeMode === 'kit_assembly' && (
          <KitAssemblyPanel
            sceneObjects={sceneObjects}
            onAddComponent={handleAddComponent}
            onLoadKit={handleLoadKit}
            assemblyProgress={assemblyProgress}
          />
        )}

        {activeMode === 'simulation' && (
          <SimulationPanel
            sceneObjects={sceneObjects}
            isSimulating={isSimulating}
            onStartSimulation={(initialState) => {
              setIsSimulating(true);
              if (initialState) setSimState(initialState);
            }}
            onStopSimulation={() => setIsSimulating(false)}
            onUpdateSimState={(newState) => setSimState(prev => ({ ...prev, ...newState }))}
          />
        )}
      </div>

      {/* Modal 1: BOM (Bill of Materials) Jadvali */}
      <BomModal
        isOpen={isBomOpen}
        onClose={() => setIsBomOpen(false)}
        objects={sceneObjects}
      />

      {/* Modal 2: Arduino Pin Taqsimoti, .ino Kodi va Wiring Diagrammasi */}
      <ArduinoPanel
        isOpen={isArduinoOpen}
        onClose={() => setIsArduinoOpen(false)}
        objects={sceneObjects}
        pinMappings={pinMappings}
        onUpdatePinMappings={setPinMappings}
      />

      {/* Modal 3: LDraw Library Source (Local folder / CDN) */}
      <LDrawSourceModal
        isOpen={isLDrawSourceOpen}
        onClose={() => setIsLDrawSourceOpen(false)}
      />
    </div>
  );
}

/**
 * Every panel below reads its labels through useI18n, and the provider used to
 * live in the Vite entry point that mounted this app. There is no entry point
 * any more - the route imports App directly - so the provider belongs here,
 * which also keeps the module's three languages from leaking into the rest of
 * the platform.
 */
export default function HardwareModule() {
  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}
