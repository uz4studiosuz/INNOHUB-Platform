/**
 * Loyihani JSON faylga eksport va import qilish funksiyalari.
 */

export function exportProjectToJson(sceneObjects, pinMappings = {}, projectName = 'robot_project') {
  const data = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    projectName: projectName,
    objectsCount: sceneObjects.length,
    sceneObjects: sceneObjects,
    pinMappings: pinMappings,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importProjectFromJson(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Fayl tanlanmadi'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.sceneObjects || !Array.isArray(parsed.sceneObjects)) {
          throw new Error('Yaroqsiz loyiha fayli formatida sceneObjects topilmadi.');
        }
        resolve({
          projectName: parsed.projectName || 'Yuklangan Loyiha',
          sceneObjects: parsed.sceneObjects,
          pinMappings: parsed.pinMappings || {},
        });
      } catch (err) {
        reject(new Error(`Faylni o'qishda xatolik: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Faylni o\'qib bo\'lmadi'));
    reader.readAsText(file);
  });
}
