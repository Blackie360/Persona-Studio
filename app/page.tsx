import { ImageCombiner } from "@/components/image-combiner"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Avatar Studio - Transform Photos into Professional Avatars",
  description:
    "Transform your photos into stunning professional avatars. Choose from Corporate, LinkedIn, Anime, or Cyberpunk styles. Powered by AI.",
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <ImageCombiner />
    </main>
  )
}
