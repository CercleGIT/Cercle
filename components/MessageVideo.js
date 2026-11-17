'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Lecteur d'une vidéo envoyée en message privé (le fichier est privé : on demande un lien temporaire)
export default function MessageVideo({ chemin }) {
  const [url, setUrl] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    supabase.storage.from('videos-messages').createSignedUrl(chemin, 3600).then(({ data, error }) => {
      if (error || !data) setErr(true)
      else setUrl(data.signedUrl)
    })
  }, [chemin])
  if (err) return <span className="muted">🎥 Vidéo indisponible</span>
  if (!url) return <span className="muted">🎥 Chargement…</span>
  return <video src={url} controls playsInline preload="metadata" style={{ display: 'block', width: '100%', maxWidth: 320, maxHeight: 360, borderRadius: 12, background: '#000', marginBottom: 4 }} />
}
