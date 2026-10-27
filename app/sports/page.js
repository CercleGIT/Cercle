'use client'
import Shell from '@/components/Shell'
import Fil from '@/components/Fil'

export default function Page() { return <Shell>{user => <Fil user={user} categorie="sports" />}</Shell> }
