import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  // Fail clearly on Vercel instead of deploying a disconnected preview storefront.
  // Only public Vite variable names are inspected; values never enter build logs.
  if (command === 'build' && process.env.VERCEL === '1') {
    const publicEnv = loadEnv(mode, process.cwd(), 'VITE_')
    const apiUrl = process.env.VITE_API_URL ?? publicEnv.VITE_API_URL
    const clerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? publicEnv.VITE_CLERK_PUBLISHABLE_KEY
    const invalid: string[] = []
    try {
      const url = new URL(apiUrl || '')
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/+$/, '') !== '/api/v1') invalid.push('VITE_API_URL')
    } catch { invalid.push('VITE_API_URL') }
    if (!/^pk_(test|live)_/.test(clerkKey?.trim() || '')) invalid.push('VITE_CLERK_PUBLISHABLE_KEY')
    if (invalid.length) throw new Error(`Missing or invalid Vercel frontend configuration: ${invalid.join(', ')}. Set these in Vercel Environment Variables and redeploy.`)
  }
  return { plugins: [react()] }
})
