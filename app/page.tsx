import { ImageCombiner } from "@/components/image-combiner"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Persona Studio - AI Avatar Generator",
  description:
    "Transform your photos into stunning professional avatars. Choose from LinkedIn, Corporate, Anime, or Cyberpunk styles. Powered by Google Gemini AI.",
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <ImageCombiner />
    </main>
  )
}
