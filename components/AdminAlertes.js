'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TYPES = { publication: 'Publication', commentaire: 'Commentaire', annonce: 'Annonce' }
const TABLES = { publication: 'posts', commentaire: 'comments', annonce: 'annonces' }
const CATEGORIES = ['menace', 'haine', 'arnaque', 'drogue', 'arme', 'sexuel', 'mineurs', 'autre']

// Contenus suspects détectés automatiquement + liste des mots surveillés
export default function AdminAlertes({ apres }) {
  const [liste, setListe] = useState(null)
  const [onglet, setOnglet] = useState('attente')
  const [mots, setMots] = useState([])
  const [nouveau, setNouveau] = useState({ mot: '', categorie: 'autre' })
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('alertes')
      .select('id, type, cible_id, auteur, extrait, motif, categorie, created_at, profiles!auteur(nom)')
      .eq('traitee', onglet === 'traitees').order('created_at', { ascending: false }).limit(100)
    setListe(data || [])
    const { data: m } = await supabase.from('mots_interdits').select('id, mot, categorie, actif').order('categorie').order('mot')
    setMots(m || [])
  }, [onglet])
  useEffect(() => { charger() }, [charger])

  const fini = async () => { await charger(); if (apres) apres() }
  async function ignorer(a) { await supabase.from('alertes').update({ traitee: true }).eq('id', a.id); fini() }
  async function supprimerContenu(a) {
    if (!window.confirm('Supprimer définitivement ce contenu ?')) return
    const { error } = await supabase.from(TABLES[a.type]).delete().eq('id', a.cible_id)
    setInfo(error ? 'Suppression impossible (le contenu n’existe peut-être plus).' : 'Contenu supprimé.')
    await supabase.from('alertes').update({ traitee: true }).eq('id', a.id)
    fini()
  }
  async function ajouterMot(e) {
    e.preventDefault()
    const mot = nouveau.mot.trim().toLowerCase()
    if (mot.length < 3) return setInfo('Le mot ou la phrase doit contenir au moins 3 caractères.')
    const { error } = await supabase.from('mots_interdits').insert({ mot, categorie: nouveau.categorie })
    setInfo(error ? 'Ajout impossible (déjà présent ?).' : 'Ajouté à la surveillance.')
    setNouveau({ mot: '', categorie: nouveau.categorie }); charger()
  }
  async function basculerMot(m) { await supabase.from('mots_interdits').update({ actif: !m.actif }).eq('id', m.id); charger() }
  async function retirerMot(m) { await supabase.from('mots_interdits').delete().eq('id', m.id); charger() }

  return (
    <>
      <div className="onglets" style={{ marginBottom: 12 }}>
        <button className={onglet === 'attente' ? '' : 'alt'} onClick={() => setOnglet('attente')}>À traiter</button>
        <button className={onglet === 'traitees' ? '' : 'alt'} onClick={() => setOnglet('traitees')}>Traitées</button>
      </div>
      {info && <p className="msg ok" role="status">{info}</p>}
      {liste === null && <p className="muted">Chargement…</p>}
      {liste && !liste.length && <p className="muted">{onglet === 'attente' ? 'Aucune alerte à traiter. 🎉' : 'Aucune alerte traitée.'}</p>}
      {(liste || []).map(a => (
        <div className="box" key={a.id}>
          <div className="muted">{TYPES[a.type] || a.type} · {new Date(a.created_at).toLocaleString('fr-FR')} · catégorie : <b>{a.categorie || 'autre'}</b></div>
          <p style={{ margin: '6px 0' }}>⚠️ Mots détectés : <b>{a.motif}</b></p>
          <p className="texte partage">{a.extrait}</p>
          <div className="muted">Auteur : <Link className="lienmembre" href={'/membre/' + a.auteur}><b>{a.profiles?.nom || 'Membre'}</b></Link></div>
          {onglet === 'attente' && (
            <div className="actions">
              <button className="sm" onClick={() => supprimerContenu(a)}>Supprimer le contenu</button>
              <button className="alt sm" onClick={() => ignorer(a)}>Ignorer (sans danger)</button>
            </div>
          )}
        </div>
      ))}

      <div className="box">
        <h2>Mots et phrases surveillés ({mots.filter(m => m.actif).length})</h2>
        <p className="muted">Quand un membre publie un de ces mots (publication, commentaire ou annonce), tu reçois une alerte. Les messages privés ne sont jamais analysés.</p>
        <form className="saisie" onSubmit={ajouterMot}>
          <input value={nouveau.mot} onChange={e => setNouveau({ ...nouveau, mot: e.target.value })} placeholder="Mot ou phrase à surveiller" aria-label="Mot à surveiller" maxLength={80} />
          <select value={nouveau.categorie} onChange={e => setNouveau({ ...nouveau, categorie: e.target.value })} aria-label="Catégorie" style={{ width: 120 }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="sm">Ajouter</button>
        </form>
        {mots.map(m => (
          <div className="ligne" key={m.id}>
            <span style={{ opacity: m.actif ? 1 : 0.45 }}><b>{m.mot}</b> <span className="muted">· {m.categorie}</span></span>
            <span>
              <button className="alt sm" onClick={() => basculerMot(m)}>{m.actif ? 'Désactiver' : 'Activer'}</button>{' '}
              <button className="alt sm" onClick={() => retirerMot(m)} aria-label="Retirer">✕</button>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
