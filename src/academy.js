/* =====================================================================
   SOL Academy — לימודי נגינה באולפן
   כאן מעדכנים מורים, תיאורים, ציוד ומחירים. אין צורך לגעת בעיצוב.
   photo = תמונה קטנה של המורה (בתיקייה public/academy). בלי תמונה מוצגת האות הראשונה של השם.
   price = מחיר החבילה | lessons = כמה שיעורים | recommended = החבילה המומלצת
   intro = שיעור היכרות חד פעמי (לא נכלל בחישוב החיסכון)
   (המחיר לשיעור והחיסכון מחושבים אוטומטית מול "שיעור בודד")
   ===================================================================== */
export const academyData = [
  {
    id: 'drums',
    instrument: 'תופים',
    teacher: 'ראם חתוכה',
    photo: '/academy/ram.webp',
    photoPos: '62% 40%', // איזה חלק בתמונה יהיה במרכז העיגול
    stage: 'מתופף פעיל בשורה הראשונה, הופיע עם דודו אהרון, ישי לוי, עופר לוי ועוד.',
    gear: 'אין צורך להביא ציוד – השיעורים מתקיימים על סט תופים אקוסטי מקצועי שנמצא באולפן (מומלץ להגיע עם זוג מקלות אישי).',
    tiers: [
      { id: 'intro', label: 'שיעור היכרות', note: 'חד פעמי', lessons: 1, price: 150, intro: true },
      { id: 'single', label: 'שיעור בודד', note: '60 דקות', lessons: 1, price: 235 },
      { id: 'pack4', label: 'כרטיסיית 4 שיעורים', note: 'חודשית', lessons: 4, price: 860, recommended: true },
      { id: 'pack10', label: 'כרטיסיית 10 שיעורים', note: '', lessons: 10, price: 2050 },
    ],
  },
  {
    id: 'bass',
    instrument: 'גיטרה בס',
    teacher: 'אדם רונן',
    photo: '/academy/adam.webp',
    photoPos: '45% 35%',
    stage: 'בסיסט מוביל מהבמות המרכזיות, מופיע לצד ששון שאולוב ואמנים מובילים.',
    gear: 'יש להגיע לשיעור עם גיטרה בס אישית (מגבר בס מקצועי וכבלים מחכים לכם באולפן).',
    tiers: [
      { id: 'intro', label: 'שיעור היכרות', note: 'חד פעמי', lessons: 1, price: 150, intro: true },
      { id: 'single', label: 'שיעור בודד', note: '60 דקות', lessons: 1, price: 195 },
      { id: 'pack4', label: 'כרטיסיית 4 שיעורים', note: 'חודשית', lessons: 4, price: 720, recommended: true },
      { id: 'pack10', label: 'כרטיסיית 10 שיעורים', note: '', lessons: 10, price: 1700 },
    ],
  },
  {
    id: 'guitar',
    instrument: 'גיטרה חשמלית ואקוסטית',
    teacher: 'עמית גנדלמן',
    photo: '/academy/amit.webp',
    photoPos: '50% 40%',
    stage: 'גיטריסט מהבמות המרכזיות בארץ, בעל ידע תיאורטי ומעשי עשיר (פופ, מזרחית, רוק, ג\'אז ועוד).',
    gear: 'יש להגיע לשיעור עם גיטרה אישית (חשמלית או אקוסטית – מגברים וכבלים מחכים לכם באולפן).',
    tiers: [
      { id: 'intro', label: 'שיעור היכרות', note: 'חד פעמי', lessons: 1, price: 150, intro: true },
      { id: 'single', label: 'שיעור בודד', note: '60 דקות', lessons: 1, price: 215 },
      { id: 'pack4', label: 'כרטיסיית 4 שיעורים', note: 'חודשית', lessons: 4, price: 780, recommended: true },
      { id: 'pack10', label: 'כרטיסיית 10 שיעורים', note: '', lessons: 10, price: 1850 },
    ],
  },
];

export const academyText = {
  title: '🎸 SOL Academy | לימודי נגינה באולפן',
  subtitle: 'ללמוד אחד-על-אחד באווירת אולפן מקצועית באור יהודה, ישירות מהנגנים של הבמות הגדולות.',
  cta: 'תיאום שיעור / רכישת כרטיסייה בוואטסאפ',
};
