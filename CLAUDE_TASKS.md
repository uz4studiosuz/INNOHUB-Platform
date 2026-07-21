# INNOHUB Platform — Claude Code uchun ish rejasi

> Maqsad: WhiteBox Learning (whiteboxlearning.com) klonini yakunlash.
> WhiteBox mohiyati — **har bir modul aynan bir xil Engineering Design Process oqimini takrorlaydi**:
> HOME → RESEARCH → ENGINEERING → COMPETITION → OUTPUTS → BUILD & TEST.
> Hozir bu to'liq oqim faqat `glider` va `structures`da bor. Qolgan modullar hali oddiy "forma + natija" sahifasi.

Bu faylni Claude Code'ga bering va vazifalarni **tartib bo'yicha** bajaring. Har bir vazifada aniq fayl yo'llari va qabul mezoni (acceptance) bor.

---

## Muhim kontekst (o'zgartirishdan oldin o'qing)

- Repo: `engine/` (Python, `/api/simulate` orqali chaqiriladi), `web/` (asosiy Next.js), `whitebox-clone/` (alohida o'lik prototip).
- **Ikki xil UX pattern mavjud:**
  1. **Immersiv workspace** (`glider`, `structures`): `modules/glider/layout.tsx` `fixed inset-0 z-[60]` bilan butun ekranni egallaydi, dashboard sidebar'ini yashiradi, o'zining 6-tab navbar'i bor (`components/glider-lab/GliderNavbar.tsx`). **Bu WhiteBox'ga to'g'ri keladigan pattern.**
  2. **Oddiy sahifa** (`drone`, `rover`, `prosthetics`, `physics-lab`, `electronics`, `microelectronics`): dashboard ichida bitta forma + natija paneli. WhiteBox'ga o'xshamaydi.
- Dev server `--webpack` rejimida ishlaydi (Turbopack binariylari bu mashinada bloklangan). `numpy` ishlatmang — `truss_analysis.py` allaqachon pure-Python.
- Testlar: `pytest` → 289/289 o'tishi kerak. Har o'zgarishdan keyin ishga tushiring.

---

## VAZIFA 0 (P0) — Hozirgi ishni commit qilish

Hech narsa yo'qolib qolmasligi uchun **birinchi shu**.

1. `.claude/` ni `.gitignore`ga qo'shing (agar yo'q bo'lsa).
2. Untracked va o'zgargan fayllarni ko'ring: `git status`.
3. Commit qiling:
   ```bash
   git add engine/ web/
   git commit -m "Add structures module (full tab flow) + drone/rover/prosthetics/physics-lab backend integration"
   ```

**Acceptance:** `git status` toza; `pytest` hali 289/289.

---

## VAZIFA 1 (P0) — Navigatsiyani tuzatish

**Muammo:** `web/src/app/layout.tsx` sidebar faqat 6 havola beradi (Dashboard, editor2d, viewer3d, glider, rockets, electronics, structures). `drone`, `rover`, `prosthetics`, `physics-lab`, `microelectronics`, `/missions`, `/integration` ishlaydi, lekin havola yo'q — foydalanuvchi topa olmaydi.

**Yechim:** `layout.tsx` ichidagi `<nav>` → "Simulyatsiyalar" bo'limiga yetishmayotgan havolalarni qo'shing. Mavjud `<Link>` uslubini (className'ini) aynan takrorlang:

```tsx
<Link href="/modules/drone" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.04)] text-gray-300 hover:text-white transition-all text-sm font-medium">
  🚁 Dron (Drone)
</Link>
<Link href="/modules/rover" className="...same...">🔴 Rover (Mars)</Link>
<Link href="/modules/prosthetics" className="...same...">🦾 Protez (Prosthetics)</Link>
<Link href="/modules/physics-lab" className="...same...">🔬 Fizika laboratoriyasi</Link>
<Link href="/modules/microelectronics" className="...same...">💾 Mikroelektronika</Link>
```

Ixtiyoriy ("Asosiy" ostiga): `/missions` (🎯 Vazifalar) va `/integration` (🧩 Integratsiya) — agar ularni saqlab qolmoqchi bo'lsangiz.

**Acceptance:** Dashboard sidebar'idan barcha 11 modulga o'tish mumkin.

---

## VAZIFA 2 (P1) — Modullarni Glider andozasiga keltirish (ASOSIY ISH)

Har bir "oddiy sahifa" moduliga immersiv 6-tab workspace bering. Har modul uchun `GliderNavbar`ni nusxalamaslik uchun **config-driven umumiy shell** yarating.

### 2a. Umumiy shell komponentlari yaratish

`web/src/components/module-shell/` papkasida:

- `ModuleNavbar.tsx` — `GliderNavbar`ga o'xshash, lekin `basePath` va `tabs` props oladi:
  ```tsx
  type Tab = { label: string; segment: string }; // segment "" = ENGINEERING (index)
  export function ModuleNavbar({ basePath, tabs, title }: {
    basePath: string; tabs: Tab[]; title: string;
  }) { /* usePathname bilan active holat, glider navbar uslubi */ }
  ```
- `ModuleWorkspace.tsx` — `glider/layout.tsx`dagi `fixed inset-0 z-[60]` konteynerini takrorlaydi, ichida `<ModuleNavbar/>` + `{children}`.
- `moduleConfig.ts` — barcha modullar uchun registry:
  ```ts
  export const MODULES = {
    drone: { title: "Drone", accent: "#d97706", engineParam: "drone", /* slider defs, result fields */ },
    rover: { ... }, prosthetics: { ... }, /* va h.k. */
  };
  ```

### 2b. Har modul uchun tab papkalarini yaratish

`drone`, `rover`, `prosthetics`, `physics-lab`, `electronics`, `microelectronics` uchun `glider`dagi tuzilmani takrorlang:

```
modules/<name>/
  layout.tsx          → <ModuleWorkspace basePath="/modules/<name>" tabs={...} />
  page.tsx            → ENGINEERING (hozirgi forma+natija shu yerga ko'chadi)
  home/page.tsx       → modul haqida kirish, EDP diagrammasi
  research/page.tsx   → o'quv material (structures/research'ni namuna qiling)
  competition/page.tsx→ VAZIFA 6ga qarang
  outputs/page.tsx    → VAZIFA 5ga qarang (iteratsiya tarixi)
  build-test/page.tsx → real-hayot qurilish yo'riqnomasi / 3D-print eslatmasi
```

Hozirgi `drone/page.tsx` (va boshqalarning) mazmunini `page.tsx` (ENGINEERING tab)ga ko'chiring — lekin `min-h-screen p-6` o'rniga shell ichida ishlashiga moslang.

**Namuna sifatida o'qing:** `modules/glider/layout.tsx`, `components/glider-lab/GliderNavbar.tsx`, `modules/structures/*`.

**Acceptance:** Har bir modul glider bilan bir xil 6-tab navbarga ega; ENGINEERING tab hozirgidek hisoblaydi; testlar buzilmagan.

> **Eslatma:** Katta vazifa. Bir modulni (masalan `drone`) to'liq tugatib, pattern to'g'riligini tekshiring, keyin qolganlariga ko'chiring.

---

## VAZIFA 3 (P1) — Fizika arxitekturasini hujjatlashtirish/bittalashtirish

**Muammo:** `glider`/`rockets` client-side TS fizika (`lib/physics/gliderPhysics.ts`, `rocketPhysics.ts`); `drone`/`rover`/`prosthetics`/`physics-lab`/`electronics` Python `/api/simulate`. Ikki xil model chalkashlik tug'diradi.

**Tavsiya (o'zgartirmasdan, faqat hujjatlashtirish yetarli bo'lishi mumkin):**
- Backend `/api/simulate` yagona haqiqat manbai (source of truth) bo'lib qolsin — sonli aniqlik va testlar Python'da.
- `glider`/`rockets` real-vaqt UI uchun client-side qolsin, LEKIN yakuniy natijani `/api/simulate` (`glider`, `rocket` modullari mavjud) bilan solishtirib validatsiya qiling.
- `web/src/lib/physics/index.ts` barrel'iga `gliderPhysics`/`rocketPhysics`ni ham eksport qilib, importlarni bir xillashtiring.

Yoki: agar hammasini client-side qilmoqchi bo'lsangiz, `engine/` formulalarini TS'ga port qiling. **Bitta yo'lni tanlab, `web/README.md`da yozib qo'ying.**

**Acceptance:** Qaysi modul qaysi fizika manbaidan foydalanishi `README`da aniq yozilgan; `index.ts` barcha physics modullarini eksport qiladi.

---

## VAZIFA 4 (P2) — microelectronics: hisob qo'shish yoki birlashtirish

Hozir faqat statik ensiklopediya (6 chip), hisob yo'q.

**Variant A:** Real kalkulyator qo'shing — masalan quvvat iste'moli (P=VI), soat tezligi bo'yicha kechikish, GPIO/pin budjeti. Backend'ga `microelectronics` moduli qo'shing (`engine/run_sim.py` dispatcher'iga ulang + test yozing).

**Variant B:** `electronics` modulining bir tab'i sifatida birlashtiring, alohida modul qilmang.

**Acceptance:** microelectronics'da yo real hisob bor, yo u electronics ichiga ko'chgan.

---

## VAZIFA 5 (P2) — Iteratsiya tarixi (WhiteBox yadro funksiyasi)

WhiteBox'ning asosiy g'oyasi: "design, test, **refine, repeat**" — talaba urinishlarini saqlaydi va solishtiradi. Hozir yo'q.

- Har modul uchun Zustand store (yoki bitta umumiy `store/iterationStore.ts`) — har "Hisoblash"da parametrlar + natijani `localStorage`ga saqlang.
- OUTPUTS tab'ida iteratsiyalar jadvali: sana, kalit parametrlar, kalit natija, "eng yaxshi"ni belgilash.
- Recharts bilan iteratsiyalar bo'yicha trend grafigi (recharts allaqachon loyihada bo'lsa ishlating).

