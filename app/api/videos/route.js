import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { XMLParser } from 'fast-xml-parser'
import { SOURCES_VIDEOS } from '@/lib/sourcesVideos'

export const dynamic = 'force-dynamic'
export const maxDuration = 25

const parseur = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text', processEntities: false })
const texteDe = v => (v == null ? '' : typeof v === 'object' ? (v['#text'] ?? '') : String(v))
const cp = n => { try { return String.fromCodePoint(n) } catch { return '' } }
const decoder = t => t
  .replace(/&#x([0-9a-f]+);/gi, (m, n) => cp(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (m, n) => cp(parseInt(n, 10)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const nettoyer = h => decoder(decoder(texteDe(h)).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
const un = v => (Array.isArray(v) ? v[0] : v)

const MAX_JOURS = 30

async function recuperer(source) {
  try {
    // Attention : pas d'accent ni d'apostrophe courbe dans les en-tetes HTTP
    const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + source.id, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'CercleBot/1.0 (videos)', Accept: 'application/atom+xml, application/xml, text/xml' },
    })
    if (!r.ok) return { source, videos: [], erreur: 'HTTP ' + r.status }
    const doc = parseur.parse(await r.text())
    const brut = doc?.feed?.entry || []
    const items = Array.isArray(brut) ? brut : [brut]
    const videos = items.map(it => {
      const id = texteDe(it['yt:videoId']).trim()
      const groupe = it['media:group'] || {}
      return {
        source: source.nom, langue: source.langue,
        titre: nettoyer(un(it.title)),
        lien: id ? 'https://www.youtube.com/watch?v=' + id : '',
        image: id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '',
        resume: nettoyer(groupe['media:description'] || ''),
        date: Date.parse(texteDe(it.published)) || 0,
      }
    }).filter(v => v.titre && v.lien && !/#shorts?\b/i.test(v.titre))
    return { source, videos }
  } catch (e) {
    return { source, videos: [], erreur: String(e.message || e) }
  }
}

async function lancer(req) {
  const attendu = process.env.CRON_SECRET
  if (!attendu || req.headers.get('authorization') !== 'Bearer ' + attendu) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: 401 })
  if (String(process.env.VIDEOS_ACTIVES || 'oui').toLowerCase() === 'non') return NextResponse.json({ publie: false, raison: 'Robot en pause (VIDEOS_ACTIVES=non).' })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ erreur: 'SUPABASE_SERVICE_ROLE_KEY manquante.' }, { status: 500 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: compte } = await sb.from('profiles').select('id, nom').eq('officiel', true).ilike('nom', 'Cercle Officiel').order('created_at').limit(1).maybeSingle()
  if (!compte) return NextResponse.json({ erreur: 'Aucun compte « Cercle Officiel » marqué comme officiel.' }, { status: 409 })

  const resultats = await Promise.all(SOURCES_VIDEOS.map(recuperer))
  const etat = resultats.map(r => ({ nom: r.source.nom, ok: !r.erreur, videos: r.videos.length, erreur: r.erreur }))

  const limite = Date.now() - MAX_JOURS * 24 * 3600 * 1000
  const retenues = resultats.flatMap(r => r.videos)
    .filter(v => v.date > limite)
    .sort((a, b) => b.date - a.date)
    .slice(0, 40)
  if (!retenues.length) return NextResponse.json({ publie: false, raison: 'Aucune vidéo récente.', sources: etat })

  const { data: deja } = await sb.from('actualites_publiees').select('lien').in('lien', retenues.map(v => v.lien))
  const vues = new Set((deja || []).map(x => x.lien))
  const neuves = retenues.filter(v => !vues.has(v.lien))
  if (!neuves.length) return NextResponse.json({ publie: false, raison: 'Rien de nouveau.', sources: etat })

  const noms = SOURCES_VIDEOS.map(s => s.nom)
  const { data: derniere } = await sb.from('actualites_publiees').select('source').in('source', noms).order('publie_le', { ascending: false }).limit(1).maybeSingle()
  // On prefere une video d'une chaine differente de la derniere publication
  const choix = neuves.find(v => v.source !== derniere?.source) || neuves[0]

  let resume = choix.resume
  if (resume.length > 240) resume = resume.slice(0, 237).trimEnd() + '…'
  const texte = '🎬 Documentaire : ' + choix.titre + (resume ? '\n\n' + resume : '') +
    '\n\nChaîne : ' + choix.source + ' (' + choix.langue + ')\n' + choix.lien

  const debut = new Date(Date.now() - 5000).toISOString()
  let { data: post, error } = await sb.from('posts').insert({ auteur: compte.id, texte, chaine: 'videos', image_url: choix.image }).select('id').single()
  if (error && /chaine/i.test(error.message || '') === false) {
    // Nouvel essai sans la miniature
    ;({ data: post, error } = await sb.from('posts').insert({ auteur: compte.id, texte, chaine: 'videos' }).select('id').single())
  }
  if (error) return NextResponse.json({ erreur: 'Publication impossible : ' + error.message }, { status: 500 })
  await sb.from('actualites_publiees').insert({ lien: choix.lien, source: choix.source, titre: choix.titre, post_id: post.id })
  await sb.from('notifications').delete().eq('texte', compte.nom + ' a publié une nouvelle publication.').gte('created_at', debut)

  return NextResponse.json({ publie: true, titre: choix.titre, source: choix.source, chaine: 'videos', sources: etat })
}

async function sur(req) {
  try { return await lancer(req) }
  catch (e) { return NextResponse.json({ erreur: 'Plantage : ' + String(e?.stack || e?.message || e).slice(0, 600) }, { status: 500 }) }
}
export async function GET(req) { return sur(req) }
export async function POST(req) { return sur(req) }
