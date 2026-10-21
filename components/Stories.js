'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'
import Avatar from '@/components/Avatar'

// Barre de stories : photos de tes amis (et les tiennes) publiées depuis moins de 24 h
export default function Stories({ user }) {
  const [groupes, setGroupes] = useState([])
  const [vue, setVue] = useState(null)

  const charger = useCallback(async () => {
    const depuis = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data } = await supabase.from('stories')
      .select('id, auteur, image_url, texte, created_at, profiles!auteur(nom, avatar_url)')
      .gte('created_at', depuis).order('created_at', { ascending: true })
    const m = new Map()
    ;(data || []).forEach(s => {
      if (!m.has(s.auteur)) m.set(s.auteur, { auteur: s.auteur, nom: s.profiles?.nom || 'Membre', avatar: s.profiles?.avatar_url, items: [] })
      m.get(s.auteur).items.push(s)
    })
    setGroupes([...m.values()].sort((a, b) => (a.auteur === user.id ? -1 : b.auteur === user.id ? 1 : 0)))
  }, [user.id])
  useEffect(() => { charger() }, [charger])

  async function ajouter(e) {
    const input = e.target
    const f = input.files[0]
    if (!f) return
    const texte = window.prompt('Ajoute un texte (facultatif) :', '')
    if (texte === null) { input.value = ''; return }
    const image = await redimensionner(f, 720, 0.7)
    await supabase.from('stories').insert({ auteur: user.id, image_url: image, texte: texte.trim() })
    input.value = ''
    charger()
  }
  async function supprimer(id) {
    await supabase.from('stories').delete().eq('id', id)
    setVue(null); charger()
  }
  function suivant() {
    const { g, i } = vue
    if (i + 1 < groupes[g].items.length) setVue({ g, i: i + 1 })
    else if (g + 1 < groupes.length) setVue({ g: g + 1, i: 0 })
    else setVue(null)
  }
  function precedent() {
    const { g, i } = vue
    if (i > 0) setVue({ g, i: i - 1 })
    else if (g > 0) setVue({ g: g - 1, i: groupes[g - 1].items.length - 1 })
  }

  const g = vue && groupes[vue.g]
  const s = g && g.items[vue.i]
  return (
    <>
      <div className="stories">
        <label className="story">
          <span className="plus">+</span>Ma story
          <input type="file" accept="image/*" hidden onChange={ajouter} />
        </label>
        {groupes.map((x, k) => (
          <button key={x.auteur} className="story" onClick={() => setVue({ g: k, i: 0 })}>
            <span className="anneau"><Avatar nom={x.nom} url={x.avatar} taille={50} /></span>
            {x.auteur === user.id ? 'Moi' : x.nom}
          </button>
        ))}
      </div>
      {s && (
        <div className="visionneuse" role="dialog" aria-label="Story">
          <div className="story-tete">
            <Avatar nom={g.nom} url={g.avatar} taille={36} /><b>{g.nom}</b>
            <button className="alt sm" onClick={() => setVue(null)}>Fermer</button>
          </div>
          <img src={s.image_url} alt={'Story de ' + g.nom} />
          {s.texte && <p className="story-texte">{s.texte}</p>}
          <div className="story-nav">
            <button className="alt sm" onClick={precedent} aria-label="Précédente">‹</button>
            <button className="alt sm" onClick={suivant} aria-label="Suivante">›</button>
            {g.auteur === user.id && <button className="alt sm" onClick={() => supprimer(s.id)}>Supprimer</button>}
          </div>
        </div>
      )}
    </>
  )
}
