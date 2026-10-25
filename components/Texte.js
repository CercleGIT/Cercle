import Link from 'next/link'

const MOTIF = /(https?:\/\/[^\s]+|[#@][\p{L}\p{N}_]+)/gu
const ETIQUETTE = /^[#@][\p{L}\p{N}_]+$/u
const LIEN = /^https?:\/\//

// Affiche un texte avec liens, #hashtags et @mentions cliquables
export default function Texte({ t }) {
  return t.split(MOTIF).map((m, i) => {
    if (LIEN.test(m)) {
      const fin = (m.match(/[.,;:!?)\]]+$/) || [''])[0]
      const url = fin ? m.slice(0, -fin.length) : m
      let court = url
      try {
        const u = new URL(url)
        court = u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname.slice(0, 24) + (u.pathname.length > 24 ? '…' : '') : '')
      } catch {}
      return <span key={i}><a className="lien-externe" href={url} target="_blank" rel="noopener noreferrer nofollow">{court}</a>{fin}</span>
    }
    return ETIQUETTE.test(m)
      ? <Link key={i} className="etiquette" href={'/recherche?q=' + encodeURIComponent(m)}>{m}</Link>
      : m
  })
}
