/**
 * Platform shell strings - the sidebar, the top bar and the dashboard.
 *
 * Flat keys with `{name}` placeholders, matching the dictionary shape the 3D
 * Konstruktor already used, so its 130 keys merge in without being rewritten.
 * Uzbek is the source language and the fallback: a key missing from ru or en
 * falls back to uz rather than showing the raw key.
 */
export type Dict = Record<string, string>;

export const PLATFORM_UZ: Dict = {
  "nav.main": "Asosiy",
  "nav.simulations": "Simulyatsiyalar",
  "nav.dashboard": "Boshqaruv paneli",
  "nav.glider": "Planyor",
  "nav.rockets": "Raketalar",
  "nav.electronics": "Elektronika",
  "nav.structures": "Tuzilmalar",
  "nav.hardware": "3D Konstruktor",
  "nav.engineOnline": "Dvigatel ishlamoqda",
  "nav.moduleCount": "{n} ta simulyatsiya moduli",
  "nav.engineSplit": "Python + brauzer hisobi",

  "top.workspace": "Ish maydoni",
  "top.engineActive": "Simulyatsiya dvigateli faol",
  "top.language": "Til",

  "dash.eyebrow": "STEM muhandislik laboratoriyasi",
  "dash.title": "INNOHUB Platformasi",
  "dash.intro":
    "Platforma orqali siz parvoz, aerodinamika, elektronika va mexanik tizimlarning matematik modellarini interaktiv vizualizatsiyalar yordamida simulyatsiya qilasiz. Tuzilmalar tahlili Python dvigatelida, qolgan modullar brauzerning o‘zida real vaqtda hisoblanadi.",
  "dash.engineLabel": "Fizik dvigatel",
  "dash.engineName": "Python + brauzer",
  "dash.engineStatus": "{n} ta modul faol",
  "dash.modulesHeading": "Muhandislik modullari",
  "dash.start": "Simulyatsiyani boshlash",

  "mod.glider.title": "Planyor simulyatori",
  "mod.glider.desc":
    "Qanot parametrlari, havo profillari (NACA) va 2D parvoz trayektoriyasi aerodinamik simulyatsiyasi.",
  "mod.glider.tag": "Aerodinamika",

  "mod.rockets.title": "Raketa simulyatori",
  "mod.rockets.desc":
    "Suv-raketa: adiabatik bosim tushishi, qarshilik va Barrowman barqarorligi bo‘yicha to‘liq parvoz hisobi.",
  "mod.rockets.tag": "Kosmik muhandislik",

  "mod.electronics.title": "Elektronika (maket taxtasi)",
  "mod.electronics.desc":
    "Om qonuni, zanjir tahlili va Arduino kodini kompilyatsiya qilib sinash laboratoriyasi.",
  "mod.electronics.tag": "Elektrotexnika",

  "mod.structures.title": "Tuzilmalar tahlili",
  "mod.structures.desc":
    "Balka egilishi, ustun bukilishi (Euler) va xavfsizlik koeffitsientlarini hisoblash.",
  "mod.structures.tag": "Qurilish / mexanika",

  "mod.hardware.title": "3D Konstruktor",
  "mod.hardware.desc":
    "Detallar katalogidan real o‘lchamli qismlarni uch o‘lchamda yig‘ish va konstruksiyani sinab ko‘rish.",
  "mod.hardware.tag": "Konstruksiya",
};

