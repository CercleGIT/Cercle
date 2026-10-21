export default function manifest() {
  return {
    name: 'Cercle',
    short_name: 'Cercle',
    description: 'Retrouve tes amis et tes groupes',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f5fa',
    theme_color: '#2455e6',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
