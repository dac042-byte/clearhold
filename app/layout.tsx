import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const montserrat = Montserrat({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clearhold - CBT Thought Interrogation',
  description: 'A tool for examining looping thoughts with CBT techniques',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={montserrat.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
