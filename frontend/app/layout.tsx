import type { Metadata } from 'next'
import './globals.css'
import Shell from '@/components/Shell'
import RoleBody from '@/components/RoleBody'

export const metadata: Metadata = {
  title: 'RetinaGPT v6 — AI Ophthalmology Platform',
  description: 'AI-powered retinal fundus screening for ophthalmologists, hospitals and health ministries',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <RoleBody>
          <Shell>{children}</Shell>
        </RoleBody>
      </body>
    </html>
  )
}
