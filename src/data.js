/* =====================================================================
   SOL Production — כאן מעדכנים טלפון, מחירים, שירותים ושאלות נפוצות.
   ===================================================================== */
export const WA = '972549030134';
export const PHONE = '054-903-0134';
export const TEL = 'tel:+972549030134';
export const ADDRESS = 'הראשונים 41, אור יהודה';
export const HOURS = '10:00 – 23:00';
export const waLink = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
export const WA_HELLO = waLink('היי יניר, אשמח לשמוע פרטים על סשן ב־SOL Production');

const Q = encodeURIComponent('הראשונים 41 אור יהודה');
export const WAZE = `https://waze.com/ul?q=${Q}&navigate=yes`;
export const GMAPS = `https://www.google.com/maps/search/?api=1&query=${Q}`;
export const MAP_EMBED = `https://maps.google.com/maps?q=${Q}&z=16&output=embed`;

export const SOCIAL = {
  instagram: 'https://www.instagram.com/',
  tiktok: 'https://www.tiktok.com/',
  youtube: 'https://www.youtube.com/',
  facebook: 'https://www.facebook.com/',
};

/* מחירון: price = מה שמוצג | priceText = מה שנכנס להודעת הוואטסאפ
   service = איזה שירות לסמן בטופס ההזמנה | rec = להפעיל הקלטת ערוצים */
export const PRICING = [
  { id: 'vocals', label: 'הקלטות, בר מצווה וברכות', items: [
    { id: 'barmitzvah', name: 'שיר בר מצווה / בת מצווה', desc: 'כתיבה, הקלטה באולפן והפקת פלייבק אלקטרוני', price: '₪2,950', badge: 'שיר אישי לאירוע', service: 'write' },
    { id: 'cover-playback', name: 'הקלטת קאבר על פלייבק קיים', desc: 'כולל תיקונים, מיקס ומאסטר', price: '₪750', old: '₪950', badge: 'חיסכון של ₪200', service: 'cover' },
    { id: 'greeting', name: 'הקלטת ברכה / דרשה לאירוע', desc: 'כולל מוזיקת רקע ועריכה', price: '₪500', service: 'greeting' },
    { id: 'cover-acoustic', name: 'קאבר אקוסטי', desc: 'נגן חי – גיטרה או פסנתר + שירה', price: '₪1,500', service: 'cover' },
    { id: 'cover-original', name: 'הפקת קאבר מקורי', desc: 'עיבוד והפקה חדשים לשיר קיים', price: 'לפי הצעת מחיר אישית', quote: true, service: 'cover' },
    { id: 'studio-hour', name: 'השכרת אולפן הקלטות', desc: 'בפיקוח סאונדמן', price: '₪250', unit: 'לשעה', service: 'single' },
    { id: 'combo-cover-clip', name: 'חבילת קאבר + קליפ אולפן', desc: 'הקלטת קאבר וצילום קליפ אולפן מקצועי בחבילה אחת', price: '₪2,100', old: '₪2,350', badge: 'חבילה · חיסכון של ₪250', service: 'cover' },
  ] },
  { id: 'rehearsal', label: 'חדר חזרות', items: [
    { id: 'reh-base', name: 'השכרת חדר חזרות', desc: 'בסיס, ללא סאונדמן', price: '₪120', unit: 'לשעה', service: 'rehearsal' },
    { id: 'reh-sound', name: 'חדר חזרות + סאונדמן צמוד', desc: 'סאונדמן צמוד לאורך כל החזרה', price: '₪200', unit: 'לשעה', service: 'rehearsal' },
    { id: 'reh-multitrack', name: 'הקלטת ערוצים מלאה בחדר חזרות', desc: 'מולטי־טראק, ללא עריכה', price: '₪850', note: 'מה מקבלים: הקלטה מתקדמת של ערוץ נפרד לכל נגן', service: 'rehearsal', rec: true },
    { id: 'reh-stereo', name: 'הקלטת סטריאו ברצועה אחת', desc: 'הקלטה של החזרה ברצועת סטריאו אחת', price: '₪280', unit: 'עד שעה', service: 'rehearsal' },
    { id: 'reh-full', name: 'סאונדמן + הקלטת ערוצים מלאה', desc: 'סאונדמן צמוד והקלטת מולטי־טראק מלאה של החזרה', price: '₪1,000', unit: 'עד שעה', old: '₪1,150', badge: 'החבילה הכי משתלמת · חיסכון של ₪150', note: 'לא כולל השכרת חדר חזרות. עריכה, מיקס ומאסטרינג בתוספת תשלום, בתיאום עם יניר.', service: 'rehearsal', rec: true },
    { id: 'reh-card10', name: 'כרטיסיית 10 שעות חזרה', desc: 'ללא סאונדמן', price: '₪1,050', old: '₪1,200', badge: 'חיסכון של ₪150', service: 'rehearsal' },
  ] },
  { id: 'production', label: 'הפקה מוזיקלית ויצירה', items: [
    { id: 'single', name: 'הפקת סינגל מאפס', desc: 'הפקה מלאה, עיבוד, הקלטות, מיקס ומאסטר', price: 'לפי הצעת מחיר אישית', quote: true, service: 'single' },
    { id: 'writing', name: 'כתיבה והלחנה בהתאמה אישית', desc: 'שיר שנכתב ומולחן במיוחד בשבילכם — לחתונה, ליום הולדת או לכל אירוע', price: 'לפי הצעת מחיר אישית', quote: true, service: 'write' },
  ] },
  { id: 'mix', label: 'מיקס ומאסטרינג', items: [
    { id: 'mixmaster', name: 'מיקס ומאסטרינג לשיר', desc: 'מיקס מלא ומאסטרינג מוכן להפצה', price: '₪2,150 – ₪3,500', note: 'נדרשת שיחת ייעוץ עם יניר סול לפני', service: 'mix' },
    { id: 'master', name: 'מאסטרינג בלבד', desc: 'לשיר מוכן', price: '₪1,250', service: 'mix' },
  ] },
  { id: 'clips', label: 'קליפים', items: [
    { id: 'clip-pro', name: 'צילום קליפ מקצועי + צלם', desc: 'לשיר אחד', price: '₪1,250', service: 'clip' },
    { id: 'clip-lyrics', name: 'הפקת קליפ מילים', desc: 'לסינגל או קאבר', price: '₪2,450', service: 'clip' },
    { id: 'reels', name: 'הקלטה וצילום רילס + צלם', desc: 'לטיקטוק / אינסטגרם', price: '₪650', service: 'clip' },
  ] },
];
export const ALL_ITEMS = PRICING.flatMap((c) => c.items);
export const priceText = (it) => (it.quote ? 'לפי הצעת מחיר' : it.price + (it.unit ? ' ' + it.unit : ''));

