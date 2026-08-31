'use client'
import { useEffect } from 'react'

export default function RemoveDevToolbar() {
  useEffect(() => {
    const remove = () => {
      const portal = document.querySelector('nextjs-portal')
      if (portal) portal.remove()
    }
    remove()
    const observer = new MutationObserver(remove)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return null
}
