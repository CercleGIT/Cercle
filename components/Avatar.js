import Link from 'next/link'

// Photo de profil. Si "id" est fourni, un clic ouvre le profil du membre.
export default function Avatar({ nom = '?', url, taille = 40, id }) {
  const s = { width: taille, height: taille, fontSize: taille * 0.42 }
  const contenu = url
    ? <img className="avatar" style={s} src={url} alt="" />
    : <span className="avatar" style={s}>{nom.charAt(0).toUpperCase()}</span>
  return id ? <Link href={'/membre/' + id} className="avatar-lien" aria-label={'Profil de ' + nom}>{contenu}</Link> : contenu
}
