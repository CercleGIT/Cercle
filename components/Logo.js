// Logo : deux cercles liés (des amis qui se retrouvent)
export default function Logo({ taille = 28, texte = true }) {
  return (
    <span className="logo">
      <svg width={taille * 1.5} height={taille} viewBox="0 0 48 32" aria-hidden="true">
        <circle cx="17" cy="16" r="11" fill="none" stroke="#2455e6" strokeWidth="4.5" />
        <circle cx="31" cy="16" r="11" fill="none" stroke="#f59e0b" strokeWidth="4.5" />
      </svg>
      {texte && <b>Cercle</b>}
    </span>
  )
}
