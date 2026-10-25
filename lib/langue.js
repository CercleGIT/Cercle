export const LANGUES = [
  ['fr', 'Français'], ['en', 'English'], ['pt', 'Português'], ['es', 'Español'],
  ['ar', 'العربية (arabe)'], ['sw', 'Kiswahili'], ['yo', 'Yorùbá (bêta)'],
]
export const getLangue = () => { try { return localStorage.getItem('cercle-langue') || 'fr' } catch { return 'fr' } }
export const setLangue = l => { try { localStorage.setItem('cercle-langue', l) } catch {} }