export const SERVICES = [
  ['rehearsal', 'חדר חזרות להרכב'],
  ['write', 'שיר בר / בת מצווה · כתיבה והלחנה'],
  ['cover', 'הקלטת קאבר'],
  ['greeting', 'הקלטת ברכה / אירוע'],
  ['single', 'הפקת סינגל מאפס'],
  ['mix', 'מיקס ומאסטרינג'],
  ['clip', 'הפקת קליפ'],
];
export const BANDS = ['סולו', '2–4 נגנים', 'הרכב מלא 5+'];
export const DURS = [['2', '2 שעות'], ['3', '3 שעות'], ['4', '4+ שעות']];

export const HOME_FAQ = [
  ['כמה עולה שיר בר מצווה או בת מצווה?', 'שיר בר מצווה / בת מצווה הכולל כתיבה, הקלטה באולפן והפקת פלייבק אלקטרוני עולה 2,950 ₪.'],
  ['איפה נמצא האולפן?', 'האולפן וחדר החזרות נמצאים ברחוב הראשונים 41 באור יהודה, דקות מתל אביב ומכל גוש דן. שעות פעילות 10:00–23:00.'],
  ['צריך ניסיון בשירה כדי להקליט באולפן?', 'לא. יניר מלווה כל אחד לאורך ההקלטה, ובסיום מתבצעים תיקונים, כיוון קולות, מיקס ומאסטר כך שהתוצאה נשמעת מקצועית.'],
  ['אפשר להקליט ברכה או דרשה לאירוע?', 'כן. הקלטת ברכה או דרשה לאירוע כוללת מוזיקת רקע ועריכה ועולה 500 ₪.'],
  ['איך מזמינים סשן?', 'בוחרים שירות בטופס ההזמנה באתר, ההודעה נכתבת אוטומטית ונשלחת ליניר בוואטסאפ למספר 054-903-0134.'],
];

export const BM_FAQ = [
  ['כמה עולה שיר בר מצווה או שיר בת מצווה?', '2,950 ₪ – כולל כתיבת מילים, הלחנה, הקלטה באולפן והפקת פלייבק אלקטרוני מלא.'],
  ['מתי כדאי להתחיל להכין שיר לבר / בת מצווה?', 'מומלץ לפנות כמה שבועות לפני האירוע, כדי שיהיה זמן לשיחת היכרות, לכתיבה, לאישור המילים ולהקלטה בלי לחץ. מועדים קרובים – בתיאום עם יניר.'],
  ['חתן / כלת השמחה לא שרים – זה בעיה?', 'לא. ההקלטה מתבצעת עם ליווי צמוד, ובשלב ההפקה מתבצעים תיקונים, כיוון קולות, מיקס ומאסטר.'],
  ['אפשר שבני המשפחה ישירו גם?', 'כן, אפשר לשלב בשיר הורים, אחים וחברים – מתאמים את זה בשיחת ההיכרות.'],
  ['מה מקבלים בסוף?', 'קובץ שיר מוכן להשמעה באירוע, לסרטון ולשיתוף ברשתות. אפשר להוסיף גם צילום קליפ באולפן.'],
];
