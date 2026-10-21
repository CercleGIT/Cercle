// Réduit une image et la renvoie sous forme de texte (data URL) stockable en base
export function redimensionner(fichier, max = 800, qualite = 0.7) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader()
    lecteur.onload = () => {
      const img = new Image()
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * k)
        c.height = Math.round(img.height * k)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', qualite))
      }
      img.onerror = reject
      img.src = lecteur.result
    }
    lecteur.onerror = reject
    lecteur.readAsDataURL(fichier)
  })
}
