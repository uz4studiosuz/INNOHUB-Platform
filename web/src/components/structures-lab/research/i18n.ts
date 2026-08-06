/**
 * Research-module strings.
 *
 * The prose carries light inline markup: `**bold**` is rendered as <strong> by
 * the `Rich` helper in `ResearchContent`. Keeping the emphasis inside the string
 * means a translator can move it to wherever the sentence needs it, instead of
 * the JSX pinning it to a fixed word order.
 */

import type { Lang } from '@/i18n'

export const RESEARCH_STRINGS = {
  uz: {
    'group.designProcess': 'Muhandislik loyihalash jarayoni',
    'group.background': 'Nazariy asos',
    'group.knowledge': 'Bilimni qo‘llash',

    'sec.designProcess': 'Muhandislik loyihalash jarayoni',
    'sec.designChallenge': 'Loyihalash topshirig‘i',
    'sec.background': 'Nazariy asos',
    'sec.trussSystems': 'Ferma tizimlari',
    'sec.wsTrussStability': 'Mashq: ferma barqarorligi',
    'sec.forcesOnTruss': 'Fermaga ta’sir etuvchi kuchlar',
    'sec.wsLinearForces': 'Mashq: chiziqli kuchlar',
    'sec.externalForces': 'Tashqi kuchlar',
    'sec.wsExternalForces': 'Mashq: tashqi kuchlar',
    'sec.internalForces': 'Ichki kuchlar',
    'sec.stressYield': 'Kuchlanish va oquvchanlik chegarasi',

    'nav.prev': 'Oldingi',
    'nav.next': 'Keyingi',
    'worksheet.label': 'Interaktiv mashq',
    'notFound.title': 'Bo‘lim topilmadi',
    'notFound.body': 'Chap tomondagi ro‘yxatdan bo‘limni tanlang.',

    'designProcess.p1':
      'Muhandislik loyihalashi — takrorlanuvchi (iterativ) jarayon. INNOHUB Structures 2.0 loyihasi davomida siz quyidagi sikl bo‘yicha ishlaysiz:',
    'designProcess.s1': 'So‘ra',
    'designProcess.s2': 'Tasavvur qil',
    'designProcess.s3': 'Rejalashtir',
    'designProcess.s4': 'Yarat',
    'designProcess.s5': 'Sinovdan o‘tkaz',
    'designProcess.s6': 'Yaxshila',

    'designChallenge.p1':
      '**Vazifa:** belgilangan cheklovlar ichida (material, o‘lcham, og‘irlik) eng katta yukni ko‘tara oladigan ferma ko‘prik loyihalang.',
    'designChallenge.p2':
      'Bu — optimizatsiya masalasi: maksimal yuk ko‘tarish qobiliyatini minimal material sarfi bilan ta’minlash. Har bir qo‘shimcha element mustahkamlikni oshiradi, lekin og‘irlik va narxni ham oshiradi.',

    'background.p1':
      'Ko‘priklar — inson qurgan eng qadimiy va muhim inshootlardan biri. Ferma (panjarali) ko‘priklar XIX asrdan buyon temir yo‘l va avtomobil ko‘priklarida keng qo‘llanilgan, chunki ular kam material bilan katta masofalarni yopa oladi.',
    'background.p2':
      'Ushbu modulda siz haqiqiy muhandislar ishlatadigan tahlil usullari — tugunlar usuli, kuchlanish va oquvchanlik chegarasi tushunchalari orqali ferma loyihalashni o‘rganasiz.',

    'trussSystems.p1':
      'Ferma loyihasidagi eng muhim jihat — materiallar unga ta’sir qiluvchi kuchlarni ko‘tara olishini ta’minlash. Har bir ferma elementiga qancha kuch ta’sir qilishini bilish shart; agar ichki kuch juda katta bo‘lsa, element sinadi yoki buziladi.',
    'trussSystems.h2Types': 'Kuch turlari',
    'trussSystems.p2':
      'Elementning mustahkamligini bilish uchun ichki kuchlar qanday aniqlanishini va bu fermaning umumiy loyihasiga qanday ta’sir qilishini tushunish kerak. Ferma elementlari to‘rt xil kuchga duch kelishi mumkin: cho‘zilish, siqilish, siljish va buralish.',
    'trussSystems.h2Forms': 'Konstruktiv shakllar',
    'trussSystems.p3':
      'Yuqoridagi jadvaldan ko‘rinib turibdiki, yog‘och siljish kuchida nisbatan zaif. Balsa uchun maksimal siljish yuki 300 psi, siqilishda 2 160 psi, cho‘zilishda esa 3 133 psi ni tashkil qiladi. Konstruktiv shakllar materialning kuchli tomonidan foydalanish uchun ishlatiladi. Masalan, kamar yukni elementlar bo‘ylab taqsimlaydi — kamardagi har bir element siqilish ostida bo‘ladi. Siqilishda kuchli materiallar shu turdagi inshootlar uchun afzallik hisoblanadi; bunga eng yaxshi misol — o‘rta asrlarning tosh kamari.',
    'trussSystems.p4':
      'Eng foydali konstruktiv shakllardan biri — uchburchak. Uchburchakka yuk qo‘yilganda, yuqori elementlar siqilish, pastki element esa cho‘zilish ostida bo‘ladi.',
    'trussSystems.p5':
      'Keyingi bo‘limlarda siz fermalardagi kuchlarni hisoblaysiz. Ferma aynan uchburchak konstruktiv shaklidan foydalanadi. Fermalar minoralar, ko‘priklar, pollar, tomlar, strelalar va kranlarda qo‘llaniladi.',
    'trussSystems.h2Stability': 'Ferma barqarorligi',
    'trussSystems.p6':
      'Fermani tahlil qilish uchun ishlatiladigan usul **tugunlar usuli** deb ataladi. U har bir tugunni alohida ko‘rib, har bir elementdagi ichki kuchni aniqlashni anglatadi. Biroq undan foydalanishdan oldin ferma **statik aniqlanuvchi** ekanini tekshirish kerak. Agar ferma statik aniqlanuvchi bo‘lsa, unda tugunlar va elementlarning to‘g‘ri kombinatsiyasi bor. Agar elementlar juda ko‘p bo‘lsa, ferma **statik aniqlanmaydigan** hisoblanadi — u barqaror, lekin tugunlar usuli ishlamaydi. Agar tugunlar juda ko‘p bo‘lsa, ferma **beqaror** bo‘lib, loyiha talablariga mos yukni ko‘tara olmaydi.',

    'wsTrussStability.p1':
      'Tugunlar usulini qo‘llashdan oldin ferma **statik aniqlanuvchi** ekanini tekshirish kerak. Agar elementlar juda ko‘p bo‘lsa — statik aniqlanmaydigan (usul ishlamaydi). Agar tugunlar elementlarga nisbatan juda ko‘p bo‘lsa — beqaror.',

    'forcesOnTruss.p1':
      'Har bir ferma elementi faqat ikki turdagi o‘q kuchini boshdan kechiradi: **cho‘zilish** yoki **siqilish**. Tashqi yuklar va tayanch reaksiyalari elementlar ichida siljish va buralish kuchlarini ham keltirib chiqarishi mumkin, lekin ideal sharnirli ferma modelida elementlar faqat o‘q kuchini ko‘taradi deb faraz qilinadi.',

    'wsLinearForces.p1':
      'Har qanday burchak ostidagi kuchni gorizontal va vertikal tashkil etuvchilarga ajratish mumkin — bu tugunlar usulining asosi.',

    'externalForces.p1':
      'Tashqi kuchlar — fermaga tashqaridan ta’sir qiluvchi yuklar (masalan, ustidan o‘tayotgan avtomobil og‘irligi) va tayanchlardan kelib chiqadigan reaksiya kuchlari.',
    'externalForces.p2':
      'Reaksiyalarni topish uchun butun ferma qattiq jism sifatida qaraladi va muvozanat tenglamalari (ΣFx=0, ΣFy=0, ΣM=0) qo‘llaniladi.',

    'wsExternalForces.p1':
      'Oddiy tiralgan balka misolida tayanch reaksiyalarini hisoblang (momentlar muvozanati usuli).',

    'internalForces.p1':
      'Tashqi kuchlar va reaksiyalar ma’lum bo‘lgach, har bir element ichidagi kuch **tugunlar usuli** orqali topiladi: har bir tugunda ΣFx=0 va ΣFy=0 tenglamalari yechiladi va tugundan tugunga o‘tiladi.',
    'internalForces.p2':
      'Ichki kuch elementning qancha yuk ko‘tarayotganini bildiradi. Keyingi bo‘limda bu kuchni element materialining oquvchanlik chegarasi bilan solishtiramiz.',

    'stressYield.p1': 'Ichki kuch ma’lum bo‘lgach, element kesimidagi kuchlanish hisoblanadi:',
    'stressYield.formula': 'Kuchlanish = Kuch / Yuza',
    'stressYield.exampleLead': 'Misol:',
    'stressYield.exampleTitle': 'Namuna hisob',
    'stressYield.p2':
      'Balsa yog‘ochining siqilishdagi oquvchanlik chegarasi ~14 893 kPa. Kuchlanish bu chegaradan kichik bo‘lgani uchun element sinmaydi.',
    'stressYield.safetyTitle': 'Xavfsizlik nisbati',
    'stressYield.safetyNote': 'Agar S/Y > 1.0 bo‘lsa — element sinadi.',
    'stressYield.p3':
      'Quyidagi rasm murakkabroq va realroq fermani tasvirlaydi. Strelkalarning yo‘nalishi va rangiga qarab bu ferma haqida ko‘p narsani bilib olish mumkin.',
    'stressYield.p4':
      'Siqilish ostidagi elementlar rangi to‘q sariqdan qizilga qarab o‘zgaradi. Cho‘zilish ostidagi elementlar rangi esa sariqdan ko‘kka qarab o‘zgaradi. Yorqin qizil yoki to‘q ko‘k rangdagi element sinish ehtimoli eng yuqori nuqtani bildiradi. Yuqoridagi fermada **m9** elementi (S/Y = 1.35) siqilish ostida sinish nuqtasidan o‘tib ketgan — uni mustahkamlash yoki qayta loyihalash kerak.',
    'stressYield.h2Loop': 'Iteratsiyada qo‘llash',
    'stressYield.p5':
      'Yorqin qizil yoki to‘q ko‘k rangdagi elementlarni aniqlab, fermani qayta loyihalang: qo‘shimcha uchburchaklar qo‘shing yoki kuchlarni qayta taqsimlang. Jismoniy sinovdan oldin yukning xavfsiz ko‘tarilishini ta’minlang.',
    'stressYield.l1': 'Loyihala',
    'stressYield.l2': 'Qur',
    'stressYield.l3': 'Sinovdan o‘tkaz',
    'stressYield.l4': 'Tahlil qil',
    'stressYield.l5': 'Takomillashtir',
    'stressYield.l6': 'Takrorla',

    'ws.joints': 'Tugunlar soni (j)',
    'ws.members': 'Elementlar soni (m)',
    'ws.reactions': 'Reaksiyalar soni (r)',
    'ws.force': 'Kuch F (N)',
    'ws.angle': 'Burchak θ (°)',
    'ws.span': 'Uzunlik L (m)',
    'ws.loadPos': 'Yuk pozitsiyasi a (m)',
    'ws.stabilityIntro':
      'Ferma barqarorligini tekshirish formulasi: **m + r = 2j** (m — elementlar soni, r — tayanch reaksiyalari, j — tugunlar soni).',
    'ws.determinate': 'STATIK ANIQLANUVCHI (barqaror)',
    'ws.indeterminate': 'STATIK ANIQLANMAYDIGAN (barqaror, ortiqcha elementlar)',
    'ws.unstable': 'BEQAROR (mexanizm)',
    'ws.solvable': 'Bu ferma tugunlar usuli yordamida yechiladi.',
    'ws.linearIntro':
      'Kuch vektorini gorizontal (Fx) va vertikal (Fy) tashkil etuvchilarga ajrating: **Fx = F·cos(θ)**, **Fy = F·sin(θ)**.',
    'ws.externalIntro':
      'Oddiy tiralgan balka: uzunligi L, chapdan a masofada F yuki qo‘yilgan. Momentlar muvozanatidan: **R1 = F(L−a)/L**, **R2 = F·a/L**.',
    'ws.check': 'Tekshiruv: R1 + R2 = {sum} N (F ga teng bo‘lishi kerak)',
  },

  ru: {
    'group.designProcess': 'Процесс инженерного проектирования',
    'group.background': 'Теоретическая основа',
    'group.knowledge': 'Применение знаний',

    'sec.designProcess': 'Процесс инженерного проектирования',
    'sec.designChallenge': 'Проектное задание',
    'sec.background': 'Теоретическая основа',
    'sec.trussSystems': 'Фермовые системы',
    'sec.wsTrussStability': 'Практикум: устойчивость фермы',
    'sec.forcesOnTruss': 'Силы, действующие на ферму',
    'sec.wsLinearForces': 'Практикум: линейные силы',
    'sec.externalForces': 'Внешние силы',
    'sec.wsExternalForces': 'Практикум: внешние силы',
    'sec.internalForces': 'Внутренние силы',
    'sec.stressYield': 'Напряжение и предел текучести',

    'nav.prev': 'Назад',
    'nav.next': 'Далее',
    'worksheet.label': 'Интерактивное упражнение',
    'notFound.title': 'Раздел не найден',
    'notFound.body': 'Выберите раздел в списке слева.',

    'designProcess.p1':
      'Инженерное проектирование — итеративный процесс. В ходе проекта INNOHUB Structures 2.0 вы будете работать по следующему циклу:',
    'designProcess.s1': 'Спроси',
    'designProcess.s2': 'Представь',
    'designProcess.s3': 'Спланируй',
    'designProcess.s4': 'Создай',
    'designProcess.s5': 'Испытай',
    'designProcess.s6': 'Улучши',

    'designChallenge.p1':
      '**Задача:** спроектируйте фермовый мост, выдерживающий наибольшую нагрузку в рамках заданных ограничений (материал, размеры, вес).',
    'designChallenge.p2':
      'Это задача оптимизации: обеспечить максимальную несущую способность при минимальном расходе материала. Каждый дополнительный элемент повышает прочность, но увеличивает вес и стоимость.',

    'background.p1':
      'Мосты — одни из древнейших и важнейших сооружений, построенных человеком. Фермовые мосты широко применяются на железных и автомобильных дорогах с XIX века, потому что позволяют перекрывать большие пролёты малым количеством материала.',
    'background.p2':
      'В этом модуле вы изучите проектирование ферм с помощью методов, которыми пользуются настоящие инженеры: метода вырезания узлов, понятий напряжения и предела текучести.',

    'trussSystems.p1':
      'Самое важное в проектировании фермы — убедиться, что материалы выдержат действующие на них силы. Необходимо знать, какая сила приходится на каждый элемент фермы; если внутренняя сила слишком велика, элемент разрушится.',
    'trussSystems.h2Types': 'Виды сил',
    'trussSystems.p2':
      'Чтобы оценить прочность элемента, нужно понимать, как определяются внутренние силы и как это влияет на общий проект фермы. Элементы фермы могут испытывать четыре вида сил: растяжение, сжатие, сдвиг и кручение.',
    'trussSystems.h2Forms': 'Конструктивные формы',
    'trussSystems.p3':
      'Из приведённой таблицы видно, что древесина сравнительно слаба на сдвиг. Для бальзы предельная нагрузка на сдвиг составляет 300 psi, на сжатие — 2 160 psi, на растяжение — 3 133 psi. Конструктивные формы применяются, чтобы использовать сильные стороны материала. Например, арка распределяет нагрузку по элементам — каждый элемент арки работает на сжатие. Материалы, прочные на сжатие, дают преимущество в таких сооружениях; лучший пример — средневековая каменная арка.',
    'trussSystems.p4':
      'Одна из самых полезных конструктивных форм — треугольник. При нагружении треугольника верхние элементы работают на сжатие, а нижний — на растяжение.',
    'trussSystems.p5':
      'В следующих разделах вы будете рассчитывать силы в фермах. Ферма использует именно треугольную конструктивную форму. Фермы применяются в башнях, мостах, перекрытиях, кровлях, стрелах и кранах.',
    'trussSystems.h2Stability': 'Устойчивость фермы',
    'trussSystems.p6':
      'Метод, применяемый для анализа фермы, называется **методом вырезания узлов**. Он состоит в рассмотрении каждого узла по отдельности и определении внутренней силы в каждом элементе. Однако прежде чем им пользоваться, нужно проверить, что ферма **статически определима**. Если это так, в ферме верное сочетание узлов и элементов. Если элементов слишком много, ферма **статически неопределима** — она устойчива, но метод узлов неприменим. Если узлов слишком много, ферма **неустойчива** и не сможет нести проектную нагрузку.',

    'wsTrussStability.p1':
      'Перед применением метода узлов нужно проверить, что ферма **статически определима**. Если элементов слишком много — она статически неопределима (метод неприменим). Если узлов слишком много относительно элементов — она неустойчива.',

    'forcesOnTruss.p1':
      'Каждый элемент фермы испытывает только два вида продольной силы: **растяжение** или **сжатие**. Внешние нагрузки и опорные реакции могут вызывать в элементах также сдвиг и кручение, но в идеальной шарнирно-стержневой модели принимается, что элементы несут только продольную силу.',

    'wsLinearForces.p1':
      'Силу, направленную под любым углом, можно разложить на горизонтальную и вертикальную составляющие — это основа метода узлов.',

    'externalForces.p1':
      'Внешние силы — это нагрузки, действующие на ферму извне (например, вес проезжающего автомобиля), и реакции, возникающие в опорах.',
    'externalForces.p2':
      'Чтобы найти реакции, всю ферму рассматривают как твёрдое тело и применяют уравнения равновесия (ΣFx=0, ΣFy=0, ΣM=0).',

    'wsExternalForces.p1':
      'Рассчитайте опорные реакции на примере простой балки (метод равновесия моментов).',

    'internalForces.p1':
      'Когда внешние силы и реакции известны, силу в каждом элементе находят **методом вырезания узлов**: в каждом узле решают уравнения ΣFx=0 и ΣFy=0, переходя от узла к узлу.',
    'internalForces.p2':
      'Внутренняя сила показывает, какую нагрузку несёт элемент. В следующем разделе мы сравним её с пределом текучести материала.',

    'stressYield.p1':
      'Когда внутренняя сила известна, вычисляют напряжение в сечении элемента:',
    'stressYield.formula': 'Напряжение = Сила / Площадь',
    'stressYield.exampleLead': 'Пример:',
    'stressYield.exampleTitle': 'Пример расчёта',
    'stressYield.p2':
      'Предел текучести бальзы при сжатии составляет ~14 893 кПа. Напряжение меньше этого предела, поэтому элемент не разрушится.',
    'stressYield.safetyTitle': 'Коэффициент запаса',
    'stressYield.safetyNote': 'Если S/Y > 1.0 — элемент разрушится.',
    'stressYield.p3':
      'На рисунке ниже показана более сложная и реалистичная ферма. По направлению и цвету стрелок о ней можно узнать многое.',
    'stressYield.p4':
      'Цвет сжатых элементов меняется от оранжевого к красному. Цвет растянутых элементов — от жёлтого к синему. Ярко-красный или тёмно-синий элемент указывает на точку с наибольшей вероятностью разрушения. В показанной ферме элемент **m9** (S/Y = 1.35) перешёл точку разрушения при сжатии — его нужно усилить или перепроектировать.',
    'stressYield.h2Loop': 'Применение в итерации',
    'stressYield.p5':
      'Определив ярко-красные и тёмно-синие элементы, перепроектируйте ферму: добавьте треугольники или перераспределите силы. Убедитесь в безопасном восприятии нагрузки до натурного испытания.',
    'stressYield.l1': 'Проектируй',
    'stressYield.l2': 'Строй',
    'stressYield.l3': 'Испытывай',
    'stressYield.l4': 'Анализируй',
    'stressYield.l5': 'Дорабатывай',
    'stressYield.l6': 'Повторяй',

    'ws.joints': 'Число узлов (j)',
    'ws.members': 'Число элементов (m)',
    'ws.reactions': 'Число реакций (r)',
    'ws.force': 'Сила F (Н)',
    'ws.angle': 'Угол θ (°)',
    'ws.span': 'Длина L (м)',
    'ws.loadPos': 'Положение нагрузки a (м)',
    'ws.stabilityIntro':
      'Формула проверки устойчивости фермы: **m + r = 2j** (m — число элементов, r — опорные реакции, j — число узлов).',
    'ws.determinate': 'СТАТИЧЕСКИ ОПРЕДЕЛИМА (устойчива)',
    'ws.indeterminate': 'СТАТИЧЕСКИ НЕОПРЕДЕЛИМА (устойчива, лишние элементы)',
    'ws.unstable': 'НЕУСТОЙЧИВА (механизм)',
    'ws.solvable': 'Эта ферма решается методом вырезания узлов.',
    'ws.linearIntro':
      'Разложите вектор силы на горизонтальную (Fx) и вертикальную (Fy) составляющие: **Fx = F·cos(θ)**, **Fy = F·sin(θ)**.',
    'ws.externalIntro':
      'Простая балка: длина L, нагрузка F приложена на расстоянии a слева. Из равновесия моментов: **R1 = F(L−a)/L**, **R2 = F·a/L**.',
    'ws.check': 'Проверка: R1 + R2 = {sum} Н (должно равняться F)',
  },

  en: {
    'group.designProcess': 'Engineering Design Process',
    'group.background': 'Background',
    'group.knowledge': 'Knowledge At Work',

    'sec.designProcess': 'The Engineering Design Process',
    'sec.designChallenge': 'Design Challenge',
    'sec.background': 'Background',
    'sec.trussSystems': 'Truss Systems',
    'sec.wsTrussStability': 'Worksheet: Truss Stability',
    'sec.forcesOnTruss': 'Forces on a Truss',
    'sec.wsLinearForces': 'Worksheet: Linear Forces',
    'sec.externalForces': 'External Forces',
    'sec.wsExternalForces': 'Worksheet: External Forces',
    'sec.internalForces': 'Internal Forces',
    'sec.stressYield': 'Stress and Yield Strength',

    'nav.prev': 'Prev',
    'nav.next': 'Next',
    'worksheet.label': 'Interactive exercise',
    'notFound.title': 'Section not found',
    'notFound.body': 'Pick a section from the list on the left.',

    'designProcess.p1':
      'Engineering design is an iterative process. Throughout the INNOHUB Structures 2.0 project you will work through this cycle:',
    'designProcess.s1': 'Ask',
    'designProcess.s2': 'Imagine',
    'designProcess.s3': 'Plan',
    'designProcess.s4': 'Create',
    'designProcess.s5': 'Test',
    'designProcess.s6': 'Improve',

    'designChallenge.p1':
      '**The task:** design a truss bridge that carries the greatest load within the given constraints on material, dimensions and weight.',
    'designChallenge.p2':
      'This is an optimisation problem: maximum load-bearing capacity for minimum material. Every extra member adds strength, but it also adds weight and cost.',

    'background.p1':
      'Bridges are among the oldest and most important structures humans build. Truss bridges have carried rail and road traffic since the nineteenth century because they span long distances with very little material.',
    'background.p2':
      'In this module you will learn truss design through the methods real engineers use: the method of joints, and the concepts of stress and yield strength.',

    'trussSystems.p1':
      'The most important part of truss design is making sure the materials can carry the forces acting on them. You need to know how much force reaches each member; if the internal force is too large, the member breaks.',
    'trussSystems.h2Types': 'Types of forces',
    'trussSystems.p2':
      'To judge a member’s strength you need to understand how internal forces are found and how they shape the overall design. Truss members can meet four kinds of force: tension, compression, shear and torsion.',
    'trussSystems.h2Forms': 'Structural forms',
    'trussSystems.p3':
      'The table above shows that timber is relatively weak in shear. For balsa the maximum shear load is 300 psi, against 2,160 psi in compression and 3,133 psi in tension. Structural forms exist to play to a material’s strength. An arch, for example, spreads the load along its members — every member of an arch works in compression. Materials that are strong in compression are therefore an advantage in such structures; the medieval keystone arch is the classic example.',
    'trussSystems.p4':
      'One of the most useful structural forms is the triangle. Load a triangle and the upper members go into compression while the bottom member goes into tension.',
    'trussSystems.p5':
      'In the sections that follow you will calculate the forces in trusses. A truss is built on exactly this triangular form. Trusses appear in towers, bridges, floors, roofs, booms and cranes.',
    'trussSystems.h2Stability': 'Truss stability',
    'trussSystems.p6':
      'The method used to analyse our truss is called the **method of joints**. It means taking each joint in turn and working out the internal force in every member. Before using it, though, we must establish that the truss is **statically determinate**. If it is, the truss has the right combination of joints and members. If it has too many members it is **statically indeterminate** — stable, but the method of joints will not work. If it has too many joints it is **unstable**, meaning it cannot carry the load the design requires.',

    'wsTrussStability.p1':
      'Before using the method of joints, check that the truss is **statically determinate**. Too many members and it is statically indeterminate (the method will not work). Too many joints relative to members and it is unstable.',

    'forcesOnTruss.p1':
      'Every truss member experiences only two kinds of axial force: **tension** or **compression**. External loads and support reactions can also produce shear and torsion inside members, but the ideal pin-jointed truss model assumes members carry axial force alone.',

    'wsLinearForces.p1':
      'A force at any angle can be split into horizontal and vertical components — this is the basis of the method of joints.',

    'externalForces.p1':
      'External forces are the loads applied to the truss from outside — the weight of a vehicle crossing it, for instance — together with the reaction forces that arise at the supports.',
    'externalForces.p2':
      'To find the reactions, the whole truss is treated as a rigid body and the equilibrium equations (ΣFx=0, ΣFy=0, ΣM=0) are applied.',

    'wsExternalForces.p1':
      'Calculate the support reactions for a simply supported beam using moment equilibrium.',

    'internalForces.p1':
      'Once the external forces and reactions are known, the force inside each member is found by the **method of joints**: solve ΣFx=0 and ΣFy=0 at each joint, moving from joint to joint.',
    'internalForces.p2':
      'The internal force tells you how much load a member is carrying. In the next section we compare that force against the yield strength of the member’s material.',

    'stressYield.p1':
      'Once the internal force is known, the stress in the member’s cross-section is calculated:',
    'stressYield.formula': 'Stress = Force / Area',
    'stressYield.exampleLead': 'Example:',
    'stressYield.exampleTitle': 'Worked example',
    'stressYield.p2':
      'Balsa’s yield strength in compression is about 14,893 kPa. The stress is below that limit, so this member will not break.',
    'stressYield.safetyTitle': 'Safety ratio',
    'stressYield.safetyNote': 'If S/Y > 1.0 the member fails.',
    'stressYield.p3':
      'The figure below shows a more complex and realistic truss. The direction and colour of the arrows tell you a great deal about it.',
    'stressYield.p4':
      'Members in compression shade from orange to red. Members in tension shade from yellow to blue. A bright red or dark blue member marks the point most likely to fail. In the truss above, member **m9** (S/Y = 1.35) has passed its breaking point in compression — it needs strengthening or redesign.',
    'stressYield.h2Loop': 'Applying it in the design loop',
    'stressYield.p5':
      'Identify the bright red and dark blue members, then redesign the truss: add triangles or redistribute the forces. Confirm the load is carried safely before you build and test physically.',
    'stressYield.l1': 'Design',
    'stressYield.l2': 'Build',
    'stressYield.l3': 'Test',
    'stressYield.l4': 'Analyse',
    'stressYield.l5': 'Refine',
    'stressYield.l6': 'Repeat',

    'ws.joints': 'Number of joints (j)',
    'ws.members': 'Number of members (m)',
    'ws.reactions': 'Number of reactions (r)',
    'ws.force': 'Force F (N)',
    'ws.angle': 'Angle θ (°)',
    'ws.span': 'Length L (m)',
    'ws.loadPos': 'Load position a (m)',
    'ws.stabilityIntro':
      'The truss stability check is **m + r = 2j** (m is the member count, r the support reactions, j the joint count).',
    'ws.determinate': 'STATICALLY DETERMINATE (stable)',
    'ws.indeterminate': 'STATICALLY INDETERMINATE (stable, redundant members)',
    'ws.unstable': 'UNSTABLE (mechanism)',
    'ws.solvable': 'This truss can be solved with the method of joints.',
    'ws.linearIntro':
      'Split the force vector into horizontal (Fx) and vertical (Fy) components: **Fx = F·cos(θ)**, **Fy = F·sin(θ)**.',
    'ws.externalIntro':
      'Simply supported beam: length L, load F applied a metres from the left. From moment equilibrium: **R1 = F(L−a)/L**, **R2 = F·a/L**.',
    'ws.check': 'Check: R1 + R2 = {sum} N (should equal F)',
  },
} as const

export type ResearchKey = keyof (typeof RESEARCH_STRINGS)['en']

/** Research-scoped `t()`. Falls back to English for any key a locale misses. */
export function researchT(lang: Lang) {
  const dict = RESEARCH_STRINGS[lang] ?? RESEARCH_STRINGS.en
  return (key: ResearchKey, vars?: Record<string, string | number>) => {
    let s: string = dict[key] ?? RESEARCH_STRINGS.en[key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }
}
