'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'
import { CATEGORIES, DEVISES, PAYS, devisePar } from '@/lib/marche'

function Nouvelle({ user }) {
  const router = useRouter()
  const [f, setF] = useState({ titre: '', categorie: '', prix: '', devise: 'EUR', pays: '', etat: '', ville: '', description: '' })
  const [photos, setPhotos] = useState([])
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const maj = k => e => setF({ ...f, [k]: e.target.value })

  async function ajouter(e) {
    const fichiers = [...e.target.files].slice(0, 4 - photos.length)
    const nouvelles = []
    for (const fic of fichiers) nouvelles.push({ grande: await redimensionner(fic, 700, 0.65), mini: await redimensionner(fic, 360, 0.6) })
    setPhotos([...photos, ...nouvelles])
    e.target.value = ''
  }
  async function publier(e) {
    e.preventDefault()
    if (f.titre.trim().length < 3) return setErreur('Le titre doit contenir au moins 3 caractères.')
    if (!f.categorie) return setErreur('Choisis une catégorie.')
    if (!f.pays) return setErreur('Choisis le pays de vente.')
    if (f.prix !== '' && Number(f.prix) < 0) return setErreur('Le prix ne peut pas être négatif.')
    setEnvoi(true); setErreur('')
    const { data, error } = await supabase.from('annonces').insert({
      vendeur: user.id, titre: f.titre.trim(), description: f.description.trim(), categorie: f.categorie,
      prix: f.prix === '' ? null : Number(f.prix), devise: f.devise, pays: f.pays, etat: f.etat || null, ville: f.ville.trim() || null,
      images: photos.map(p => p.grande), vignette: photos[0]?.mini || null,
    }).select('id').single()
    setEnvoi(false)
    if (error) return setErreur('Publication impossible. Essaie avec moins ou de plus petites photos.')
    router.push('/marketplace/' + data.id)
  }

  return (
    <form className="box" onSubmit={publier}>
      <h2>Publier une annonce</h2>
      <label htmlFor="titre">Titre</label>
      <input id="titre" value={f.titre} onChange={maj('titre')} maxLength={120} placeholder="Ex. : Téléphone en très bon état" />
      <label htmlFor="cat">Catégorie</label>
      <select id="cat" value={f.categorie} onChange={maj('categorie')}>
        <option value="">Choisir…</option>
        {CATEGORIES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
      </select>
      <label htmlFor="pays">Pays de vente (la devise s’ajuste selon le pays)</label>
      <select id="pays" value={f.pays} onChange={e => setF({ ...f, pays: e.target.value, devise: devisePar(e.target.value) })}>
        <option value="">Choisir…</option>
        {PAYS.map(([nom]) => <option key={nom} value={nom}>{nom}</option>)}
      </select>
      <label htmlFor="prix">Prix (laisse vide pour « prix à débattre », 0 pour « gratuit »). Devise : € ou $, modifiable.</label>
      <div className="saisie">
        <input id="prix" type="number" min="0" step="any" value={f.prix} onChange={maj('prix')} />
        <select value={f.devise} onChange={maj('devise')} aria-label="Devise" style={{ width: 110 }}>
          {DEVISES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
      </div>
      <label htmlFor="etat">État</label>
      <select id="etat" value={f.etat} onChange={maj('etat')}>
        <option value="">Non précisé</option><option value="neuf">Neuf</option><option value="occasion">Occasion</option>
      </select>
      <label htmlFor="ville">Ville</label>
      <input id="ville" value={f.ville} onChange={maj('ville')} maxLength={60} placeholder="Ex. : Cotonou" />
      <label htmlFor="desc">Description</label>
      <textarea id="desc" rows={5} value={f.description} onChange={maj('description')} maxLength={4000} />
      <label>Photos ({photos.length}/4)</label>
      <div className="minis">
        {photos.map((p, i) => (
          <button type="button" key={i} onClick={() => setPhotos(photos.filter((_, k) => k !== i))} aria-label="Retirer la photo"><img src={p.mini} alt="" /></button>
        ))}
        {photos.length < 4 && <label className="alt sm bouton" style={{ alignSelf: 'center' }}>📷 Ajouter<input type="file" accept="image/*" multiple hidden onChange={ajouter} /></label>}
      </div>
      <p className="muted">Touche une photo pour la retirer. La première sert d’image principale.</p>
      <button disabled={envoi}>{envoi ? 'Publication…' : 'Publier l’annonce'}</button>
      {erreur && <p className="msg err" role="status">{erreur}</p>}
    </form>
  )
}

export default function Page() { return <Shell>{user => <Nouvelle user={user} />}</Shell> }
