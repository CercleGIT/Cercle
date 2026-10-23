'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Lecteur d'un message vocal (le fichier est privé : on demande un lien temporaire)
export default function MessageVocal({ chemin }) {
  const [url, setUrl] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    supabase.storage.from('vocaux').createSignedUrl(chemin, 3600).then(({ data, error }) => {
      if (error || !data) setErr(true)
      else setUrl(data.signedUrl)
    })
  }, [chemin])
  if (err) return <span className="muted">🎤 Message vocal indisponible</span>
  if (!url) return <span className="muted">🎤 Chargement…</span>
  return <audio className="audio-vocal" controls preload="metadata" src={url} />
}
