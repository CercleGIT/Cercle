'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import Verifie from '@/components/Verifie'
import { supabase } from '@/lib/supabase'
import { trouverJeu } from '@/lib/jeux'

function Jeu({ user }) {
  const { jeu: id } = useParams()
  const jeu = trouverJeu(id)
  const cadre = useRef(null)
  const [classement, setClassement] = useState([])
  const [meilleur, setMeilleur] = useState(null)
  const [dernier, setDernier] = useState(null)
  const [info, setInfo] = useState('')

  const chargerClassement = useCallback(async () => {
    const { data } = await supabase.from('scores_jeux')
      .select('user_id, meilleur, profiles(nom, avatar_url, verifie)').eq('jeu', id).order('meilleur', { ascending: false }).limit(20)
    setClassement(data || [])
    const moi = (data || []).find(s => s.user_id === user.id)
    if (moi) setMeilleur(moi.meilleur)
  }, [id, user.id])
  useEffect(() => { chargerClassement() }, [chargerClassement])

  useEffect(() => {
    async function recevoir(e) {
      if (e.origin !== window.location.origin || e.source !== (cadre.current && cadre.current.contentWindow)) return
      const d = e.data
      if (!d || d.type !== 'cercle-score' || d.jeu !== id) return
      const score = Math.floor(Number(d.score))
      if (!(score >= 0)) return
      setDernier(score)
      const { data, error } = await supabase.rpc('enregistrer_score', { jeu_id: id, score })
      if (!error) { setMeilleur(data); chargerClassement() }
    }
    window.addEventListener('message', recevoir)
    return () => window.removeEventListener('message', recevoir)
  }, [id, chargerClassement])

  if (!jeu) return <p className="muted">Jeu introuvable. <Link href="/jeux">Retour aux jeux</Link></p>

  async function publier() {
    const texte = '🎮 J’ai fait ' + meilleur + ' points à ' + jeu.nom + ' ! Qui peut me battre ?'
    const { error } = await supabase.from('posts').insert({ auteur: user.id, texte })
    setInfo(error ? 'Publication impossible.' : 'Score publié sur ton Fil !')
  }
  async function defier() {
    const url = window.location.href
    const message = 'Relève mon défi sur Cercle : bats mon score à ' + jeu.nom + (meilleur ? ' (' + meilleur + ' points)' : '') + ' !'
    if (navigator.share) { try { await navigator.share({ title: jeu.nom, text: message, url }) } catch {} }
    else { try { await navigator.clipboard.writeText(message + ' ' + url); setInfo('Lien copié : colle-le dans une conversation.') } catch { setInfo(url) } }
  }

  return (
    <>
      <Link href="/jeux" className="muted">← Tous les jeux</Link>
      <div className="box" style={{ marginTop: 8, padding: 8 }}>
        <iframe ref={cadre} src={jeu.fichier} title={jeu.nom} className="jeu-cadre" style={jeu.hauteur ? { height: jeu.hauteur } : undefined} allow="fullscreen" />
      </div>
      <div className="box defi-tete">
        <p className="compte">{dernier !== null ? 'Dernière partie : ' + dernier + ' points · ' : ''}{meilleur !== null ? 'Ton meilleur score : ' + meilleur : 'Joue une partie pour entrer au classement !'}</p>
        <div className="actions" style={{ justifyContent: 'center' }}>
          {meilleur !== null && <button className="sm" onClick={publier}>📣 Publier mon score sur le Fil</button>}
          <button className="alt sm" onClick={defier}>↗ Défier un ami</button>
        </div>
        {info && <p className="msg ok" role="status">{info}</p>}
      </div>
      <div className="box">
        <h2>🏆 Classement</h2>
        {!classement.length && <p className="muted">Personne n’a encore de score. Sois le premier !</p>}
        {classement.map((s, i) => (
          <div className={'resultat' + (s.user_id === user.id ? ' moi-classement' : '')} key={s.user_id}>
            <b style={{ width: 28 }}>{['🥇', '🥈', '🥉'][i] || i + 1}</b>
            <Avatar nom={s.profiles?.nom} url={s.profiles?.avatar_url} taille={34} id={s.user_id} />
            <div><Link className="lienmembre" href={'/membre/' + s.user_id}><b>{s.profiles?.nom || 'Membre'}</b></Link>{s.profiles?.verifie && <Verifie />}</div>
            <b>{s.meilleur}</b>
          </div>
        ))}
      </div>
    </>
  )
}

export default function Page() { return <Shell>{user => <Jeu user={user} />}</Shell> }
