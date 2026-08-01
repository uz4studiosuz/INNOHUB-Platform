# `public/ldraw/` bu repozitoriyada yo'q

3D Konstruktor moduli LEGO detallarini rasmiy **LDraw** kutubxonasidan chizadi.
Kutubxona 36 338 fayl va ~509 MB — git repozitoriyasiga sig'maydi, shuning uchun
`.gitignore` ga kiritilgan.

## Ishga tushirish

1. <https://library.ldraw.org/updates?latest> dan `complete.zip` ni yuklab oling.
2. Arxivni oching va ichidagi `ldraw` papkasini shu yerga —
   `web/public/ldraw/` ga — ko'chiring. Ichida `parts/`, `p/` va `LDConfig.ldr`
   bo'lishi kerak.

## Papkasiz ham ishlaydi

Kutubxona yo'q bo'lsa modul ishdan chiqmaydi. Header'dagi **LDraw kutubxonasi**
tugmasi ikkita muqobil beradi:

- **Mahalliy papka** — brauzerdan istalgan joydagi `ldraw` papkasini tanlash;
- **CDN** — detallarni tarmoq orqali yuklash (sekinroq, har bir primitiv
  alohida so'rov bilan keladi).

Protsedural detallar (shesternyalar, o'qlar, elektronika modullari) LDraw'siz
ham to'liq chiziladi — kutubxona faqat real LEGO katalogi uchun kerak.

## Litsenziya

LDraw™ detallar kutubxonasi CC BY 2.0 asosida tarqatiladi. Manba:
<https://www.ldraw.org/>
