import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { PAGES } from './pages/index.js';
import './styles.css';

// כל כניסה לאתר נפתחת מההתחלה (הדפדפן לא "זוכר" איפה עצרו). קישור עם # (למשל /#booking) עדיין קופץ לחלק הנכון.
try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch { /* ignore */ }
if (!location.hash) window.scrollTo(0, 0);

const Page = PAGES[document.body.dataset.page] || PAGES.home;
const el = document.getElementById('app');
const tree = <StrictMode><Page /></StrictMode>;

// באתר החי ה-HTML כבר מלא (נבנה מראש) → React רק "מתחבר" אליו. בפיתוח מקומי — מצייר מאפס.
if (el.firstElementChild) hydrateRoot(el, tree);
else createRoot(el).render(tree);
