'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'
import { PAYS, DEVISES, devisePar } from '@/lib/marche'
import { CATEGORIES_CREATEURS } from '@/lib/createurs'

const VIDE = { activite: '', categorie: '', description: '', ville: '', pays: '', contact_public: '', actif: true }

function Modifier({ user }) {
  const [f, setF] = useState(VIDE)
  const [services, setServices] = useState([])
  const [existe, setExiste] = useState(false)
  const [oeuvres, setOeuvres] = useState([])
  const [nouvelle, setNouvelle] = useState({ titre: '', description: '', image: null })
  const [info, setInfo] = useState('')
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    const { data } = await supabase.from('createurs').select('*').eq('user_id', user.id).maybeSingle()
    if (data) {
      setExiste(true)
      setF({ activite: data.activite, categorie: data.categorie, description: data.description || '', ville: data.ville || '', pays: data.pays || '', contact_public: data.contact_public || '', actif: data.actif })
      setServices(Array.isArray(data.services) ? data.services : [])
    }
    const { data: o } = await supabase.from('realisations').select('id, titre, description, image_url').eq('auteur', user.id).order('created_at', { ascending: false })
    setOeuvres(o || [])
    setChargement(false)
  }, [user.id])
  useEffect(() => { charger() }, [charger])

  const maj = k => e => setF({ ...f, [k]: e.target.value })
  const majService = (i, k, v) => setServices(services.map((s, n) => (n === i ? { ...s, [k]: v } : s)))

  async function enregistrer(e) {
    e.preventDefault()
    if (f.activite.trim().length < 3) return setInfo('Décris ton activité en quelques mots (3 caractères minimum).')
    if (!f.categorie) return setInfo('Choisis une catégorie.')
    const propres = services.filter(s => s.titre.trim()).map(s => ({ titre: s.titre.trim().slice(0, 80), prix: s.prix === '' ? '' : Number(s.prix), devise: s.devise }))
    const { error } = await supabase.from('createurs').upsert({
      user_id: user.id, activite: f.activite.trim(), categorie: f.categorie, description: f.description.trim(),
      ville: f.ville.trim() || null, pays: f.pays || null, contact_public: f.contact_public.trim() || null, services: propres, actif: f.actif,
    })
    if (error) return setInfo('Enregistrement impossible.')
    setExiste(true); setInfo('Profil créateur enregistré.')
  }
  async function supprimerProfil() {
    if (!window.confirm('Supprimer ton profil créateur ? Tes réalisations resteront enregistrées.')) return
    await supabase.from('createurs').delete().eq('user_id', user.id)
    setExiste(false); setF(VIDE); setServices([]); setInfo('Profil créateur supprimé.')
  }
  async function ajouterOeuvre(e) {
    e.preventDefault()
    if (nouvelle.titre.trim().length < 2) return setInfo('Donne un titre à ta réalisation.')
    const { error } = await supabase.from('realisations').insert({ auteur: user.id, titre: nouvelle.titre.trim(), description: nouvelle.description.trim(), image_url: nouvelle.image })
    if (error) return setInfo('Ajout impossible (12 réalisations maximum).')
    setNouvelle({ titre: '', description: '', image: null }); setInfo(''); charger()
  }
  async function supprimerOeuvre(id) { await supabase.from('realisations').delete().eq('id', id); charger() }

  if (chargement) return <p className="muted">Chargement…</p>
  return (
    <>
      <form className="box" onSubmit={enregistrer}>
        <h2>🎨 {existe ? 'Mon profil créateur' : 'Devenir créateur'}</h2>
        <label htmlFor="act">Ton activité en quelques mots</label>
        <input id="act" value={f.activite} onChange={maj('activite')} maxLength={80} placeholder="Ex. : Photographe de mariage" />
        <label htmlFor="cat">Catégorie</label>
        <select id="cat" value={f.categorie} onChange={maj('categorie')}>
          <option value="">Choisir…</option>
          {CATEGORIES_CREATEURS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
        <label htmlFor="desc">Présentation (ton parcours, tes projets)</label>
        <textarea id="desc" rows={4} value={f.description} onChange={maj('description')} maxLength={1500} />
        <label htmlFor="ville">Ville</label>
        <input id="ville" value={f.ville} onChange={maj('ville')} maxLength={60} placeholder="Ex. : Paris" />
        <label htmlFor="pays">Pays</label>
        <select id="pays" value={f.pays} onChange={maj('pays')}>
          <option value="">Choisir…</option>
          {PAYS.map(([nom]) => <option key={nom} value={nom}>{nom}</option>)}
        </select>
        <label htmlFor="contact">Contact public (facultatif : WhatsApp, e-mail, site…)</label>
        <input id="contact" value={f.contact_public} onChange={maj('contact_public')} maxLength={200} />
        <p className="muted">Ce contact sera visible par tous les membres. Tu peux le laisser vide : on pourra te contacter par la messagerie de Cercle.</p>

        <label>Services proposés (4 maximum)</label>
        {services.map((s, i) => (
          <div className="saisie" key={i}>
            <input value={s.titre} onChange={e => majService(i, 'titre', e.target.value)} placeholder="Ex. : Séance photo" aria-label="Service" />
            <input type="number" min="0" step="any" value={s.prix} onChange={e => majService(i, 'prix', e.target.value)} placeholder="Prix" aria-label="Prix" style={{ width: 90 }} />
            <select value={s.devise} onChange={e => majService(i, 'devise', e.target.value)} aria-label="Devise" style={{ width: 80 }}>
              {DEVISES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <button type="button" className="alt sm" onClick={() => setServices(services.filter((_, n) => n !== i))} aria-label="Retirer">✕</button>
          </div>
        ))}
        {services.length < 4 && <button type="button" className="alt sm" onClick={() => setServices([...services, { titre: '', prix: '', devise: devisePar(f.pays) }])}>+ Ajouter un service</button>}

        <label className="check" style={{ marginTop: 12 }}><input type="checkbox" checked={f.actif} onChange={e => setF({ ...f, actif: e.target.checked })} /> Visible dans l’annuaire des créateurs</label>
        <div className="actions"><button>Enregistrer</button>{existe && <Link className="alt sm bouton" href={'/createurs/' + user.id}>Voir mon profil</Link>}</div>
        {info && <p className="msg ok" role="status">{info}</p>}
        {existe && <button type="button" className="link" onClick={supprimerProfil}>Supprimer mon profil créateur</button>}
      </form>

      {existe && (
        <>
          <form className="box" onSubmit={ajouterOeuvre}>
            <h2>Ajouter une réalisation</h2>
            <input value={nouvelle.titre} onChange={e => setNouvelle({ ...nouvelle, titre: e.target.value })} maxLength={100} placeholder="Titre" aria-label="Titre" />
            <input value={nouvelle.description} onChange={e => setNouvelle({ ...nouvelle, description: e.target.value })} maxLength={500} placeholder="Description courte" aria-label="Description" />
            {nouvelle.image && <img className="photo" src={nouvelle.image} alt="Aperçu" />}
            <div className="actions">
              <label className="alt sm bouton">📷 Photo<input type="file" accept="image/*" hidden onChange={async e => { const fic = e.target.files[0]; if (fic) setNouvelle({ ...nouvelle, image: await redimensionner(fic, 700, 0.65) }) }} /></label>
              <button>Ajouter</button>
            </div>
          </form>
          <div className="grille">
            {oeuvres.map(o => (
              <div className="carte" key={o.id}>
                {o.image_url ? <img src={o.image_url} alt={o.titre} /> : <div className="sans-photo">🎨</div>}
                <div className="infos"><b>{o.titre}</b><button className="alt sm" style={{ marginTop: 6 }} onClick={() => supprimerOeuvre(o.id)}>Supprimer</button></div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

export default function Page() { return <Shell>{user => <Modifier user={user} />}</Shell> }
