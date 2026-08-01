# Model manbalari va litsenziyalari

Bu papkadagi har bir 3D model uchun manba va litsenziya shu yerda qayd etiladi.

**Nega kerak:** GrabCAD, Printables va Sketchfab'dagi modellar har xil litsenziya
bilan keladi. Platformani tarqatganda yoki maktablarga berganda muallif
ko'rsatilmagan model muammo tug'diradi.

## Elektronika va mexanika (`.3mf`, C3MF — rangli)

Hammasi **GrabCAD**'dan yuklab olingan (2026-07-25) va Fusion 360 orqali
STEP → C3MF ga o'girilgan. Konvertatsiya tafsiloti: `SPEC.md` §4.0.1.

⚠ **Muallif ismlari to'ldirilishi kerak** — GrabCAD sahifasida ko'rsatilgan.
Arxiv nomi orqali sahifani topish mumkin (`Downloads` papkasidagi zip nomi).

| Fayl | Detal | GrabCAD arxivi | Muallif | Litsenziya |
|---|---|---|---|---|
| `controllers/arduino-uno.3mf` | Arduino Uno R3 | `arduino-uno-r3-1.snapshot.5.zip` | to'ldirilishi kerak | to'ldirilishi kerak |
| `controllers/esp32-devkit.3mf` | ESP32-WROOM-32D DevKit (CH340, USB-C) | `esp32-wroom-32d-devkit-ch340-usb-c-1.snapshot.10.zip` | | |
| `drivers/l298n.3mf` | L298N motor drayveri | `l298n-stepper-driver-1.snapshot.2.zip` | | |
| `motors/tt-motor.3mf` | TT motor (DC 3-6V, sariq reduktor) | `dc-3v-6v-tt-motor-1.snapshot.3.zip` | | |
| `motors/nema17.3mf` | NEMA 17HS4401-S qadamli motor | `nema-17-hs4401-s-1.snapshot.3.zip` | | |
| `servos/sg90.3mf` | SG90 mikro servo 9g (Tower Pro) | `sg90-micro-servo-9g-tower-pro-1.snapshot.3.zip` | | |
| `servos/mg996r.3mf` | MG996R servo | `mg996r-servo-3.snapshot.9.zip` | | |
| `wheels/wheel-65mm.3mf` | G'ildirak (haqiqiy diametri **68 mm**) | `65mm-wheel-1.snapshot.1.zip` | | |
| `power/battery-18650-4.3mf` | 18650 batareya boksi (4 uyali) | `18650-lipo-battery-and-holder-1.snapshot.3.zip` | | |
| `sensors/hc-sr04.3mf` | HC-SR04 ultratovush masofa sensori | `hc-sr04-ultrasonic-sensor-5.snapshot.4.zip` | | |
| `sensors/mpu6050.3mf` | GY-521 / MPU6050 giroskop-akselerometr | `gy-521-mpu6050-accelerometer-and-gyroscope-module-1.snapshot.2.zip` | | |
| `controllers/raspberry-pi4.3mf` | Raspberry Pi 4B | `quadruped-spider-1.snapshot.1.zip` (ichidan `rpi4b.STEP`) | | |
| `servos/mg90s.3mf` | MG90S metall tishli servo | `quadruped-spider-1.snapshot.1.zip` (ichidan `MG90S.STEP`) | | |
| `wheels/mecanum-wheel.3mf` | Mecanum g'ildirak, 58 mm, 8 rolik | `printable-mecanum-wheel-58mm-8-rollers-24mm-width-1.snapshot.7.zip` | | |

### O'lchamlar va uchburchak soni (tekshirilgan 2026-07-25)

| Fayl | O'lcham (mm) | Uchburchak | Izoh |
|---|---|---|---|
| arduino-uno | 53.3 × 15.3 × 74.9 | 82 238 | uzunligi USB va quvvat uyasi bilan |
| esp32-devkit | 28.6 × 53.3 × 13.7 | 62 662 | |
| l298n | 44.0 × 29.5 × 43.5 | 98 366 | balandligi radiator bilan |
| tt-motor | 22.5 × 70.2 × 36.8 | 2 960 | |
| nema17 | 42.0 × 48.0 × 63.2 | 11 646 | uzunligi o'q bilan |
| sg90 | 37.5 × 32.0 × 16.7 | 48 464 | o'rnatish qanotlari va richagi bilan |
| mg996r | 59.6 × 20.5 × 43.8 | 26 100 | richagi bilan |
| wheel-65mm | 31.8 × 68.0 × 68.0 | 68 022 | **68 mm**, nomi 65 mm |
| battery-18650-4 | 78.0 × 78.8 × 24.7 | 27 068 | |
| hc-sr04 | 45.6 × 20.4 × 15.4 | 69 540 | |
| mpu6050 | 21.0 × 16.0 × 3.8 | 19 264 | |

