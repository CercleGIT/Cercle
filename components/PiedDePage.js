import Link from 'next/link'

export default function PiedDePage() {
  return (
    <footer className="pied">
      <Link href="/mentions-legales">Mentions légales</Link> · <Link href="/cgu">Conditions d’utilisation</Link> · <Link href="/confidentialite">Confidentialité</Link>
    </footer>
  )
}
