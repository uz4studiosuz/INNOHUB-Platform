# Truck Rally — WhiteBox arena ko'rinishiga o'tkazish (Agent uchun ko'rsatma)

## Maqsad
Structures modulining **Competition (Truck Rally)** sinov maydonini WhiteBox Learning
"STRUCTURES 2.0 → Truck Rally" ekraniga o'xshatish.

> Manba: videoning 8:40–9:10 (Truck Rally) qismidagi kadrlar + foydalanuvchi bergan
> skrinshotlar asosida. Videoning ovozli izohi (transkript) mavjud emas, shuning uchun
> tavsif faqat vizual kadrlarga asoslangan.

### Reference sahna aslida qanday (videodan aniqlangan)
- **Oval stadion/arena**: atrofida uzluksiz pog'onali tomoshabin minbari (ko'k
  o'rindiqlar + rang-barang olomon), track chetidagi to'siq devorda reklama bannerlari.
- **Tuproqli (dirt) maydon**: to'q jigarrang, kertikli yer.
- **Ko'prik MARKAZDA va BALAND turadi**: o'rtada tosh/qoya tirgak (pier/abutment) va
  to'q rangdagi **metall karkas (scaffolding)** ustida. Yassi yerda EMAS.
- **Ikki tomondan ramp (qiyalik)**: to'q metall/tuproq ramp'lar ko'prik pardozigacha
  ko'tariladi — truck bir rampdan chiqadi → ko'prikdan o'tadi → narigi rampdan tushadi.
