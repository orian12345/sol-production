import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { PAGES } from './pages/index.js';
import './styles.css';

const Page = PAGES[document.body.dataset.page] || PAGES.home;
const el = document.getElementById('app');
const tree = <StrictMode><Page /></StrictMode>;

// באתר החי ה-HTML כבר מלא (נבנה מראש) → React רק "מתחבר" אליו. בפיתוח מקומי — מצייר מאפס.
if (el.firstElementChild) hydrateRoot(el, tree);
else createRoot(el).render(tree);
