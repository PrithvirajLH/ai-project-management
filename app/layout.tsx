import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"

import { Navbar } from "@/components/navbar"
import { SessionProvider } from "@/components/session-provider"
import { authOptions } from "@/lib/auth"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "AI Project Management",
  description: "Manage AI initiatives with Azure Entra ID authentication",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider session={session}>
          <div className="min-h-screen bg-background">
            <Navbar />
            <div className="px-6 pb-12 pt-6">{children}</div>
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
