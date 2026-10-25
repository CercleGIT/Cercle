import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { XMLParser } from 'fast-xml-parser'
import { SOURCES_EMPLOIS, PAYS, DOMAINES } from '@/lib/sourcesEmplois'

export const dynamic = 'force-dynamic'
export const maxDuration = 25

const parseur = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text', processEntities: false })const texteDe = v => (v == null ? '' : typeof v === 'object' ? (v['#text'] ?? '') : String(v))
const cp = n => { try { return String.fromCodePoint(n) } catch { return '' } }
const decoder = t => t
  .replace(/&#x([0-9a-f]+);/gi, (m, n) => cp(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (m, n) => cp(parseInt(n, 10)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const cp = n => { try { return String.fromCodePoint(n) } catch { return '' } }
const decoder = t => t
  .replace(/&#x([0-9a-f]+);/gi, (m, n) => cp(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (m, n) => cp(parseInt(n, 10)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const nettoyer = h => decoder(decoder(texteDe(h)).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()  .replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
const un = v => (Array.isArray(v) ? v[0] : v)
const liste = v => String(v || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)

const JEUNE = /\b(intern|internship|stagiaire|junior|entry[- ]level|graduate|trainee|apprentice|apprenticeship|student|volunteer|fellowship|scholarship|bourse|youth|jeune|erasmus|werkstudent|praktikum|ausbildung|stage)\b|étudiant|etudiant|alternance|volontariat|apprenti/i
const ZONE = /europe|emea|usa|u\.s\.|united states|north america|anywhere|worldwide/i
const MAX_JOURS = 7

const detecterPays = t => {
  for (const [nom, re] of Object.entries(PAYS)) if (re.test(t || '')) return nom
  return null
}

function lienDe(it) {
  const l = Array.isArray(it.link) ? (it.link.find(x => x && x['@_rel'] === 'alternate') || it.link[0]) : it.link
  return (typeof l === 'object' && l ? (l['@_href'] || texteDe(l)) : texteDe(l)).trim()
}

async function recuperer(source) {
  try {
    // Attention : pas d'accent ni d'apostrophe courbe dans les en-tetes HTTP
    const r = await fetch(source.url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'CercleBot/1.0 (emplois et opportunites)', Accept: 'application/rss+xml, application/xml, text/xml, application/json' } })
    if (!r.ok) return { source, articles: [], erreur: 'HTTP ' + r.status }

    if (source.format === 'arbeitnow') {
      const d = await r.json()
      const articles = (d.data || []).map(j => {
        const lieu = nettoyer(j.location)
        return {
          source: source.nom, type: source.type, jeunes: source.jeunes,
          zone: lieu || source.zone,
          pays: source.pays || detecterPays(lieu),
          titre: nettoyer(j.title) + (j.company_name ? ' - ' + nettoyer(j.company_name) : ''),
          lien: String(j.url || '').trim(),
          region: '',
          tags: (j.tags || []).join(' '),
          resume: nettoyer(j.description).slice(0, 600),
          date: typeof j.created_at === 'number' ? j.created_at * 1000 : (Date.parse(j.created_at) || 0),
        }
      }).filter(a => a.titre && /^https?:\/\//.test(a.lien))
      return { source, articles }
    }

    const doc = parseur.parse(await r.text())
    const brut = doc?.rss?.channel?.item || doc?.feed?.entry || doc?.['rdf:RDF']?.item || []
    const liste2 = Array.isArray(brut) ? brut : [brut]
    const articles = liste2.map(it => {
      const region = nettoyer(it.region)
      return {
        source: source.nom, type: source.type, jeunes: source.jeunes, zone: source.zone,
        pays: source.pays || detecterPays(region),
        titre: nettoyer(un(it.title)),
        lien: decoder(lienDe(it)),
        region,
        tags: nettoyer(it.category),
        resume: nettoyer(it.description || it.summary || it['content:encoded'] || it.content),
        date: Date.parse(texteDe(it.pubDate || it.published || it.updated || it['dc:date'])) || 0,
      }
    }).filter(a => a.titre && /^https?:\/\//.test(a.lien))
    return { source, articles }
  } catch (e) {
    return { source, articles: [], erreur: String(e.message || e) }
  }
}

async function lancer(req) {
  const attendu = process.env.CRON_SECRET
  if (!attendu || req.headers.get('authorization') !== 'Bearer ' + attendu) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: 401 })
  if (String(process.env.EMPLOIS_ACTIFS || 'oui').toLowerCase() === 'non') return NextResponse.json({ publie: false, raison: 'Robot en pause (EMPLOIS_ACTIFS=non).' })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ erreur: 'SUPABASE_SERVICE_ROLE_KEY manquante.' }, { status: 500 })

  const paysVoulus = liste(process.env.EMPLOIS_PAYS).filter(p => PAYS[p])
  const domVoulus = liste(process.env.EMPLOIS_DOMAINES).filter(d => DOMAINES[d])
  const filtres = { pays: paysVoulus, domaines: domVoulus }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: compte } = await sb.from('profiles').select('id, nom').eq('officiel', true).ilike('nom', 'Cercle Officiel').order('created_at').limit(1).maybeSingle()
  if (!compte) return NextResponse.json({ erreur: 'Aucun compte « Cercle Officiel » marqué comme officiel.' }, { status: 409 })

  const resultats = await Promise.all(SOURCES_EMPLOIS.map(recuperer))
  const etat = resultats.map(r => ({ nom: r.source.nom, ok: !r.erreur, articles: r.articles.length, erreur: r.erreur }))

  const limite = Date.now() - MAX_JOURS * 24 * 3600 * 1000
  const retenus = resultats.flatMap(r => r.articles)
    .filter(a => a.date > limite)
    .filter(a => !a.region || ZONE.test(a.region))
    .filter(a => a.jeunes || JEUNE.test(a.titre + ' ' + a.resume))
    .filter(a => !paysVoulus.length || paysVoulus.includes(a.pays))
    .filter(a => !domVoulus.length || domVoulus.some(d => DOMAINES[d].test(a.titre + ' ' + a.resume + ' ' + a.tags)))
    .sort((a, b) => b.date - a.date)
    .slice(0, 60)
  if (!retenus.length) return NextResponse.json({ publie: false, raison: 'Aucune offre correspondante.', filtres, sources: etat })

  const { data: deja } = await sb.from('actualites_publiees').select('lien').in('lien', retenus.map(a => a.lien))
  const vus = new Set((deja || []).map(x => x.lien))
  const neufs = retenus.filter(a => !vus.has(a.lien))
  if (!neufs.length) return NextResponse.json({ publie: false, raison: 'Rien de nouveau.', filtres, sources: etat })

  const noms = SOURCES_EMPLOIS.map(s => s.nom)
  const { data: dernier } = await sb.from('actualites_publiees').select('source').in('source', noms).order('publie_le', { ascending: false }).limit(1).maybeSingle()
  const choix = neufs.find(a => a.source !== dernier?.source) || neufs[0]

  let resume = choix.resume
  if (resume.length > 280) resume = resume.slice(0, 277).trimEnd() + '…'
  const etiquette = choix.type === 'emploi' ? '💼 Offre' : '🎓 Opportunité'
  const texte = etiquette + ' : ' + choix.titre + (resume && resume !== choix.titre ? '\n\n' + resume : '') +
    '\n\n📍 ' + choix.zone + '\nSource : ' + choix.source + '\n' + choix.lien

  const debut = new Date(Date.now() - 5000).toISOString()
  const { data: post, error } = await sb.from('posts').insert({ auteur: compte.id, texte }).select('id').single()
  if (error) return NextResponse.json({ erreur: 'Publication impossible : ' + error.message }, { status: 500 })
  await sb.from('actualites_publiees').insert({ lien: choix.lien, source: choix.source, titre: choix.titre, post_id: post.id })
  await sb.from('notifications').delete().eq('texte', compte.nom + ' a publié une nouvelle publication.').gte('created_at', debut)

  return NextResponse.json({ publie: true, titre: choix.titre, source: choix.source, filtres, sources: etat })
}

export async function GET(req) { return lancer(req) }
export async function POST(req) { return lancer(req) }
