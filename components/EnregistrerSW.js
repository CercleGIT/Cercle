'use client'
import { useEffect } from 'react'
import { appliquerTheme, getTheme } from '@/lib/theme'
import { debloquerAudio } from '@/lib/sons'

// Applique le thème choisi et permet d'installer Cercle comme une application
export default function EnregistrerSW() {
  useEffect(() => {
    appliquerTheme(getTheme())
    debloquerAudio()
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
