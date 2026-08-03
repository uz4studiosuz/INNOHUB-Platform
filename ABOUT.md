# INNOHUB Platform

STEM ta'limi uchun muhandislik simulyatsiya platformasi. O'quvchi bu yerda
tayyor animatsiyani tomosha qilmaydi — o'zi konstruksiya tuzadi, uni haqiqiy
fizika formulalari bo'yicha hisoblatadi, natijani ko'radi va qaytadan
takomillashtiradi.

Butun interfeys **o'zbek tilida** (rus va ingliz tillari ham bor).

---

## 1. Platforma nima qiladi?

Beshta mustaqil modul bor. Har biri alohida muhandislik sohasi, lekin
hammasi bir xil ish oqimiga bo'ysunadi: **o'rgan → qur → hisobla → o'lcha →
yaxshila**.

| Modul | Nima qilinadi | Fizika qayerda hisoblanadi |
| --- | --- | --- |
| ✈️ **Planyor** | Qanot, dumcha va fyuzelyaj o'lchamlarini tanlab, planyor loyihalash | Brauzerda (TypeScript) |
| 🚀 **Raketalar** | Model raketa: dvigatel, korpus, burun konusi, stabilizatorlar | Brauzerda (TypeScript) |
| 🔌 **Elektronika** | Tinkercad uslubidagi zanjir muharriri + Arduino kod interpretatori | Brauzerda (TypeScript) |
| 🏗️ **Tuzilmalar** | Ferma (truss) ko'prigi va balka/ustun hisobi | **Python dvigatelida** |
| 🧩 **3D Konstruktor** | LEGO Technic uslubidagi 3D robot yig'ish + Arduino kodi | Brauzerda (Three.js) |

---

## 2. Arxitektura: ikkita hisoblash dvigateli

Bu platformaning eng muhim texnik qarori — fizikani **ikki joyda** hisoblash.

```
                    ┌──────────────────────────────┐
                    │        BRAUZER (web/)        │
                    │   Next.js 16 + React 19      │
                    ├──────────────────────────────┤
   Foydalanuvchi ──▶│  Planyor    │ lib/physics/   │  ← real vaqtda,
                    │  Raketalar  │  *.ts          │    har kadrda
                    │  Elektronika│ electronics/   │
                    │             │  engine.ts     │
                    │  3D Konstr. │ Three.js       │
                    ├─────────────┴────────────────┤
                    │  Tuzilmalar                  │
                    └──────────┬───────────────────┘
                               │ POST /api/simulate
                               ▼
                    ┌──────────────────────────────┐
                    │      PYTHON DVIGATELI        │
                    │        (engine/)             │
                    │  matritsa yechimi, chidamlik │
                    └──────────────────────────────┘
```

**Nega shunday?**

- **Brauzer tarafi** — sichqonchani surganingizda natija *darhol* o'zgarishi
  kerak bo'lgan joylar. Serverga so'rov yuborish kechikish beradi, shuning
  uchun planyor, raketa va elektronika fizikasi to'g'ridan-to'g'ri
  brauzerda ishlaydi.
- **Python tarafi** — ferma tahlili chiziqli tenglamalar sistemasini
  yechishni talab qiladi (matritsa). Bu og'irroq va bir marta "Sinov" tugmasi
  bosilganda ishlaydi, shuning uchun serverda turadi.

Ulanish nuqtasi bitta: [web/src/app/api/simulate/route.ts](web/src/app/api/simulate/route.ts).
U [web/src/lib/pythonRunner.ts](web/src/lib/pythonRunner.ts) orqali
`python engine/run_sim.py` jarayonini ishga tushiradi, JSON'ni `stdin`ga
yozadi va `stdout`dan JSON o'qiydi. Ya'ni HTTP server emas — oddiy jarayon
chaqiruvi.

---

## 3. Texnologiyalar

**Frontend** ([web/package.json](web/package.json))

