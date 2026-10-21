import Link from 'next/link'

const MOTIF = /([#@][\p{L}\p{N}_]+)/gu
const ETIQUETTE = /^[#@][\p{L}\p{N}_]+$/u

// Affiche un texte avec #hashtags et @mentions cliquables (ils ouvrent la recherche)
export default function Texte({ t }) {
  return t.split(MOTIF).map((m, i) => (
    ETIQUETTE.test(m)
      ? <Link key={i} className="etiquette" href={'/recherche?q=' + encodeURIComponent(m)}>{m}</Link>
      : m
  ))
}
