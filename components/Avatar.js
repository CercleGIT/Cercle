export default function Avatar({ nom = '?', url, taille = 40 }) {
  const s = { width: taille, height: taille, fontSize: taille * 0.42 }
  return url
    ? <img className="avatar" style={s} src={url} alt="" />
    : <span className="avatar" style={s}>{nom.charAt(0).toUpperCase()}</span>
}
