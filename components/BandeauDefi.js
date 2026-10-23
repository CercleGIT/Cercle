import Link from 'next/link'
import { defiDuJour } from '@/lib/defis'

export default function BandeauDefi() {
  const d = defiDuJour()
  return (
    <Link href="/defi" className="bandeau-defi">
      <span className="emoji">{d.emoji}</span>
      <div><b>Défi du jour : {d.titre}</b><div>Participe et invite tes amis →</div></div>
    </Link>
  )
}
