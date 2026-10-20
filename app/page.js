'use client'
import Shell from '@/components/Shell'
import Fil from '@/components/Fil'

export default function Accueil() {
  return <Shell>{user => <Fil user={user} />}</Shell>
}
