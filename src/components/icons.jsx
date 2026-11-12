const base = { 'aria-hidden': true, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' };

export const IconWA = ({ size = 20 }) => (
  <svg {...base} width={size} height={size} strokeWidth="2"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3L3 21z" /></svg>
);
export const IconClose = ({ size = 16 }) => (
  <svg {...base} width={size} height={size} strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconA11y = () => (
  <svg {...base} width="28" height="28" strokeWidth="1.9"><circle cx="12" cy="4.5" r="1.8" /><path d="M5 8.5l7 1.5 7-1.5M12 10v5M12 15l-3.5 6M12 15l3.5 6" /></svg>
);
export const IconMixer = () => (
  <svg {...base} width="28" height="28" strokeWidth="1.8"><path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M2 14h4M10 8h4M18 16h4" /></svg>
);
export const IconSpeaker = () => (
  <svg {...base} width="28" height="28" strokeWidth="1.8"><circle cx="12" cy="14" r="7" /><circle cx="12" cy="14" r="2.5" /><path d="M5 6l3 2M19 6l-3 2" /></svg>
);
export const IconInstagram = () => (
  <svg {...base} width="22" height="22" strokeWidth="1.9"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
);
export const IconTikTok = () => (
  <svg {...base} width="22" height="22" strokeWidth="1.9"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 3c.5 3 2.5 5 5.5 5" /></svg>
);
export const IconYouTube = () => (
  <svg {...base} width="22" height="22" strokeWidth="1.9"><rect x="2.5" y="5" width="19" height="14" rx="4" /><polygon points="10 9 15 12 10 15" fill="currentColor" /></svg>
);
export const IconFacebook = () => (
  <svg {...base} width="22" height="22" strokeWidth="1.9"><path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" /></svg>
);