export const PLATFORM_RU: Dict = {
  "nav.main": "Основное",
  "nav.simulations": "Симуляции",
  "nav.dashboard": "Панель управления",
  "nav.glider": "Планёр",
  "nav.rockets": "Ракеты",
  "nav.electronics": "Электроника",
  "nav.structures": "Конструкции",
  "nav.hardware": "3D Конструктор",
  "nav.engineOnline": "Движок работает",
  "nav.moduleCount": "{n} модуля симуляции",
  "nav.engineSplit": "Python + расчёт в браузере",

  "top.workspace": "Рабочая область",
  "top.engineActive": "Движок симуляции активен",
  "top.language": "Язык",

  "dash.eyebrow": "STEM инженерная лаборатория",
  "dash.title": "Платформа INNOHUB",
  "dash.intro":
    "На платформе вы моделируете полёт, аэродинамику, электронику и механические системы через интерактивные визуализации. Анализ конструкций считает движок на Python, остальные модули — прямо в браузере, в реальном времени.",
  "dash.engineLabel": "Физический движок",
  "dash.engineName": "Python + браузер",
  "dash.engineStatus": "{n} модуля активны",
  "dash.modulesHeading": "Инженерные модули",
  "dash.start": "Начать симуляцию",

  "mod.glider.title": "Симулятор планёра",
  "mod.glider.desc":
    "Аэродинамическая симуляция: параметры крыла, профили NACA и траектория полёта в 2D.",
  "mod.glider.tag": "Аэродинамика",

  "mod.rockets.title": "Симулятор ракеты",
  "mod.rockets.desc":
    "Водяная ракета: адиабатическое падение давления, сопротивление и устойчивость по Барроумену.",
  "mod.rockets.tag": "Космическая инженерия",

  "mod.electronics.title": "Электроника (макетная плата)",
  "mod.electronics.desc":
    "Лаборатория закона Ома, анализа цепей и компиляции кода Arduino с проверкой на схеме.",
  "mod.electronics.tag": "Электротехника",

  "mod.structures.title": "Анализ конструкций",
  "mod.structures.desc":
    "Изгиб балки, потеря устойчивости стойки (Эйлер) и расчёт коэффициентов запаса прочности.",
  "mod.structures.tag": "Строительство / механика",

  "mod.hardware.title": "3D Конструктор",
  "mod.hardware.desc":
    "Сборка конструкции в трёх измерениях из каталога деталей реальных размеров с проверкой.",
  "mod.hardware.tag": "Конструирование",
};

export const PLATFORM_EN: Dict = {
  "nav.main": "Main",
  "nav.simulations": "Simulations",
  "nav.dashboard": "Dashboard",
  "nav.glider": "Glider",
  "nav.rockets": "Rockets",
  "nav.electronics": "Electronics",
  "nav.structures": "Structures",
  "nav.hardware": "3D Builder",
  "nav.engineOnline": "Engine online",
  "nav.moduleCount": "{n} simulation modules",
  "nav.engineSplit": "Python + in-browser solver",

  "top.workspace": "Workspace",
  "top.engineActive": "Simulation engine active",
  "top.language": "Language",

  "dash.eyebrow": "STEM engineering laboratory",
  "dash.title": "INNOHUB Platform",
  "dash.intro":
    "Simulate flight, aerodynamics, electronics and mechanical systems through interactive models. Structural analysis runs on a Python engine; every other module solves in the browser, in real time.",
  "dash.engineLabel": "Physics engine",
  "dash.engineName": "Python + browser",
  "dash.engineStatus": "{n} modules active",
  "dash.modulesHeading": "Engineering modules",
  "dash.start": "Start the simulation",

  "mod.glider.title": "Glider simulator",
  "mod.glider.desc":
    "Aerodynamic simulation of wing parameters, NACA aerofoils and the 2D flight path.",
  "mod.glider.tag": "Aerodynamics",

  "mod.rockets.title": "Rocket simulator",
  "mod.rockets.desc":
    "Water rocket: adiabatic blowdown, drag build-up and Barrowman stability across the whole flight.",
  "mod.rockets.tag": "Aerospace engineering",

  "mod.electronics.title": "Electronics (breadboard)",
  "mod.electronics.desc":
    "Ohm's law, circuit analysis and an Arduino compiler you can run against the board you built.",
  "mod.electronics.tag": "Electrical engineering",

  "mod.structures.title": "Structural analysis",
  "mod.structures.desc":
    "Beam bending, Euler column buckling and factor-of-safety calculations.",
  "mod.structures.tag": "Civil / mechanical",

  "mod.hardware.title": "3D Builder",
  "mod.hardware.desc":
    "Assemble a structure in three dimensions from a catalogue of real-world parts, then test it.",
  "mod.hardware.tag": "Construction",
};
