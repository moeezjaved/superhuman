'use client';
import { useEffect, useState } from 'react';

/** Stamps data-theme on <html>, overriding the OS media query in both directions. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const saved = (localStorage.getItem('hu-theme') as 'light' | 'dark' | null);
    if (saved) { document.documentElement.setAttribute('data-theme', saved); setTheme(saved); }
    else setTheme(matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hu-theme', next);
    setTheme(next);
  }

  return (
    <button onClick={toggle} aria-label="Toggle light or dark theme"
      style={{ appearance: 'none', border: '1px solid var(--hairline-strong)', background: 'transparent',
        color: 'var(--graphite)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
        display: 'grid', placeItems: 'center', fontSize: 14 }}>
      ◐
    </button>
  );
}