| Kutubxona | Nima uchun |
| --- | --- |
| Next.js 16.2.10 (Turbopack) | Sahifalar, App Router, API route |
| React 19.2.4 | UI |
| Tailwind CSS 4 | Uslublar |
| Zustand 5 | Holat boshqaruvi (store) |
| Three.js + @react-three/fiber + drei | 3D sahnalar (planyor, raketa, ko'prik, konstruktor) |
| Konva + react-konva | 2D chizma (ferma quruvchisi) |
| Recharts | Grafiklar |
| Framer Motion | Animatsiyalar |
| lucide-react | Ikonkalar |

**Backend** ([engine/](engine/))

Python 3, **faqat standart kutubxona** — `math`, `json`, `os`, `sys`,
`pathlib`. Hech qanday `numpy`, `scipy` yoki tashqi paket kerak emas.
Matritsa yechimi ham qo'lda yozilgan. Shuning uchun `pip install` bosqichi
umuman yo'q.

---

## 4. Kataloglar xaritasi

```
INNOHUB-Platform/
├── ABOUT.md                     ← shu fayl
├── components/                  ← komponentlar ma'lumotnomasi (JSON)
│   ├── aero.json  electronics.json  mechanics.json
│   ├── microelectronics.json  prosthetics.json
│   └── rockets.json  structures.json
│
├── engine/                      ← Python fizika dvigateli
│   ├── run_sim.py               ← yagona kirish nuqtasi (JSON in → JSON out)
│   ├── aerodynamics/            ← havo profillari, ko'tarish/qarshilik, barqarorlik
│   ├── biomechanics/            ← protez modeli
│   ├── core/                    ← dinamika, kinematika, energiya, integrator
│   ├── electronics/             ← Om qonuni, breadboard, yarimo'tkazgichlar
│   ├── flight/                  ← planyor, raketa, dron modellari
│   ├── mechanics/               ← ishqalanish, tishli g'ildirak, richag, prujina
│   ├── physics_lab/             ← mexanika/elektr/to'lqin/termodinamika tajribalari
│   ├── structures/              ← balka va ferma tahlili
│   ├── vehicle/                 ← avtomobil, tormoz, burilish, rover
│   └── tests/                   ← 313 ta test
│
├── web/                         ← Next.js ilovasi
│   ├── public/electronics/      ← Fritzing komponent grafikalari (41 ta SVG)
│   ├── scripts/
│   │   └── gen-electronics-parts.py  ← komponent generatori
│   └── src/
│       ├── app/                 ← sahifalar (30 ta route)
│       ├── components/          ← modul bo'yicha React komponentlari
│       ├── store/               ← Zustand store'lari
│       ├── lib/physics/         ← brauzer tarafidagi fizika
│       └── i18n/                ← tarjimalar
│
└── whitebox-clone/              ← alohida prototip (asosiy ilovaga kirmaydi)
```

---

## 5. Platforma qobig'i

[web/src/components/shell/PlatformShell.tsx](web/src/components/shell/PlatformShell.tsx)
har bir sahifani o'rab turadi:

- **Chap panel** — beshta modul ro'yxati. Modul ichidagi istalgan sahifada
  turganingizda o'sha modul yoritilgan holda qoladi.
- **Yuqori panel** — hozir qayerdaligingiz ("Ish maydoni / Elektronika"),
  til almashtirgich va dvigatel holati.
- **Mobil ko'rinish** — 768px'dan kichik ekranda chap panel yashirilib,
  o'rniga yuqorida gorizontal aylanadigan menyu chiqadi.
- Pastdagi "Dvigatel ishlamoqda" belgisidagi modul soni **kod'dan olinadi**
  (`NAV.length`), qo'lda yozilmagan — shuning uchun eskirmaydi.

**Bosh sahifa** ([web/src/app/page.tsx](web/src/app/page.tsx)) — beshta modul
kartochkasi, har biri qisqacha tavsif bilan.

---

## 6. Modul andozasi: oltita bo'lim

Har bir simulyatsiya moduli bir xil oltita tabdan iborat
([ModuleNavbar.tsx](web/src/components/module-shell/ModuleNavbar.tsx)):

| Tab | Vazifasi |
| --- | --- |
| **HOME** | Modulga kirish, vazifa qo'yilishi |
| **RESEARCH** | Nazariy material — formulalar, tushuntirishlar |
| **ENGINEERING** | **Asosiy ish maydoni** — bu yerda loyihalaysiz |
| **COMPETITION** | Sinov/musobaqa — natijalar reyting jadvaliga tushadi |
| **OUTPUTS** | Hisobot, grafiklar, chop etiladigan shablonlar |
| **BUILD AND TEST** | Haqiqiy hayotda yasash bo'yicha ko'rsatmalar |

`module-shell` papkasida umumiy qismlar bor:
`ModuleWorkspace`, `Leaderboard` (reyting), `IterationOutputs` (urinishlar
tarixi) va [moduleConfig.ts](web/src/components/module-shell/moduleConfig.ts)
(har bir modulning nomi, yo'li, rangi).

---

## 7. Modullar batafsil

### 7.1 ✈️ Planyor

**Ish maydoni:** 3D sahnada planyor turadi, tepada optimizatsiya paneli.

Sozlanadigan qismlar ([gliderStore.ts](web/src/store/gliderStore.ts)):
fyuzelyaj, qanot, gorizontal stabilizator, vertikal stabilizator.

Tahlil rejimlari: **og'irlik, ko'tarish kuchi, qarshilik, kren (roll),
tangaj (pitch), rishta (yaw)**. Tanlangan rejim 3D ko'rinish ustiga qatlam
bo'lib chiqadi.

Fizika: [lib/physics/gliderPhysics.ts](web/src/lib/physics/gliderPhysics.ts) va
[aerodynamics.ts](web/src/lib/physics/aerodynamics.ts) — NACA havo profillari,
ko'tarish/qarshilik koeffitsiyentlari, planirovka nisbati.

### 7.2 🚀 Raketalar

**Ish maydoni:** 3D raketa modeli, yonida "docking station" — qismlar
katalogi.

Sozlanadigan bo'limlar ([rocketStore.ts](web/src/store/rocketStore.ts)):
dvigatel (propulsion), qutqaruv tizimi (recovery), burun konusi, korpus
naychasi, o'tish qismi, stabilizatorlar (fins).

Alohida e'tiborga loyiq ikkita narsa:

- **Stabilizator konturi muharriri** — stabilizator shakli raketaning
  *ustida* tahrirlanadi, yonidagi alohida oynada emas. Ya'ni shaklni
  o'zgartirganda uni qaysi korpusga qo'yayotganingiz ko'rinib turadi.
- **CG/CP halqalari** — og'irlik markazi va bosim markazi. Barqarorlik
  panelini ochganingizda avtomatik chiqadi (chunki gap aynan ular haqida),
  xohlasangiz doimiy yoqib qo'yish mumkin.
- **Chop etiladigan shablonlar** ([PrintTemplates.tsx](web/src/components/rocket-lab/PrintTemplates.tsx))
  — loyihalagan stabilizatoringizni qog'ozga chiqarib, haqiqiy raketa
  yasash uchun.

Fizika: [rocketPhysics.ts](web/src/lib/physics/rocketPhysics.ts) — 1000
qatordan ortiq: tortish kuchi, massa o'zgarishi, havo qarshiligi, apogey,
barqarorlik marjasi.

### 7.3 🔌 Elektronika

Bu modul **Tinkercad Circuits**ning ishlash tartibini takrorlaydi.

**Komponentlar kutubxonasi — 37 ta qism.** Hech biri qo'lda chizilmagan:
hammasi [Fritzing parts](https://github.com/fritzing/fritzing-parts)
kutubxonasidan olingan haqiqiy grafika (CC BY-SA 3.0, batafsil:
[web/public/electronics/CREDITS.md](web/public/electronics/CREDITS.md)).

Kutubxona ikkiga bo'linadi:

1. **9 ta qo'lda sozlangan qism** — ustiga "jonli" qatlam chiziladigan
   qismlar: LED (yonganda porlaydi), RGB LED, rezistor (rangli chiziqlari
   qiymatga qarab o'zgaradi), servo (qo'li aylanadi), potensiometr, tugma,
   piezo, Arduino Uno, breadboard.
2. **27 ta avtomatik generatsiya qilingan qism** —
   [scripts/gen-electronics-parts.py](web/scripts/gen-electronics-parts.py)
   skripti Fritzing'ning `.fzp` fayllarini yuklab, ulardan SVG'ni topadi va
   **pin koordinatalari, nomlari hamda ichki ulanishlarini** rasmning
   o'zidan o'qib chiqadi. Hech bir raqam qo'lda kiritilmagan — shuning uchun
   30 ta qismning pinlari ham to'g'ri joyda turadi.

**Yagona masshtab.** Fritzing SVG'lari haqiqiy o'lchamda chizilgan, shuning
uchun barchasi bitta konstantadan o'tkaziladi:
[units.ts](web/src/components/electronics/units.ts) — `PX_PER_INCH = 144`.
Natijada rezistor Arduino yonida haqiqatan rezistor kattaligida ko'rinadi
(62×14 px va 425×302 px), xuddi Tinkercad'dagidek.

**Simulyatsiya dvigateli** ([engine.ts](web/src/components/electronics/engine.ts)):

- Simlar va komponentlarni **union-find** algoritmi bilan elektr tugunlariga
  (net) birlashtiradi.
- Manbalardan (Arduino pinlari, batareyalar) "quvvat" tarqalishini va
  yerga (GND) yo'l borligini **kenglik bo'yicha qidiruv** bilan aniqlaydi.
- **Diod bir yo'nalishli** — shuning uchun ikkita alohida graf saqlanadi:
  quvvat oldinga tarqaladi, "yerga yo'l bormi" esa orqaga qidiriladi.
- Kondensator o'zgarmas tokni **to'sadi** (ko'prik qo'yilmaydi), g'altak
  esa o'tkazadi.
- Rezistorsiz LED to'g'ridan-to'g'ri quvvatga ulansa — **ogohlantirish**
  chiqadi ("kuyish xavfi").

Simulyatsiya qilinadigan qismlar: Arduino, LED, RGB LED, piezo, servo, DC
motor, rezistor, potensiometr, tugma, g'altak, fotorezistor, bosim va
harorat datchiklari, tumbler/qiya/reed kalitlar, diod, kondensator, uchta
batareya turi, breadboard'lar.

Qolganlari (LCD, 7-segment, ultratovush, mikrosxemalar, NeoPixel, qadamli
motor) — chizmaga qo'yish va ulash mumkin, lekin elektr jihatdan
ishlamaydi. Bu paletda ham, xossalar panelida ham **ochiq yozilgan**.

**Arduino interpretatori** ([arduino.ts](web/src/components/electronics/arduino.ts),
1400+ qator) — Arduino C tilining bir qismini o'qib bajaradi:

- Tuzilmalar: `if`, `for`, `while`, `do-while`, `switch`, funksiyalar,
  massivlar
- Funksiyalar: `pinMode`, `digitalWrite/Read`, `analogWrite/Read`, `delay`,
  `delayMicroseconds`, `millis`, `tone`, `noTone`, `map`, `constrain`,
  `min`, `max`, `abs`, `random`, `Serial.print/println`, `Servo` obyekti
- Xatolarni **qator va ustun raqami bilan** ko'rsatadi (`SourceMap`).

Kod generator emas, **haqiqiy interpretator** — `delay()` chaqirilganda
simulyatsiya to'xtab turadi, keyin davom etadi.

Tayyor misollar: LED miltillashi (Blink), tugma bilan LED, PWM bilan
xiralashish (Fade).

### 7.4 🏗️ Tuzilmalar

Ikki qismdan iborat:

**a) Ferma quruvchisi (Truss Builder)** — 2D chizmada tugunlar va sterjenlar
qo'yasiz, tayanchlarni belgilaysiz, yuk qo'yasiz. Hisob Python tarafiga
yuboriladi:

- `truss` — har bir sterjendagi kuch, kuchlanish, xavfsizlik zaxirasi,
  cho'zilish/siqilish holati
- `truss_loadtest` — konstruksiya **qaysi yukda sinishi**, qaysi sterjen
  birinchi bo'lib ishdan chiqishi, massaga nisbatan samaradorlik
- Statik aniqlik tekshiruvi (`2j` va `m + r` taqqoslash) — konstruksiya
  hisoblanadigan holatdami yoki mexanizm bo'lib qolganmi

**b) Balka/Ustun kalkulyatori** — egilish momenti, kuchlanish, egilish
kattaligi, Eyler bo'yicha burilish yuki (kritik kuch).

**Truck Rally arenasi** (COMPETITION bo'limi) — qurgan ko'prigingiz 3D
arenaga chiqadi va uning ustidan yuk mashinasi haydab o'tadi. Stadion,
tomoshabinlar, tuproq maydon, projektorlar bor. To'rtta kamera burchagi:
tomoshabin, ko'prik ustidagi kabina, past kabina, erkin aylanish. Sterjenlar
ulardagi kuch kattaligiga qarab ranglanadi (100 N dan 1100 N gacha).

Reyting: [bridgeLeaderboardStore.ts](web/src/store/bridgeLeaderboardStore.ts)
— loyiha nomi, material, massa, sinish yuki va samaradorlik saqlanadi.

### 7.5 🧩 3D Konstruktor

LEGO Technic uslubidagi 3D yig'ish muhiti
([web/src/components/hardware/](web/src/components/hardware/)).

Uchta rejim:

- **Erkin qurish** (`free_build`) — katalogdan detal olib, sahnaga qo'yish
- **To'plam yig'ish** (`kit_assembly`) — tayyor robot to'plamlari
  (2 g'ildirakli mashina, 4 g'ildirakli mashina va h.k.) bosqichma-bosqich
- **Simulyatsiya** (`simulation`) — motor tezligi, servo burchagi, masofa
  datchigi qiymatlarini o'zgartirib ko'rish

Muhim qismlari:

| Fayl | Vazifasi |
| --- | --- |
| [ThreeScene.jsx](web/src/components/hardware/components/ThreeScene.jsx) | 3D sahna (1460 qator) |
| [catalog.js](web/src/components/hardware/data/catalog.js) | Detallar katalogi: ramka, mexanika, elektronika, LEGO |
| [legoTechnicParts.js](web/src/components/hardware/data/legoTechnicParts.js) | LEGO Technic detallari |
| [snappingSystem.js](web/src/components/hardware/utils/snappingSystem.js) | Detallarni bir-biriga "yopishtirish" |
| [ldrawLibrary.js](web/src/components/hardware/library/ldrawLibrary.js) | LDraw formatini o'qish |
| [ldrConverter.js](web/src/components/hardware/utils/ldrConverter.js) | `.LDR` fayl import/eksport |
| [codeGenerator.js](web/src/components/hardware/arduino/codeGenerator.js) | Yig'ilgan robot uchun Arduino kodi yaratish |
| [BomModal.jsx](web/src/components/hardware/components/BomModal.jsx) | Detallar ro'yxati (BOM) |

Ya'ni: robotni 3D'da yig'asiz → Arduino pinlariga qismlarni bog'laysiz →
tayyor kod olasiz → detallar ro'yxatini chop etasiz.

Bu modul o'z tarjimalari bilan kelgan; ular platforma lug'atiga
qo'shib yuborilgan.

---

## 8. Python dvigateli

[engine/run_sim.py](engine/run_sim.py) — yagona kirish nuqtasi. `stdin`ga
JSON keladi, `stdout`ga JSON chiqadi:

```json
{ "module": "truss", "params": { "nodes": [...], "members": [...] } }
```

**14 ta hisoblash turi mavjud:**

| Kalit | Nima hisoblaydi |
| --- | --- |
| `glider` | Planyor parvoz trayektoriyasi |
| `rocket` | Raketa uchishi (tortish, massa yo'qotish, qarshilik) |
| `circuit` | Breadboard'dagi zanjir (tugun potentsiallari) |
| `structure` | Balka: egilish momenti, kuchlanish, burilish yuki |
| `truss` | Ferma: sterjen kuchlari |
| `truss_loadtest` | Ferma: sinish yuki va samaradorlik |
| `drone` | Kvadrokopter + balandlik ushlash PID regulyatori |
| `car` | Avtomobil: tezlanish, tormozlanish, burilish |
| `rover` | Mars roveri: qiyalikda harakat |
| `prosthetic` | Protez: bo'g'im momenti, materiallar, batareya |
| `mechanics` | Ishqalanish, tishli uzatma, richag, prujina |
| `aerodynamics` | Havo profili, ko'tarish/qarshilik, barqarorlik |
| `physics_lab` | Mexanika, elektr, to'lqin va termodinamika tajribalari |
| `microelectronics` | Quvvat sarfi, takt vaqti, GPIO byudjeti, batareya |

> **Diqqat:** hozirgi interfeys bularning faqat bir qismini ishlatadi
> (`truss`, `truss_loadtest`, `structure`). Qolgan to'qqiztasi tayyor va
> testdan o'tgan, lekin ularga UI hali yozilmagan. Ya'ni dvigatel
> interfeysdan kengroq — yangi modul qo'shish uchun asos allaqachon bor.

**Ferma tahlili** ([engine/structures/truss_analysis.py](engine/structures/truss_analysis.py))
qanday ishlaydi:

1. Har bir tugun uchun ikkita muvozanat tenglamasi tuziladi (∑Fx = 0, ∑Fy = 0)
2. Tayanch reaksiyalari noma'lum sifatida qo'shiladi
3. Hosil bo'lgan chiziqli sistema **Gauss usuli** bilan yechiladi (asosiy
   element tanlash — partial pivoting bilan). Agar sistema kvadrat bo'lmasa
   (ortiqcha yoki kam tayanchli ferma), **eng kichik kvadratlar** usuliga
   o'tiladi — shunda ham javob beradi, xato bermay to'xtab qolmaydi
4. Har bir sterjen uchun: kuch → kuchlanish → xavfsizlik zaxirasi
5. Siqiluvchi sterjenlar uchun alohida **Eyler burilishi** tekshiriladi —
   sterjen sinishidan oldin egilib ketishi mumkin, qaysi chegara pastroq
   bo'lsa, o'sha hal qiladi
6. Yuk bosqichma-bosqich oshirilib, birinchi ishdan chiqish nuqtasi topiladi

**Komponentlar ma'lumotnomasi** — [components/](components/) papkasidagi
JSON fayllar. Har bir komponentning nomi, tavsifi, parametrlari (birlik,
sukut, min/max) va unga tegishli funksiyalar ro'yxati bor. Ularni
[component_loader.py](engine/core/component_loader.py) o'qiydi.

---

## 9. Brauzer tarafidagi fizika

[web/src/lib/physics/](web/src/lib/physics/):

| Fayl | Mazmuni |
| --- | --- |
| `rocketPhysics.ts` | Raketa: tortish, apogey, barqarorlik (1025 qator) |
| `gliderPhysics.ts` | Planyor: ko'tarish, qarshilik, planirovka |
| `aerodynamics.ts` | NACA profillari, koeffitsiyentlar |
| `mechanics.ts` | Umumiy mexanika |
| `ohmsLaw.ts` | Om qonuni |
| `trussMember.ts` | Sterjen hisobi (tez ko'rsatish uchun) |

---

## 10. Ma'lumot saqlash

Zustand store'lari ([web/src/store/](web/src/store/)):

| Store | Nima saqlaydi |
| --- | --- |
| `gliderStore` | Planyor geometriyasi va faol panel |
| `rocketStore` | Raketa qismlari, natijalar, saqlangan loyihalar |
| `electronicsStore` | Zanjir: komponentlar, simlar + **bekor qilish/qaytarish** (50 qadam) |
| `trussDesignStore` | Ferma chizmasi |
| `bridgeLeaderboardStore` | Ko'prik musobaqasi natijalari |
| `iterationStore` | Barcha modullar bo'yicha urinishlar tarixi |

Ma'lumotlar brauzerning `localStorage`'ida turadi — hozircha server
bazasi yo'q.

---

## 11. Ko'p tillilik

[web/src/i18n/](web/src/i18n/) — uchta til: **o'zbek** (asosiy), rus,
ingliz.

- Manba til — o'zbekcha. Rus yoki ingliz lug'atida kalit topilmasa,
  xom kalit emas, **o'zbekcha matn** ko'rsatiladi.
- Tanlangan til `localStorage`'da saqlanadi, lekin sahifa doim o'zbekchada
  yuklanadi va keyin almashadi — bu server va brauzer render'i
  mos kelmasligining oldini oladi.
- 3D Konstruktor o'z lug'atlari bilan kelgan; ular platforma lug'atiga
  tekis qo'shiladi (`header.*`, `catalog.*`, `ldraw.*` kalitlari).

---

## 12. Ishga tushirish

**Talablar:** Node.js 20+, Python 3.10+ (tashqi paket kerak emas).

```bash
# Frontend
cd web
npm install
npm run dev          # http://localhost:3000

# Python testlari
cd ..
python -m pytest engine/tests -q
```

Agar tizimda `python` buyrug'i boshqa nomda bo'lsa,
`PYTHON_PATH` muhit o'zgaruvchisini bering:

```bash
PYTHON_PATH=python3 npm run dev
```

**Elektronika komponentlarini qayta generatsiya qilish** (yangi qism
qo'shmoqchi bo'lsangiz):

```bash
cd web
python scripts/gen-electronics-parts.py
```

Skript ichidagi `MANIFEST` ro'yxatiga bitta qator qo'shsangiz — qolganini
o'zi qiladi: Fritzing'dan yuklaydi, SVG'ni `public/electronics/`ga yozadi,
`generatedParts.ts`ni yangilaydi.

---

## 13. Sifat nazorati

| Tekshiruv | Buyruq | Holat |
| --- | --- | --- |
| Python testlari | `python -m pytest engine/tests -q` | **313 ta test o'tadi** |
| TypeScript | `cd web && npx tsc --noEmit` | Toza |
| Ishlab chiqarish build'i | `cd web && npm run build` | 30 ta route, muvaffaqiyatli |
| ESLint | `cd web && npx eslint src` | 20 xato, 23 ogohlantirish (quyida) |

Python testlari sohalar bo'yicha bo'lingan: aerodinamika, breadboard,
komponent yuklovchi, yadro, elektronika, parvoz, mexanika,
mikroelektronika, fizika laboratoriyasi, protez, rover, tuzilmalar,
transport.

**ESLint holati ochiq aytilganda toza emas.** Muammolar quyidagi
fayllarda to'plangan: Planyor komponentlari, 3D Konstruktor (`.jsx`
fayllari), `i18n/index.tsx` va `lib/pythonRunner.ts`. Turlari:

| Qoida | Soni |
| --- | --- |
| `@typescript-eslint/no-unused-vars` | 17 |
| `@typescript-eslint/no-explicit-any` | 10 |
| `import/no-anonymous-default-export` | 3 |
| `react-hooks/exhaustive-deps` | 2 |
| `@next/next/*` | 1 |

Elektronika va Tuzilmalar modullari toza. Build va TypeScript ham o'tadi —
bu xatolar kompilyatsiyani to'xtatmaydi, lekin tozalanishi kerak.

---

## 14. Litsenziya va atribusiya

Elektronika modulidagi barcha komponent grafikalari
[Fritzing parts library](https://github.com/fritzing/fritzing-parts)
dan olingan va **CC BY-SA 3.0** litsenziyasi ostida.

Fritzing loyihasining o'z shartiga ko'ra oddiy eslatma yetarli:
*"this image was created with Fritzing."*

To'liq ro'yxat, har bir faylning manbasi va unga kiritilgan o'zgarishlar:
[web/public/electronics/CREDITS.md](web/public/electronics/CREDITS.md).

---

## 15. Hozirgi cheklovlar

Ochiq aytilishi kerak bo'lgan narsalar:

1. **Python dvigatelining 9 ta imkoniyati interfeyssiz** — dron, avtomobil,
   rover, protez, mexanika, aerodinamika, fizika laboratoriyasi,
   mikroelektronika va zanjir hisoblari tayyor, lekin ularni chaqiradigan
   sahifa yo'q.
2. **Elektronikada 10 ga yaqin komponent simulyatsiya qilinmaydi** — LCD,
   7-segment, ultratovush, mikrosxemalar, NeoPixel, qadamli motor. Ular
   chizmaga qo'yiladi va ulanadi, lekin elektr jihatdan hisobga olinmaydi.
   Interfeys buni yashirmaydi.
3. **Server bazasi yo'q** — hamma narsa `localStorage`'da. Boshqa
   kompyuterdan kirsangiz loyihalaringiz ko'rinmaydi.
4. **Foydalanuvchi tizimi yo'q** — yuqoridagi LOGOUT/JOURNAL/FILE tugmalari
   hozircha ishlamaydi.
5. **Elektronika dvigateli sodda model** — u tugunlarga quvvat yetib
   borishini tekshiradi, lekin haqiqiy tok/kuchlanish taqsimotini
   (Kirxgof tenglamalarini) yechmaydi. O'qitish uchun yetarli, lekin
   analog zanjir tahlili emas.
6. **`whitebox-clone/`** — alohida prototip papkasi, asosiy ilovaga
   kirmaydi.
