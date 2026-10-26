import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LIGUES, PAR_DEFAUT } from '@/lib/sourcesMatchs'

export const dynamic = 'force-dynamic'
export const maxDuration = 25

const liste = v => String(v || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
const MAX_MATCHS = 25

async function evenements(cle, jour, idLigue) {
  try {
    const r = await fetch('https://www.thesportsdb.com/api/v1/json/' + cle + '/eventsday.php?d=' + jour + '&l=' + idLigue, {
      signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CercleBot/1.0)', Accept: 'application/json' },    })
    if (!r.ok) return { erreur: 'HTTP ' + r.status, events: [] }
    const d = await r.json()
    return { events: d.events || [] }
  } catch (e) {
    return { erreur: String(e.message || e), events: [] }
  }
}

async function lancer(req) {
  const attendu = process.env.CRON_SECRET
  if (!attendu || req.headers.get('authorization') !== 'Bearer ' + attendu) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: 401 })
  if (String(process.env.MATCHS_ACTIFS || 'oui').toLowerCase() === 'non') return NextResponse.json({ publie: false, raison: 'Robot en pause (MATCHS_ACTIFS=non).' })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ erreur: 'SUPABASE_SERVICE_ROLE_KEY manquante.' }, { status: 500 })

  const fuseau = process.env.MATCHS_FUSEAU || 'Africa/Porto-Novo'
  const cle = process.env.SPORTSDB_KEY || '123'
  const choisies = liste(process.env.MATCHS_LIGUES).filter(n => LIGUES[n])
  const noms = choisies.length ? choisies : PAR_DEFAUT

  const jourLocal = ts => new Date(ts).toLocaleDateString('en-CA', { timeZone: fuseau })
  const heureLocale = ts => new Date(ts).toLocaleTimeString('fr-FR', { timeZone: fuseau, hour: '2-digit', minute: '2-digit' })
  const aujourdhui = jourLocal(Date.now())
  const cleJour = 'matchs:' + aujourdhui

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: deja } = await sb.from('actualites_publiees').select('lien').eq('lien', cleJour).maybeSingle()
  if (deja) return NextResponse.json({ publie: false, raison: 'Programme déjà publié aujourd’hui.' })

  const { data: compte } = await sb.from('profiles').select('id, nom').eq('officiel', true).ilike('nom', 'Cercle Officiel').order('created_at').limit(1).maybeSingle()
  if (!compte) return NextResponse.json({ erreur: 'Aucun compte « Cercle Officiel » marqué comme officiel.' }, { status: 409 })

  // L'API classe les matchs par date UTC : on lit aujourd'hui et demain (UTC) puis on garde le jour local
  const d0 = new Date().toISOString().slice(0, 10)
  const d1 = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const demandes = noms.flatMap(n => [d0, d1].map(j => ({ nom: n, jour: j })))
  const reponses = []
  for (const x of demandes) {
    reponses.push(await evenements(cle, x.jour, LIGUES[x.nom]))
    await new Promise(r => setTimeout(r, 300))
  }
  const vus = new Set()
  const matchs = []
  const etat = {}
  reponses.forEach((rep, i) => {
    const nom = demandes[i].nom
    etat[nom] = etat[nom] || { ok: true, matchs: 0 }
    if (rep.erreur) { etat[nom].ok = false; etat[nom].erreur = rep.erreur }
    for (const e of rep.events) {
      if (!e.idEvent || vus.has(e.idEvent)) continue
      const ts = Date.parse(e.strTimestamp ? e.strTimestamp + (/[zZ]|[+-]\d\d:?\d\d$/.test(e.strTimestamp) ? '' : 'Z') : (e.dateEvent + 'T' + (e.strTime || '00:00:00') + 'Z'))
      if (!ts || jourLocal(ts) !== aujourdhui) continue
      vus.add(e.idEvent)
      etat[nom].matchs++
      matchs.push({ ligue: e.strLeague || nom, ordre: noms.indexOf(nom), ts, dom: e.strHomeTeam, ext: e.strAwayTeam })
    }
  })
  if (!matchs.length) return NextResponse.json({ publie: false, raison: 'Aucun match trouvé aujourd’hui.', ligues: etat })

  matchs.sort((a, b) => a.ordre - b.ordre || a.ts - b.ts)
  const gardes = matchs.slice(0, MAX_MATCHS)
  const dateLongue = new Date().toLocaleDateString('fr-FR', { timeZone: fuseau, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  let texte = '⚽ Programme des matchs du ' + dateLongue + ' (heure du Bénin)\n'
  let ligueCourante = ''
  for (const m of gardes) {
    if (m.ligue !== ligueCourante) { texte += '\n🏆 ' + m.ligue + '\n'; ligueCourante = m.ligue }
    texte += heureLocale(m.ts) + ' · ' + (m.dom || '?') + ' - ' + (m.ext || '?') + '\n'
  }
  if (matchs.length > gardes.length) texte += '\n… et ' + (matchs.length - gardes.length) + ' autres matchs.'
  texte += '\n\nSource : TheSportsDB'

  const debut = new Date(Date.now() - 5000).toISOString()
  const { data: post, error } = await sb.from('posts').insert({ auteur: compte.id, texte }).select('id').single()
  if (error) return NextResponse.json({ erreur: 'Publication impossible : ' + error.message }, { status: 500 })
  await sb.from('actualites_publiees').insert({ lien: cleJour, source: 'Programme des matchs', titre: 'Programme du ' + aujourdhui, post_id: post.id })
  await sb.from('notifications').delete().eq('texte', compte.nom + ' a publié une nouvelle publication.').gte('created_at', debut)

  return NextResponse.json({ publie: true, jour: aujourdhui, matchs: gardes.length, ligues: etat })
}

export async function GET(req) { return lancer(req) }
export async function POST(req) { return lancer(req) }
