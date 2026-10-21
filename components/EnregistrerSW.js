'use client'
import { useEffect } from 'react'

// Permet d'installer Cercle comme une application sur le téléphone
export default function EnregistrerSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