## ⚠ Yaroqsiz — almashtirilishi kerak

| Fayl | Muammo |
|---|---|
| `wheels/caster.3mf` | **Noto'g'ri detal va endi ishlatilmaydi.** Bu 8 **dyuymli** sanoat g'ildiragi (244 × 241 mm), robot uchun emas. O'rniga kaster **protsedural** qilib yasaldi (`proceduralGeometries.js` → `createCasterMesh`, 25 mm), shuning uchun bu faylni yuklab olish yoki almashtirish **kerak emas**. Fayl faqat tarix uchun qoldi. |

## Konvertatsiya qilinmagan — yig'ma modeli yo'q

Quyidagi arxivlarda **yig'ilgan robot modeli yo'q**, faqat alohida detallar bor.
Ularni robot sifatida ishlatish uchun har detalning joylashuvi qo'lda
aniqlanishi kerak (yig'ma ma'lumoti `.sldasm` da, u esa SolidWorks talab qiladi):

| Arxiv | Nima bor | Xulosa |
|---|---|---|
| `5-dof-robotic-arm-5.snapshot.3.zip` | 10 ta alohida `.stl` (Arm 1, Arm 2, Gripper Base…) | 3D bosma detallar; yig'ma yo'q |
| `quadruped-dog-1.snapshot.8.zip` | 19 ta alohida `.stl` (plita, oyoq bo'g'inlari) | 3D bosma detallar; yig'ma yo'q |
| `quadruped-spider-1.snapshot.1.zip` | Robotning o'zi faqat `.sldprt` da | Yaroqsiz; lekin ichidan Raspberry Pi va MG90S olindi |
| `4wd-robot-car-1.snapshot.4.zip` | `.step`, 350 MB | Juda og'ir; shassi qismini ajratib olish mumkin |

## Konvertatsiya qilinmagan qo'shimcha modellar

Yuklab olingan, lekin hali ishlatilmagan — SPEC §7 dagi namunalar uchun foydali:

| Arxiv | Tarkibi | Ishlatilishi mumkin |
|---|---|---|
| `5-dof-robotic-arm-5.snapshot.3.zip` | 10 ta `.stl` (tayyor format) | Robot qo'l namunasi |
| `quadruped-dog-1.snapshot.8.zip` | 19 ta `.stl` (tayyor format) | To'rt oyoqli robot |
| `quadruped-spider-1.snapshot.1.zip` | `.step` — konvertatsiya kerak | O'rgimchak robot |
| `4wd-robot-car-1.snapshot.4.zip` | `.step`, **350 MB** — juda og'ir, ehtiyot | 4WD namunasi |
| `printable-mecanum-wheel-58mm-...zip` | `.step` | Mecanum g'ildirak |
| `5-connectors-xt60-...zip` | `.step` | XT60 quvvat ulagichi |
| `spur-gear-12-13-teeth-1.snapshot.1.zip` | `.stp` | Shesternya |

## LEGO detallari

LEGO Technic detallari bu papkada emas — ular `public/ldraw/` dagi LDraw
kutubxonasidan keladi. Litsenziya: **CCAL 2.0** (LDraw.org),
`public/ldraw/CAlicense.txt` faylida.

## Eski fayllar (manbasi qayd etilmagan)

Quyidagi fayllar loyihaga litsenziya ma'lumotisiz qo'shilgan. Ularni tarqatishdan
oldin manbasini aniqlash yoki almashtirish kerak:

- `motor.stl`, `L298N.stl`, `wheel.stl`
- `technic_bush`, `technic_connector`, `technic_panel`, `technic_pin`,
  `technic_tire` (`.glb` va `.gltf`)