**Acceptance:** Foydalanuvchi bir necha marta hisoblab, OUTPUTS'da urinishlar tarixini ko'ra oladi (sahifa yangilangach ham saqlanadi).

---

## VAZIFA 6 (P2) — Competition tab (leaderboard)

WhiteBox Nationals — reyting asosida raqobat. Hozir bo'sh/yo'q.

- COMPETITION tab'ida mock leaderboard: eng yaxshi natijalar reytingi (masalan glider uchun parvoz masofasi, drone uchun T/W).
- Foydalanuvchining eng yaxshi iteratsiyasini (VAZIFA 5'dan) jadvalga qo'shing.
- Backend shart emas — client-side + localStorage yetarli (demo uchun).

**Acceptance:** Har modulning COMPETITION tab'i reyting jadvalini ko'rsatadi va foydalanuvchi natijasini joylashtiradi.

---

## VAZIFA 7 (P3) — Tozalash (repo gigiyenasi)

O'lik/orphan fayllar (tahlil tasdiqlagan):
- `hardware.cpp`, `hardware.exe` — o'chiring.
- `Текстовый документ.txt` (Continue.dev config, tasodifan qo'shilgan) — o'chiring.
- `package-lock.json` (root, bo'sh) — o'chiring.
- `electronics_calc.py`, `check_test.py` (root, hech qanday runnerga ulanmagan) — o'chiring yoki `engine/`ga to'g'ri ulang.
- `components/*.json` (root, 7 fayl, hech kim o'qimaydi) — agar komponent-katalog rejasi bo'lsa `web/`ga ko'chiring, aks holda o'chiring.
- `whitebox-clone/` — butunlay alohida o'lik prototip. Qaror qiling: (a) butunlay o'chirish, yoki (b) `web/`ga foydali qismini (masalan lessons tarkibi) ko'chirib, qolganini o'chirish.

Har o'chirishdan oldin `git rm` bilan qiling va alohida commit: `"Cleanup: remove orphan/dead files"`.

**Acceptance:** Repo faqat `engine/` + `web/` (+ ixtiyoriy hujjatlar)dan iborat; `pytest` 289/289; `web` dev server (`--webpack`) muammosiz ishlaydi.

---

## Bajarish tartibi (tavsiya)

1. VAZIFA 0 (commit) → 2. VAZIFA 1 (navigatsiya) → 3. VAZIFA 7 (tozalash) — bularning uchtasi bir kunda, loyiha darrov "toza va to'liq" ko'rinadi.
4. Keyin VAZIFA 2 (bitta modulni namuna qilib) → qolgan modullar.
5. So'ng VAZIFA 5, 6, 4, 3.

Har bosqichdan keyin: `cd web && npm run dev -- --webpack` bilan ko'zdan kechiring va `pytest` ishga tushiring.
