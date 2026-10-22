export const getTheme = () => { try { return localStorage.getItem('cercle-theme') || 'auto' } catch { return 'auto' } }

export function appliquerTheme(t) {
  const r = document.documentElement
  if (t === 'clair') r.setAttribute('data-theme', 'light')
  else if (t === 'sombre') r.setAttribute('data-theme', 'dark')
  else r.removeAttribute('data-theme')
  try { localStorage.setItem('cercle-theme', t) } catch {}
}
