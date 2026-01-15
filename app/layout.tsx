import type React from "react"
import type { Metadata } from "next"
import { ABeeZee, Adamina, Chivo_Mono } from "next/font/google"
import { Suspense } from "react"
import { Analytics } from "@vercel/analytics/react"
import { ErrorBoundary } from "@/components/error-boundary"
import "./globals.css"

const abeeZee = ABeeZee({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-sans-serif",
})

const adamina = Adamina({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif",
})

const chivoMono = Chivo_Mono({
  subsets: ["latin"],
  variable: "--font-monospace",
})

export const metadata: Metadata = {
  title: "Persona Studio - AI Avatar Generator",
  description:
    "Transform your photos into stunning professional avatars with AI. Choose from LinkedIn, Corporate, Anime, Cyberpunk styles and more. Powered by Google Gemini.",
  keywords: [
    "AI avatar generator",
    "professional avatar",
    "LinkedIn photo",
    "AI headshot",
    "profile picture generator",
    "anime avatar",
    "cyberpunk avatar",
    "AI portrait",
    "photo transformation",
    "Google Gemini",
  ],
  authors: [{ name: "Persona Studio" }],
  creator: "Persona Studio",
  publisher: "Persona Studio",
  metadataBase: new URL("https://persona-studio.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://persona-studio.vercel.app",
    title: "Persona Studio - AI Avatar Generator",
    description:
      "Transform your photos into stunning professional avatars. LinkedIn, Anime, Cyberpunk styles and more. Powered by AI.",
    siteName: "Persona Studio",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Persona Studio - AI Avatar Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Persona Studio - AI Avatar Generator",
    description:
      "Transform your photos into stunning professional avatars. LinkedIn, Anime, Cyberpunk styles and more. Powered by AI.",
    images: ["/logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
    shortcut: "/logo.jpg",
  },
}

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${abeeZee.variable} ${adamina.variable} ${chivoMono.variable}`}
      suppressHydrationWarning
      style={{ backgroundColor: "#000000" }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased" style={{ backgroundColor: "#000000" }} suppressHydrationWarning>
        <ErrorBoundary>
          <Suspense fallback={null}>{children}</Suspense>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