- **Ko'prik ostida singan yog'och qoldiqlari uyumi** (avval sinib ketgan ko'priklardan).
- **Monster-truck'lar to'q sariq (orange)**, katta protektorli g'ildiraklar.
- **Fon**: arenani o'rab turgan tog'lar halqasi + bulutli/ochiq ko'k osmon.
- **Kamera menyusi** (chap-yuqori): `Crowd`, `High Bridge Truck Bed`, `Low Bridge Truck Bed`.
- **Kuch legendasi** (o'ng): 1100N qora · 900N jigarrang · 700N ko'k · 500N yashil ·
  300N to'q sariq · 100N sariq.

### O'zgartiriladigan asosiy elementlar
1. **Arena muhiti** — oval stadion + minbar + tuproq maydon + tog'/osmon fon.
   (Hozirgi "kanyon + archa daraxtlar" o'rniga.)
2. **Kamera preset menyusi** — `Crowd`, `High Bridge Truck Bed`, `Low Bridge Truck Bed`
   (+ `Orbit` erkin ko'rinish).
3. **Kuch rangi legendasi** (o'ng panel) — 100N…1100N rangli chiplar; a'zolar kuch
   kattaligiga qarab ranglanadi.
4. **Monster-truck** — to'q sariq, kattaroq g'ildiraklar, balandroq podvеska.
5. **Tab nomi** — "COMPETITION" → "TRUCK RALLY".
6. **(Faza 2, ixtiyoriy — murakkabroq)** Baland ko'prik + tosh tirgak + ikki ramp +
   metall karkas rig'i, truck rampdan chiqib-tushadigan yo'l.

> Muhim: barcha o'zgarishlar **faqat render/vizual**. Analiz (kuch hisoblari,
> `/api/simulate`, leaderboard) o'zgarmaydi. Bridge geometriyasi (nodes/members) ham
> o'zgarmaydi — faqat atrof-muhit, kamera, ranglar va truck.
> Faza 1 = arena/minbar/osmon/kamera/legenda/truck (ko'prik hozirgidek joyida qoladi).
> Faza 2 = baland pier + ramp'lar (truck animatsiya yo'lini uzaytirishni talab qiladi).

---

## Tegishli fayllar
- `web/src/components/structures-lab/engineering/TrussRally3D.tsx` — asosiy rally sahnasi (eng ko'p o'zgarish shu yerda).
- `web/src/components/structures-lab/engineering/trussScene3D.tsx` — umumiy truss render (o'zgarmaydi, faqat force-rang uchun kichik qo'shimcha bo'lishi mumkin).
- `web/src/app/modules/structures/competition/page.tsx` — gauge/legend paneli va viewport.
- `web/src/components/structures-lab/StructuresNavbar.tsx` — tab nomi.

Kodlash uslubi mavjud faylga mos bo'lsin: `seededRandom` ishlatish (render ichida
`Math.random()` YO'Q), og'ir hisoblar `useMemo` ichida, r3f `useFrame` render-loop uchun.

---

## 1) Arena muhiti — `TrussRally3D.tsx`

### 1.1 Olib tashlash / o'zgartirish
- `GroundBank` — ikkita bank + kanyon oralig'i o'rniga **bitta yaxlit arena floor** qil.
- `Tree` va `forestTrees` — archa o'rmonini olib tashla (yoki arena tashqarisiga siyrak qoldir).
  Reference'da daraxt yo'q; asosiy fon — minbar va tog'lar.

### 1.2 Arena floor (tuproq maydon)
Butun sahna ostiga katta doiraviy/oval tuproq maydon. Ko'prik shu maydon ustida,
ikki uchida tuproqli ramp/abutment bo'ladi (kanyon emas).

```tsx
function ArenaFloor({ radius, y }: { radius: number; y: number }) {
  return (
    <mesh position={[0, y - 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius * 6, 48]} />
      <meshStandardMaterial color="#6b4f2a" roughness={1} />
    </mesh>
  );
}
```
> `deckY` (ko'prik pastki qirrasi) ni floor darajasi sifatida ishlat, hozir kodda bor.
> Ikki uchdagi tuproq ramp'lar uchun eski `GroundBank` box'ini rangini `#6b4f2a` ga
> o'zgartirib qoldirish mumkin (kanyon oralig'ini yopmasdan, ko'prik uchlari ostiga).

### 1.3 Tomoshabinlar minbari (crowd stands)
Arena atrofida 2-4 ta pog'onali (tiered) minbar. Har biri qiya box, ustiga
prosedural "olomon" teksturasi (rangli nuqtalar) yopishtiriladi.

```tsx
// modul darajasida, bir marta yaratiladigan crowd teksturasi
let crowdTextureCache: THREE.CanvasTexture | null = null;
function getCrowdTexture(): THREE.CanvasTexture {
  if (crowdTextureCache) return crowdTextureCache;
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#243b6b"; ctx.fillRect(0, 0, 128, 64);
  const colors = ["#e2e8f0", "#f97316", "#dc2626", "#facc15", "#38bdf8", "#a3e635"];
  for (let i = 0; i < 900; i++) {
    // seededRandom bilan (render tashqarisida — bu modul-level, bir marta)
    const rx = seededRandom(i * 7 + 1), ry = seededRandom(i * 7 + 2), rc = seededRandom(i * 7 + 3);
    ctx.fillStyle = colors[Math.floor(rc * colors.length)];
    ctx.fillRect(rx * 128, ry * 64, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 2);
  crowdTextureCache = t;
  return t;
}

function CrowdStand({ position, rotationY, width, height }: {
  position: [number, number, number]; rotationY: number; width: number; height: number;
}) {
  const tex = getCrowdTexture();
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* qiya minbar yuzasi */}
      <mesh rotation={[-Math.PI / 6, 0, 0]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={tex} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* minbar asosi (kulrang beton) */}
      <mesh position={[0, -height * 0.28, height * 0.22]} receiveShadow>
        <boxGeometry args={[width, height * 0.5, height * 0.45]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.9} />
      </mesh>
    </group>
  );
}
```
Sahnaga 4 ta stand joylashtir (ko'prikdan uzoqroq, arena chekkasida):
```tsx
const arenaR = radius * 4;
<CrowdStand position={[0, deckY + arenaR * 0.35, -arenaR]} rotationY={0}          width={arenaR * 2.2} height={arenaR * 0.9} />
<CrowdStand position={[0, deckY + arenaR * 0.35,  arenaR]} rotationY={Math.PI}    width={arenaR * 2.2} height={arenaR * 0.9} />
<CrowdStand position={[-arenaR, deckY + arenaR * 0.35, 0]} rotationY={Math.PI/2}  width={arenaR * 2.2} height={arenaR * 0.9} />
<CrowdStand position={[ arenaR, deckY + arenaR * 0.35, 0]} rotationY={-Math.PI/2} width={arenaR * 2.2} height={arenaR * 0.9} />
```

### 1.4 Osmon va tog'lar
`<color attach="background">` ni ochiqroq havo rangga (`#7db4e6`) o'zgartir yoki
katta sky-dome sfera qo'sh (BackSide). Uzoqda past-poli tog' halqasi (konuslar):

```tsx
function SkyDome({ radius }: { radius: number }) {
  return (
    <mesh scale={[1, 1, 1]}>
      <sphereGeometry args={[radius * 20, 24, 16]} />
      <meshBasicMaterial color="#7db4e6" side={THREE.BackSide} />
    </mesh>
  );
}
function MountainRing({ radius, y }: { radius: number; y: number }) {
  const peaks = useMemo(() => Array.from({ length: 14 }).map((_, i) => {
    const ang = (i / 14) * Math.PI * 2;
    const rr = seededRandom(i * 5 + 11);
    return { x: Math.cos(ang) * radius * 12, z: Math.sin(ang) * radius * 12, h: radius * (2 + rr * 2.5) };
  }), [radius]);
  return <>{peaks.map((p, i) => (
    <mesh key={i} position={[p.x, y, p.z]}>
      <coneGeometry args={[p.h * 0.9, p.h, 4]} />
      <meshStandardMaterial color="#5b6b52" roughness={1} />
    </mesh>
  ))}</>;
}
```

### 1.4b Stadion projektor chiroqlari (detal)
Reference'da arena chetida ustunli **projektor chiroqlari** (rectangular light panel
on a pole) bor. Bir nechta joyga qo'y — ustun (yupqa cylinder/box) + ustida oq panel;
ixtiyoriy ravishda haqiqiy `<pointLight>` ham qo'shsa bo'ladi:
```tsx
function FloodLight({ x, z, y, h }: { x: number; z: number; y: number; h: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.06, 0.06, h, 8]} /><meshStandardMaterial color="#3f3f46" /></mesh>
      <mesh position={[0, h, 0]} rotation={[Math.PI / 8, 0, 0]}><boxGeometry args={[1.2, 0.7, 0.12]} /><meshStandardMaterial color="#e5e7eb" emissive="#fff7d6" emissiveIntensity={0.6} /></mesh>
    </group>
  );
}
```

### 1.5 Reklama bannerlari + singan yog'och qoldiqlari (detal)
- **Bannerlar**: track chetidagi past to'siq devorga (minbar oldida) rangli plane'lar
  qatorini qo'y (oddiy rangli box/plane, ixtiyoriy `MeshBasicMaterial`). Arena hissini beradi.
- **Debris (qoldiqlar)**: ko'prik ostiga bir nechta kichik jigarrang box'larni tartibsiz
  (seededRandom bilan) sochib qo'y — sinib ketgan yog'ochlar uyumi effekti:
```tsx
function DebrisPile({ x, y, z, count = 14 }: { x: number; y: number; z: number; count?: number }) {
  const bits = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    dx: (seededRandom(i * 4 + 1) - 0.5) * 3,
    dz: (seededRandom(i * 4 + 2) - 0.5) * 3,
    ry: seededRandom(i * 4 + 3) * Math.PI,
    len: 0.6 + seededRandom(i * 4 + 4) * 1.2,
  })), [count]);
  return <>{bits.map((b, i) => (
    <mesh key={i} position={[x + b.dx, y + 0.1, z + b.dz]} rotation={[0, b.ry, Math.PI / 2]}>
      <boxGeometry args={[0.12, b.len, 0.12]} />
      <meshStandardMaterial color="#c19a6b" roughness={0.9} />
    </mesh>
  ))}</>;
}
```

---

## 2) Kamera presetlari — `TrussRally3D.tsx`

Hozirgi `cameraMode: "orbit" | "driver"` toggle o'rniga **preset dropdown**.
Reference nomlariga mos 4 rejim.

### 2.1 State
```tsx
type CamPreset = "orbit" | "crowd" | "highBed" | "lowBed";
const [camPreset, setCamPreset] = useState<CamPreset>("crowd");
```

### 2.2 Har bir preset uchun kamera pozitsiya/target hisoblab beruvchi komponent
`DriverCamera` ni umumlashtir — `PresetCamera` qil. Truck pozitsiyasi (`truckPos`),
`radius`, `deckY` va `camPreset` asosida har frame'da kamerani lerp qiladi:

```tsx
function PresetCamera({ preset, truckPos, center, radius, deckY }: {
  preset: CamPreset; truckPos: THREE.Vector3; center: THREE.Vector3;
  radius: number; deckY: number;
}) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (preset === "crowd") {
      desired.set(0, deckY + radius * 2.2, radius * 5);   // minbardan keng ko'rinish
      target.copy(center);
    } else if (preset === "highBed") {
      desired.set(truckPos.x - radius * 1.2, truckPos.y + radius * 1.1, truckPos.z + radius * 0.9);
      target.copy(truckPos);
    } else if (preset === "lowBed") {
      desired.set(truckPos.x - radius * 0.9, truckPos.y + 0.6, truckPos.z + 0.4);
      target.set(truckPos.x + radius, truckPos.y + 0.4, truckPos.z);
    }
    camera.position.lerp(desired, 0.08);
    camera.lookAt(target);
  });
  return null;
}
```
- `preset === "orbit"` bo'lganda `PresetCamera` render qilinmaydi, o'rniga `OrbitControls`
  ishlaydi (hozirgidek).
- `crowd` presetida truck kerak emas; `highBed`/`lowBed` presetlarida truck ko'rinib
  turishi shart (`showTruck`), aks holda `crowd`ga qaytar.

### 2.3 UI — dropdown
Hozirgi `top-2 left-2` dagi ikki tugmani (`🎮 Qo'lda boshqarish` va `📷 ...`)
saqlab qol, lekin kamera tugmasi o'rniga `<select>` qo'y (reference'dagi menyuga o'xshash):

```tsx
<div className="absolute top-2 left-2 flex flex-col gap-2 bg-[#0a0e18]/85 border border-[rgba(255,255,255,0.15)] rounded-lg p-2">
  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Camera</div>
  <select
    value={camPreset}
    onChange={(e) => setCamPreset(e.target.value as CamPreset)}
    className="bg-[#141a2b] border border-[rgba(255,255,255,0.15)] rounded px-2 py-1 text-xs text-white cursor-pointer"
  >
    <option value="crowd">Crowd</option>
    <option value="highBed">High Bridge Truck Bed</option>
    <option value="lowBed">Low Bridge Truck Bed</option>
    <option value="orbit">Orbit (erkin)</option>
  </select>
  {/* Qo'lda boshqarish tugmasi shu yerda qoladi */}
</div>
```

---

## 3) Kuch rangi legendasi (N) — `page.tsx` + `trussScene3D.tsx`

Reference Truck Rally'da a'zolar **kuch kattaligiga** (N) qarab ranglanadi va o'ngda
6 pog'onali legenda bor: `100N sariq · 300N to'q sariq · 500N yashil · 700N ko'k ·
900N jigarrang · 1100N qora`.

> Eslatma: Engineering "Load Test" ekranidagi S/Y (safety/yield) rang sxemasi boshqa
> narsa — uni o'zgartirma. Bu faqat Truck Rally sahnasi uchun kuch-kattaligi rangi.

### 3.1 Force-band rang funksiyasi (`trussScene3D.tsx` ga qo'sh)
```tsx
const FORCE_BANDS: { max: number; color: string; label: string }[] = [
  { max: 100,  color: "#facc15", label: "100N" },
  { max: 300,  color: "#f97316", label: "300N" },
  { max: 500,  color: "#22c55e", label: "500N" },
  { max: 700,  color: "#3b82f6", label: "700N" },
  { max: 900,  color: "#92400e", label: "900N" },
  { max: Infinity, color: "#0a0a0a", label: "1100N" },
];
export function forceBandColor(forceN: number): string {
  const f = Math.abs(forceN);
  return FORCE_BANDS.find((b) => f <= b.max)!.color;
}
```
- `TrussSceneContents`'ga ixtiyoriy `colorByForce?: boolean` prop qo'sh. `true` bo'lsa
  `memberColorFor` o'rniga `forceBandColor(res.forceN)` ishlat (solved bo'lganda).
- `TrussRally3D` `TrussSceneContents`'ni `colorByForce` bilan chaqiradi.

### 3.2 Legenda paneli — `page.tsx`
Hozirgi gauge o'ng-yuqorida (`absolute top-2 right-4`). Uning ostiga yoki yoniga
vertikal rangli chiplar ustunini qo'sh (reference'dagidek). Faqat 3D view'da ko'rsat:

```tsx
{view === "3d" && (
  <div className="absolute top-2 right-4 flex flex-col gap-1">
    {[
      { c: "#0a0a0a", t: "1100N", light: true },
      { c: "#92400e", t: "900N",  light: true },
      { c: "#3b82f6", t: "700N",  light: true },
      { c: "#22c55e", t: "500N",  light: false },
      { c: "#f97316", t: "300N",  light: false },
      { c: "#facc15", t: "100N",  light: false },
    ].map((b) => (
      <div key={b.t} className="w-16 h-7 flex items-center justify-center rounded text-[11px] font-bold"
           style={{ background: b.c, color: b.light ? "#fff" : "#1a1a1a" }}>
        {b.t}
      </div>
    ))}
  </div>
)}
```
> 2D gauge va 3D legenda bir-birini bosib qolmasin — 3D'da gauge'ni chapga/pastga
> suradigan qilib joyla yoki 3D'da legenda, 2D'da gauge ko'rsat.

---

## 4) Monster-truck — `TrussRally3D.tsx` `TruckModel`

Reference — katta g'ildirakli monster-truck. Mavjud `TruckModel`ni kuchaytir:
- `WHEEL_RADIUS` ni `0.34` dan `~0.6` ga oshir (yoki alohida `MONSTER_WHEEL_RADIUS`).
- Kuzovni balandroq ko'tar (podvеska ko'rinishi): body `position.y` ni oshir,
  g'ildirak markazlari bilan kuzov orasida bo'shliq qoldir.
- G'ildirak `cylinderGeometry` radiusi kattaroq, kengroq (protektor uchun `roughness` yuqori).
- Ixtiyoriy: roll-cage (yupqa box/quvurlar), raqam yoki alanga (rang bilan).
Low-poly uslub saqlansin (reference ham low-poly).

> **Detal (videodan)**: reference'da truck **rangi joriy yukka qarab o'zgaradi** — yuk
> oshgani sari kuch shkalasi rangiga (sariq→to'q sariq→…) o'tadi va o'ngdagi legendada
> mos band yoritiladi. Ixtiyoriy: `displayLoad`/`gaugeMaxN` (page.tsx da bor) ni
> `TrussRally3D`ga uzatib, `TruckModel` body materiali rangini `forceBandColor`ga
> bog'lash mumkin. Bu ixtiyoriy — asosiy talab to'q sariq monster-truck.

```tsx
const WHEEL_RADIUS = 0.6;              // monster truck
// body/cab position.y larga +0.35..+0.5 qo'sh, wheels y=0 da qoladi
```
`truckPos` da `deckY + WHEEL_RADIUS` allaqachon g'ildirak radiusiga bog'langan —
`WHEEL_RADIUS` oshsa truck avtomatik balandroq turadi (kodni tekshir).

---

## 5) Tab nomi — `StructuresNavbar.tsx`

`TABS` massivida (10-qator atrofida):
```tsx
{ label: "COMPETITION", href: "/modules/structures/competition" },
```
ni
```tsx
{ label: "TRUCK RALLY", href: "/modules/structures/competition" },
```
ga o'zgartir. **`href` o'zgarmaydi** (route o'sha-o'sha), faqat ko'rinadigan nom.
`page.tsx` sarlavhasidagi "🏆 Monster Truck Rally" allaqachon mos.

---

## 5b) FAZA 2 (ixtiyoriy, murakkabroq) — baland ko'prik + ramp rig'i

Reference'da ko'prik yassi yerda emas, **markazda baland** turadi: o'rtada tosh tirgak
(pier) va to'q metall karkas ustida; ikki yonidan ramp ko'prik pardoziga ko'tariladi;
truck bir rampdan chiqadi → ko'prikdan o'tadi → narigi rampdan tushadi.

Buni bajarish uchun:
- **Ko'prikni ko'tarish**: sahnada butun truss guruhini `deckY` dan yuqoriroqqa (masalan
  `+ radius * 1.5`) `group position` bilan ko'tar. Muhim: analiz koordinatalari o'zgarmasin
  — faqat 3D `group` ko'chiriladi.
- **Tosh tirgak (pier)**: ko'prik markazi ostiga kul-kulrang box/tosh ustun (`#8b8b8b`,
  `roughness 1`) yerdan ko'prikkacha.
- **Metall karkas (scaffolding)**: pier atrofida to'q `#3f3f46` yupqa box'lardan panjara
  (bir nechta vertikal + gorizontal beam), reference'dagi qora ferma tayanchga o'xshash.
- **Ikki ramp**: ko'prik pardozidan yergacha ikkita qiya box (`#4b4b4b`, tuproq/metall),
  truck yo'nalishi (X o'qi) bo'ylab. Bank/kanyon o'rniga shu ramp'lar.
- **Truck yo'lini uzaytirish**: hozir `truckPos.x` faqat `minX..maxX` (ko'prik) oralig'ida.
  Ramp'lar bilan yo'l `minX - rampLen .. maxX + rampLen` bo'lishi va truck balandligi
  (`y`) ramp qiyaligiga mos ko'tarilib-tushishi kerak. Bu `effectiveT` → pozitsiya
  hisobini (`truckPos` useMemo) qayta yozishni talab qiladi: t<0.2 rampga chiqish,
  0.2..0.8 ko'prik, 0.8..1 tushish kabi bosqichlar bilan.
- Bu o'zgarish animatsiya vaqtini (`ANIMATION_MS`, `page.tsx`) va gauge sinxronini
  ham qayta ko'rib chiqishni talab qilishi mumkin — faza 1 tugab, barqaror bo'lgach qil.

> Tavsiya: avval Faza 1 to'liq ishlab, ko'rinishdan mamnun bo'lgach Faza 2 ga o't.
> Faza 2 murakkab; alohida commit/branch bilan qilish ma'qul.

## 6) Tekshirish (verification)
1. `npm run build` / `next dev` — TypeScript va lint xatosiz.
2. Competition tab: 2D va 3D view'lar to'liq balandlikda ochilsin (viewport kichrayib
   qolmasin — bu alohida bug: `page.tsx` ~230-qatordagi `viewportRef` div'iga
   `flex flex-col` qo'shilishi kerak: `flex-1 relative min-w-0` → `flex-1 flex flex-col relative min-w-0`).
3. 3D view: arena floor + crowd stands + osmon/tog'lar ko'rinsin; kanyon/daraxtlar yo'q.
4. Camera dropdown: `Crowd` keng ko'rinish; `High/Low Bridge Truck Bed` truck bilan
   birga; `Orbit` sichqoncha bilan aylanadi.
5. "🚚 Sinovni boshlash" — truck ko'prik ustidan o'tadi, a'zolar kuchga qarab
   ranglanadi, o'ngdagi N-legenda mos keladi.
6. Truck monster-truck ko'rinishida (katta g'ildirak), ko'prik ustida to'g'ri turadi.
7. Ishlash (performance): render ichida `Math.random()` yo'q; teksturalar bir marta
   yaratiladi (cache); og'ir massivlar `useMemo` ichida.

## Ishlar tartibi (tavsiya)
1-avval (0) viewport bug (2-punkt №2) → so'ng (5) tab nomi → (1) arena → (4) truck →
(2) kamera presetlari → (3) force legenda. Har bir qadamdan keyin vizual tekshir.
