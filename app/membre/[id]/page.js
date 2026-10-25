'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import Verifie from '@/components/Verifie'
import { supabase } from '@/lib/supabase'

function Membre({ user }) {
  const { id } = useParams()
  const [p, setP] = useState(undefined)
  const [lien, setLien] = useState(null)
  const [posts, setPosts] = useState([])
  const [info, setInfo] = useState('')
  const [admin, setAdmin] = useState(false)
  const [createur, setCreateur] = useState(null)
  const [abonne, setAbonne] = useState(false)
  const [nbAbonnes, setNbAbonnes] = useState(0)

  const charger = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, nom, bio, avatar_url, derniere_activite, verifie, officiel').eq('id', id).maybeSingle()
    setP(data)
    const { data: ab } = await supabase.from('abonnements').select('suivi').match({ abonne: user.id, suivi: id }).maybeSingle()
    setAbonne(!!ab)
    const { count } = await supabase.from('abonnements').select('abonne', { count: 'exact', head: true }).eq('suivi', id)
    setNbAbonnes(count || 0)
    const { data: l } = await supabase.from('friendships').select('demandeur, destinataire, statut')
    setLien((l || []).find(x => [x.demandeur, x.destinataire].includes(id)) || null)
    const { data: cr } = await supabase.from('createurs').select('activite').eq('user_id', id).eq('actif', true).maybeSingle()
    setCreateur(cr)
    const { data: ps } = await supabase.from('posts').select('id, texte, image_url, created_at').eq('auteur', id).is('group_id', null).order('created_at', { ascending: false }).limit(20)
    setPosts(ps || [])
  }, [id, user.id])
  useEffect(() => {
    charger()
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setAdmin(!!data))
  }, [charger, user.id])

  async function ajouter() {
    const { error } = await supabase.from('friendships').insert({ demandeur: user.id, destinataire: id })
    setInfo(error ? 'Demande impossible.' : 'Demande envoyée.'); charger()
  }
  async function bloquer() {
    if (!window.confirm('Bloquer ce membre ?')) return
    const { error } = await supabase.from('blocks').insert({ blocker: user.id, blocked: id })
    setInfo(error ? 'Blocage impossible.' : 'Membre bloqué.')
  }

  async function basculerAbo() {
    const q = supabase.from('abonnements')
    const { error } = await (abonne ? q.delete().match({ abonne: user.id, suivi: id }) : q.insert({ abonne: user.id, suivi: id }))
    setInfo(error ? 'Action impossible.' : abonne ? 'Tu ne suis plus ce compte.' : 'Tu es abonné(e) : tu seras prévenu(e) de ses publications.')
    charger()
  }
  async function basculerOfficiel() {
    const { error } = await supabase.from('profiles').update({ officiel: !p.officiel }).eq('id', id)
    setInfo(error ? 'Action impossible.' : p.officiel ? 'Compte officiel retiré.' : 'Compte officiel activé.')
    charger()
  }
  const basculerCertif = async () => {
    const { error } = await supabase.from('profiles').update({ verifie: !p.verifie }).eq('id', id)
    setInfo(error ? 'Action impossible.' : p.verifie ? 'Certification retirée.' : 'Compte certifié.')
    charger()
  }
  const appeler = video => window.dispatchEvent(new CustomEvent('cercle-appel', { detail: { id, nom: p?.nom, avatar: p?.avatar_url, video } }))

  if (p === undefined) return <p className="muted">Chargement…</p>
  if (!p) return <p className="muted">Membre introuvable.</p>
  const moi = id === user.id
  const enLigne = p.derniere_activite && Date.now() - new Date(p.derniere_activite).getTime() < 150000
  return (
    <>
      <div className="box">
        <div className="profil-tete">
          <Avatar nom={p.nom} url={p.avatar_url} taille={80} />
          <div>
            <h2 style={{ margin: 0 }}>{p.nom} {p.verifie && <Verifie />} {p.officiel && <span className="etiquette-role">Officiel</span>} {enLigne && <span className="point" title="En ligne" />}</h2>
            {p.bio && <p className="texte">{p.bio}</p>}
            {createur && <Link className="etiquette" href={'/createurs/' + id}>🎨 Créateur : {createur.activite} →</Link>}
          </div>
        </div>
        <div className="actions">
          {moi && <Link className="btnlink" href="/profil">Modifier mon profil</Link>}
          {!moi && !p.officiel && !lien && <button className="sm" onClick={ajouter}>Ajouter</button>}
          {!moi && p.officiel && <button className={abonne ? 'alt sm' : 'sm'} onClick={basculerAbo}>{abonne ? '✓ Abonné' : 'S’abonner'}</button>}
          {p.officiel && <span className="muted">{nbAbonnes} abonné{nbAbonnes > 1 ? 's' : ''}</span>}
          {!moi && lien?.statut === 'en_attente' && <span className="muted">Demande en attente</span>}
          {!moi && lien?.statut === 'accepte' && <Link className="btnlink" href={'/messages?ami=' + id}>Écrire un message</Link>}
          {!moi && lien?.statut === 'accepte' && <><button className="alt sm" onClick={() => appeler(false)}>📞 Vocal</button><button className="alt sm" onClick={() => appeler(true)}>🎥 Vidéo</button></>}
          {!moi && !p.officiel && <button className="alt sm droite" onClick={bloquer}>Bloquer</button>}
          {admin && <button className="alt sm" onClick={basculerOfficiel}>{p.officiel ? 'Retirer « compte officiel »' : '⭐ Marquer comme compte officiel'}</button>}
          {admin && <button className="alt sm" onClick={basculerCertif}>{p.verifie ? 'Retirer la certification' : '✓ Certifier ce compte'}</button>}
        </div>
        {info && <p className="msg ok" role="status">{info}</p>}
      </div>
      <h2>Publications</h2>
      {!posts.length && <p className="muted">Aucune publication.</p>}
      {posts.map(x => (
        <div className="box" key={x.id}>
          <div className="muted">{new Date(x.created_at).toLocaleString('fr-FR')}</div>
          {x.texte && <p className="texte">{x.texte}</p>}
          {x.image_url && <img className="photo" src={x.image_url} alt="Photo publiée" />}
        </div>
      ))}
    </>
  )
}

export default function Page() { return <Shell>{user => <Membre user={user} />}</Shell> }
