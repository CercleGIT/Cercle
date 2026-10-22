'use client'
import { useEffect } from 'react'
import { appliquerTheme, getTheme } from '@/lib/theme'

// Applique le thème choisi et permet d'installer Cercle comme une application
export default function EnregistrerSW() {
  useEffect(() => {
    appliquerTheme(getTheme())
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
