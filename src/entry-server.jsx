import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { PAGES } from './pages/index.js';

export function render(page) {
  const Page = PAGES[page];
  return renderToString(<StrictMode><Page /></StrictMode>);
}
