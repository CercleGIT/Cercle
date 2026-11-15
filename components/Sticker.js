import { STICKERS } from '@/lib/stickers'

const CSS = `
.stk-emoji { display:inline-block; transform-origin:center; line-height:1; }
.st-bounce { animation: st-bounce 1.1s ease-in-out infinite; }
.st-pulse  { animation: st-pulse 1.1s ease-in-out infinite; }
.st-shake  { animation: st-shake .7s ease-in-out infinite; }
.st-wave   { animation: st-wave 1.4s ease-in-out infinite; transform-origin:70% 80%; }
.st-spin   { animation: st-spin 2.4s linear infinite; }
.st-pop    { animation: st-pop 1.3s ease-in-out infinite; }
.st-flicker{ animation: st-flicker .9s ease-in-out infinite; transform-origin:50% 90%; }
.st-float  { animation: st-float 2.2s ease-in-out infinite; }
@keyframes st-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12%); } }
@keyframes st-pulse { 0%,100% { transform: scale(1); } 20% { transform: scale(1.22); } 40% { transform: scale(1); } 60% { transform: scale(1.16); } }
@keyframes st-shake { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-12deg); } 75% { transform: rotate(12deg); } }
@keyframes st-wave { 0%,100% { transform: rotate(0); } 20% { transform: rotate(22deg); } 40% { transform: rotate(-12deg); } 60% { transform: rotate(22deg); } 80% { transform: rotate(-6deg); } }
@keyframes st-spin { to { transform: rotate(360deg); } }
@keyframes st-pop { 0%,100% { transform: scale(1) rotate(0); } 30% { transform: scale(1.28) rotate(-8deg); } 60% { transform: scale(.94) rotate(6deg); } }
@keyframes st-flicker { 0%,100% { transform: scale(1) rotate(0); } 25% { transform: scale(1.1,1.2) rotate(-4deg); } 50% { transform: scale(.95,1.05) rotate(3deg); } 75% { transform: scale(1.08,1.15) rotate(-2deg); } }
@keyframes st-float { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-9%) rotate(3deg); } }
@media (prefers-reduced-motion: reduce) { .stk-emoji { animation: none !important; } }
`

// À placer une fois dans la page : contient les animations des autocollants
export function StyleStickers() { return <style>{CSS}</style> }

export default function Sticker({ id, taille = 96 }) {
  const s = STICKERS.find(x => x.id === id)
  if (!s) return null
  return (
    <span
      role="img"
      aria-label={s.texte}
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: taille * 0.04,
        width: taille, height: taille, borderRadius: '24%', color: '#fff', fontWeight: 800, textAlign: 'center',
        background: 'linear-gradient(145deg, ' + s.de + ', ' + s.a + ')', boxShadow: '0 4px 10px rgba(0,0,0,.18)', overflow: 'hidden',
      }}
    >
      <span className={'stk-emoji st-' + s.anim} style={{ fontSize: taille * 0.46 }}>{s.emoji}</span>
      <span style={{ fontSize: Math.max(10, taille * 0.125), textShadow: '0 1px 2px rgba(0,0,0,.35)', padding: '0 4px' }}>{s.texte}</span>
    </span>
  )
}
