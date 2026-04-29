"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { Dithering } from "@paper-design/shaders-react"
import { useMobile } from "@/hooks/use-mobile"
import { useImageUpload } from "./hooks/use-image-upload"
import { useImageGeneration } from "./hooks/use-image-generation"
import { useAspectRatio } from "./hooks/use-aspect-ratio"
import { useGenerationLimit } from "./hooks/use-generation-limit"
import { HowItWorksModal } from "./how-it-works-modal"
import { PartialRegenerationModal } from "./partial-regeneration-modal"
import { AuthModal } from "@/components/auth-modal"
import { PaymentModal } from "@/components/payment-modal"
import { PricingModal } from "@/components/pricing-modal"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { useSession } from "@/lib/auth-client"
import { usePersistentHistory } from "./hooks/use-persistent-history"
import { InputSection } from "./input-section"
import { OutputSection } from "./output-section"
import { GenerationHistory } from "./generation-history"
import { GlobalDropZone } from "./global-drop-zone"
import { FullscreenViewer } from "./fullscreen-viewer"
import { Skeleton } from "@/components/ui/skeleton"
import { isPaymentGatewayDisabled } from "@/lib/payment-gateway-flag"
import { cn } from "@/lib/utils"

// Suppress React dev noise for @paper-design/shaders-react Dithering: it forwards
// shader props (noiseScale, noiseOffset) onto a DOM node. React may log via warn or error.
if (typeof window !== "undefined") {
  const messageFromArgs = (args: unknown[]) =>
    args
      .map((arg) => {
        if (typeof arg === "string") return arg
        if (arg instanceof Error) return arg.message
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      })
      .join(" ")

  const isDitheringDomPropNoise = (msg: string) =>
    (msg.includes("noiseScale") ||
      msg.includes("noiseOffset") ||
      msg.includes("noisescale") ||
      msg.includes("noiseoffset") ||
      msg.includes("lowercase `noisescale`") ||
      msg.includes("lowercase `noiseoffset`")) &&
    msg.includes("React does not recognize")

  const patchConsole = (original: (...args: unknown[]) => void) => (...args: unknown[]) => {
    if (isDitheringDomPropNoise(messageFromArgs(args))) return
    original(...args)
  }

  console.error = patchConsole(console.error.bind(console))
  console.warn = patchConsole(console.warn.bind(console))
}

// Wrapper component to properly handle props and prevent DOM prop warnings
// The Dithering component from @paper-design/shaders-react internally spreads props to DOM elements
// This is a known limitation of the third-party library
const DitheringWrapper = memo((props: {
  style?: React.CSSProperties
  color1?: number[]
  color2?: number[]
  color3?: number[]
  color4?: number[]
  speed?: number
  noiseScale?: number
  noiseOffset?: number
}) => {
  const {
    style,
    color1,
    color2,
    color3,
    color4,
    speed,
    noiseScale,
    noiseOffset,
  } = props

  // Build props object with only valid props for the Dithering component
  // Use a ref to prevent React from seeing these props in the DOM
  const ditheringProps: {
    color1?: number[]
    color2?: number[]
    color3?: number[]
    color4?: number[]
    speed?: number
    noiseScale?: number
    noiseOffset?: number
    style?: React.CSSProperties
  } = {}

  if (color1) ditheringProps.color1 = color1
  if (color2) ditheringProps.color2 = color2
  if (color3) ditheringProps.color3 = color3
  if (color4) ditheringProps.color4 = color4
  if (speed !== undefined) ditheringProps.speed = speed
  if (noiseScale !== undefined) ditheringProps.noiseScale = noiseScale
  if (noiseOffset !== undefined) ditheringProps.noiseOffset = noiseOffset
  if (style) ditheringProps.style = style

  return (
    <div className="w-full h-full" suppressHydrationWarning>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <Dithering {...ditheringProps} />
    </div>
  )
})
DitheringWrapper.displayName = "DitheringWrapper"

export function ImageCombiner() {
  const isMobile = useMobile()
  const [prompt, setPrompt] = useState("")
  const [avatarStyle, setAvatarStyle] = useState("linkedin")
  const [background, setBackground] = useState("studio-neutral")
  const [colorMood, setColorMood] = useState("natural")
  const [useUrls, setUseUrls] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState("")
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [dropZoneHover, setDropZoneHover] = useState<1 | 2 | null>(null)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [isGeneralLogin, setIsGeneralLogin] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [showPartialRegenerationModal, setShowPartialRegenerationModal] = useState(false)
  const [isPartialRegenerationLoading, setIsPartialRegenerationLoading] = useState(false)

  const [leftWidth, setLeftWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const promptTextareaRef = useRef<HTMLTextAreaElement>(null)

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const {
    image1,
    image1Preview,
    image1Url,
    image2,
    image2Preview,
    image2Url,
    isConvertingHeic,
    heicProgress,
    handleImageUpload,
    handleUrlChange,
    clearImage,
    showToast: uploadShowToast,
  } = useImageUpload()

  const { aspectRatio, setAspectRatio, availableAspectRatios, detectAspectRatio } = useAspectRatio()

  const {
    isAuthenticated,
    remaining,
    canGenerate: canGenerateFromLimit,
    decrementOptimistic,
    decrementOptimisticPartial,
    usageLoading,
    refreshCredits,
    fetchServerRemaining,
  } = useGenerationLimit()

  const { data: session } = useSession()
  const userId = session?.user?.id

  const {
    generations: persistedGenerations,
    setGenerations: setPersistedGenerations,
    addGeneration,
    clearHistory,
    deleteGeneration,
    isLoading: historyLoading,
    hasMore,
    loadMore,
    isLoadingMore,
  } = usePersistentHistory(showToast)

  const hasImages = useUrls ? !!image1Url : !!image1
  const canGenerate = hasImages && canGenerateFromLimit
  const canUsePartialRegeneration =
    isAuthenticated && (isPaymentGatewayDisabled() || remaining >= 0.5)

  const {
    selectedGenerationId,
    setSelectedGenerationId,
    imageLoaded,
    setImageLoaded,
    generateImage: runGeneration,
    cancelGeneration,
    loadGeneratedAsInput,
    partialRegeneration,
  } = useImageGeneration({
    prompt,
    aspectRatio,
    image1,
    image2,
    image1Url,
    image2Url,
    useUrls,
    generations: persistedGenerations,
    setGenerations: setPersistedGenerations,
    addGeneration,
    onToast: showToast,
    onImageUpload: handleImageUpload,
    avatarStyle,
    background,
    colorMood,
    canGenerate: canGenerateFromLimit,
    onShowAuthModal: () => setShowAuthModal(true),
    decrementOptimistic,
    decrementOptimisticPartial,
    fetchServerRemaining,
    isAuthenticated,
    canUsePartialRegeneration,
  })

  const selectedGeneration = persistedGenerations.find((g) => g.id === selectedGenerationId) || persistedGenerations[0]
  const isLoading = persistedGenerations.some((g) => g.status === "loading")
  const generatedImage =
    selectedGeneration?.status === "complete" && selectedGeneration.imageUrl
      ? { url: selectedGeneration.imageUrl, prompt: selectedGeneration.prompt }
      : null

  const openPartialRegenerationModal = useCallback(() => {
    setShowPartialRegenerationModal(true)
  }, [])

  const handlePartialRegenerationSubmit = useCallback(
    async (instructions?: string) => {
      setIsPartialRegenerationLoading(true)
      try {
        await partialRegeneration(instructions)
      } finally {
        setIsPartialRegenerationLoading(false)
        setShowPartialRegenerationModal(false)
      }
    },
    [partialRegeneration],
  )

  // Show auth modal automatically when limit is reached and user tries to generate
  useEffect(() => {
    if (isPaymentGatewayDisabled()) return

    if (hasImages && !canGenerateFromLimit && !isAuthenticated && !showAuthModal) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setIsGeneralLogin(false) // Reset to show limit reached message
        setShowAuthModal(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [hasImages, canGenerateFromLimit, isAuthenticated, showAuthModal])

  // Show payment modal when authenticated user exhausts free generations
  useEffect(() => {
    if (isPaymentGatewayDisabled()) return

    if (
      hasImages &&
      !canGenerateFromLimit &&
      isAuthenticated &&
      !showPaymentModal &&
      !showAuthModal
    ) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setShowPaymentModal(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [hasImages, canGenerateFromLimit, isAuthenticated, showPaymentModal, showAuthModal])

  const handlePaymentSuccess = async () => {
    await refreshCredits()
    setShowPaymentModal(false)
  }

  const [showAuthAfterPayment, setShowAuthAfterPayment] = useState(false)

  // Check for payment success callback and prompt signup if unauthenticated
  useEffect(() => {
    if (typeof window === "undefined") return

    const searchParams = new URLSearchParams(window.location.search)
    const paymentStatus = searchParams.get("payment")
    const needsSignup = searchParams.get("signup") === "true"
    const reference = searchParams.get("reference")

    if (paymentStatus === "success" && needsSignup && !isAuthenticated) {
      // Show success toast
      showToast("Payment successful! Sign up to link your credits to your account.", "success")
      
      // Set flag to show auth modal with payment message
      setShowAuthAfterPayment(true)
      
      // Show auth modal after a short delay
      const timer = setTimeout(() => {
        setShowAuthModal(true)
      }, 500)

      // Clean up URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("payment")
      newUrl.searchParams.delete("signup")
      newUrl.searchParams.delete("reference")
      window.history.replaceState({}, "", newUrl.toString())

      return () => clearTimeout(timer)
    } else if (paymentStatus === "success" && isAuthenticated) {
      // Authenticated user - refresh credits
      refreshCredits()
      showToast("Payment successful! Your credits have been added.", "success")

      // Clean up URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("payment")
      newUrl.searchParams.delete("reference")
      window.history.replaceState({}, "", newUrl.toString())
    } else if (paymentStatus === "failed") {
      showToast("Payment failed. Please try again.", "error")

      // Clean up URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("payment")
      newUrl.searchParams.delete("reference")
      window.history.replaceState({}, "", newUrl.toString())
    }
  }, [isAuthenticated, showToast, refreshCredits])

  // Reset auth after payment flag when modal closes
  useEffect(() => {
    if (!showAuthModal) {
      setShowAuthAfterPayment(false)
    }
  }, [showAuthModal])

  // Link unlinked payments when user authenticates
  useEffect(() => {
    if (isAuthenticated && userId) {
      const linkUnlinkedPayments = async () => {
        try {
          const response = await fetch("/api/payments/link-credits", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.creditsLinked > 0) {
              // Refresh credits to show newly linked credits
              await refreshCredits()
              showToast(
                `Successfully linked ${data.creditsLinked} generation${data.creditsLinked > 1 ? "s" : ""} from your previous purchase${data.paymentsLinked > 1 ? "s" : ""}!`,
                "success"
              )
            }
          }
        } catch (error) {
          console.error("Error linking credits:", error)
          // Don't show error to user - this is a background operation
        }
      }

      // Small delay to ensure session is fully established
      const timer = setTimeout(() => {
        linkUnlinkedPayments()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, userId, refreshCredits, showToast])

  useEffect(() => {
    if (selectedGeneration?.status === "complete" && selectedGeneration?.imageUrl) {
      setImageLoaded(false)
    }
  }, [selectedGenerationId, selectedGeneration?.imageUrl, setImageLoaded])

  useEffect(() => {
    uploadShowToast.current = showToast
  }, [uploadShowToast])

  const openFullscreen = useCallback(() => {
    if (generatedImage?.url) {
      setFullscreenImageUrl(generatedImage.url)
      setShowFullscreen(true)
      document.body.style.overflow = "hidden"
    }
  }, [generatedImage?.url])

  const openImageFullscreen = useCallback((imageUrl: string) => {
    setFullscreenImageUrl(imageUrl)
    setShowFullscreen(true)
    document.body.style.overflow = "hidden"
  }, [])

  const closeFullscreen = useCallback(() => {
    setShowFullscreen(false)
    setFullscreenImageUrl("")
    document.body.style.overflow = "unset"
  }, [])

  const downloadImage = useCallback(async () => {
    if (!generatedImage) return
    
    // Show loading feedback
    showToast("Downloading image…", "success")
    
    try {
      const response = await fetch(generatedImage.url)
      if (!response.ok) {
        throw new Error("Failed to fetch image")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `avatar-${avatarStyle}-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      // Show success feedback
      showToast("Image downloaded successfully!", "success")
    } catch (error) {
      console.error("Error downloading image:", error)
      showToast("Failed to download image. Opening in new tab…", "error")
      // Fallback: open in new tab
      setTimeout(() => {
        window.open(generatedImage.url, "_blank")
      }, 500)
    }
  }, [generatedImage, avatarStyle, showToast])

  const openImageInNewTab = useCallback(() => {
    if (!generatedImage?.url) {
      console.error("No image URL available")
      return
    }

    try {
      if (generatedImage.url.startsWith("data:")) {
        const parts = generatedImage.url.split(",")
        const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png"
        const bstr = atob(parts[1])
        const n = bstr.length
        const u8arr = new Uint8Array(n)
        for (let i = 0; i < n; i++) {
          u8arr[i] = bstr.charCodeAt(i)
        }
        const blob = new Blob([u8arr], { type: mime })
        const blobUrl = URL.createObjectURL(blob)
        const newWindow = window.open(blobUrl, "_blank", "noopener,noreferrer")
        if (newWindow) {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
        }
      } else {
        window.open(generatedImage.url, "_blank", "noopener,noreferrer")
      }
    } catch (error) {
      console.error("Error opening image:", error)
      window.open(generatedImage.url, "_blank")
    }
  }, [generatedImage])

  const copyImageToClipboard = useCallback(async () => {
    if (!generatedImage) return
    try {
      const convertToPngBlob = async (imageUrl: string): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = "anonymous"

          img.onload = () => {
            const canvas = document.createElement("canvas")
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext("2d")

            if (!ctx) {
              reject(new Error("Failed to get canvas context"))
              return
            }

            ctx.drawImage(img, 0, 0)
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob)
                } else {
                  reject(new Error("Failed to convert to blob"))
                }
              },
              "image/png",
              1.0,
            )
          }

          img.onerror = () => reject(new Error("Failed to load image"))
          img.src = imageUrl
        })
      }

      if (isMobile) {
        try {
          // Ensure document is focused before clipboard access
          if (document.body) {
            document.body.focus()
          }
          window.focus()
          await new Promise((resolve) => setTimeout(resolve, 50))
          const pngBlob = await convertToPngBlob(generatedImage.url)
          const clipboardItem = new ClipboardItem({ "image/png": pngBlob })
          await navigator.clipboard.write([clipboardItem])
          setToast({ message: "Image copied to clipboard!", type: "success" })
          setTimeout(() => setToast(null), 2000)
          return
        } catch (clipboardError) {
          try {
            const response = await fetch(generatedImage.url)
            const blob = await response.blob()
            const reader = new FileReader()
            reader.onloadend = async () => {
              try {
                await navigator.clipboard.writeText(reader.result as string)
                setToast({ message: "Image data copied! Paste in compatible apps.", type: "success" })
                setTimeout(() => setToast(null), 3000)
              } catch (err) {
                throw new Error("Clipboard not supported")
              }
            }
            reader.readAsDataURL(blob)
            return
          } catch (fallbackError) {
            setToast({
              message: "Copy not supported. Use download button instead.",
              type: "error",
            })
            setTimeout(() => setToast(null), 3000)
            return
          }
        }
      }

      setToast({ message: "Copying image…", type: "success" })
      
      // Ensure document is focused before clipboard access
      // Focus the document body to ensure clipboard API has permission
      if (document.body) {
        document.body.focus()
      }
      window.focus()
      // Small delay to ensure focus takes effect
      await new Promise((resolve) => setTimeout(resolve, 50))

      const pngBlob = await convertToPngBlob(generatedImage.url)
      const clipboardItem = new ClipboardItem({ "image/png": pngBlob })
      await navigator.clipboard.write([clipboardItem])

      setToast({ message: "Image copied to clipboard!", type: "success" })
      setTimeout(() => setToast(null), 2000)
    } catch (error) {
      console.error("Error copying image:", error)
      if (
        error instanceof Error &&
        (error.message.includes("not focused") ||
          error.message.includes("Document is not focused") ||
          error.name === "NotAllowedError")
      ) {
        setToast({
          message: "Please click on the page first, then try copying again",
          type: "error",
        })
      } else {
        setToast({ message: "Failed to copy image", type: "error" })
      }
      setTimeout(() => setToast(null), 2000)
    }
  }, [generatedImage, isMobile])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (canGenerate) {
          runGeneration()
        }
      }
    },
    [canGenerate, runGeneration],
  )

  const handleGlobalKeyboard = useCallback(
    (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isTyping = activeElement?.tagName === "TEXTAREA" || activeElement?.tagName === "INPUT"

      if ((e.metaKey || e.ctrlKey) && e.key === "c" && generatedImage && !e.shiftKey) {
        if (!isTyping) {
          e.preventDefault()
          copyImageToClipboard()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && generatedImage) {
        if (!isTyping) {
          e.preventDefault()
          downloadImage()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "u" && generatedImage) {
        if (!isTyping) {
          e.preventDefault()
          loadGeneratedAsInput()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "p" && generatedImage && canUsePartialRegeneration) {
        if (!isTyping) {
          e.preventDefault()
          openPartialRegenerationModal()
        }
      }
      if (e.key === "Escape" && showFullscreen) {
        closeFullscreen()
      }
      if (showFullscreen && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !isTyping) {
        e.preventDefault()
        const completedGenerations = persistedGenerations.filter((g) => g.status === "complete" && g.imageUrl)
        if (completedGenerations.length <= 1) return

        const currentIndex = completedGenerations.findIndex((g) => g.imageUrl === fullscreenImageUrl)
        if (currentIndex === -1) return

        if (e.key === "ArrowLeft") {
          const prevIndex = currentIndex === 0 ? completedGenerations.length - 1 : currentIndex - 1
          setFullscreenImageUrl(completedGenerations[prevIndex].imageUrl!)
          setSelectedGenerationId(completedGenerations[prevIndex].id)
        } else if (e.key === "ArrowRight") {
          const nextIndex = currentIndex === completedGenerations.length - 1 ? 0 : currentIndex + 1
          setFullscreenImageUrl(completedGenerations[nextIndex].imageUrl!)
          setSelectedGenerationId(completedGenerations[nextIndex].id)
        }
      }
    },
    [
      generatedImage,
      showFullscreen,
      copyImageToClipboard,
      downloadImage,
      loadGeneratedAsInput,
      openPartialRegenerationModal,
      canUsePartialRegeneration,
      closeFullscreen,
      persistedGenerations,
      fullscreenImageUrl,
      setSelectedGenerationId,
    ],
  )

  const handleGlobalPaste = useCallback(
    async (e: ClipboardEvent) => {
      const activeElement = document.activeElement
      if (activeElement?.tagName !== "TEXTAREA" && activeElement?.tagName !== "INPUT") {
        const items = e.clipboardData?.items
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.type.startsWith("image/")) {
              e.preventDefault()
              const file = item.getAsFile()
              if (file) {
                setUseUrls(false)
                await handleImageUpload(file, 1)
                showToast("Photo pasted successfully", "success")
              }
              return
            }
          }
        }

        const pastedText = e.clipboardData?.getData("text")

        if (!pastedText) return

        const urlPattern = /https?:\/\/[^\s]+/i
        const imagePattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)|format=(jpg|jpeg|png|gif|webp)/i

        const match = pastedText.match(urlPattern)

        if (match) {
          const url = match[0]
          if (imagePattern.test(url) || url.includes("/media/") || url.includes("/images/")) {
            e.preventDefault()

            setUseUrls(true)

            setTimeout(() => {
              handleUrlChange(url, 1)
              showToast("Image URL pasted", "success")
            }, 150)
          }
        }
      }
    },
    [handleImageUpload, handleUrlChange],
  )

  const handlePromptPaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = e.clipboardData.getData("text")

      const urlPattern = /https?:\/\/[^\s]+/i
      const imagePattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)|format=(jpg|jpeg|png|gif|webp)/i

      const match = pastedText.match(urlPattern)

      if (match) {
        const url = match[0]
        if (imagePattern.test(url) || url.includes("/media/") || url.includes("/images/")) {
          e.preventDefault()

          if (!useUrls) {
            setUseUrls(true)
          }

          handleUrlChange(url, 1)
          showToast("Image URL loaded", "success")
        }
      }
    },
    [useUrls, handleUrlChange],
  )

  const handleGlobalDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragCounter((prev) => prev + 1)
    const items = e.dataTransfer?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && items[i].type.startsWith("image/")) {
          setIsDraggingOver(true)
          break
        }
      }
    }
  }, [])

  const handleGlobalDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy"
    }
  }, [])

  const handleGlobalDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragCounter((prev) => {
      const newCount = prev - 1
      if (newCount <= 0) {
        setIsDraggingOver(false)
        return 0
      }
      return newCount
    })
  }, [])

  const handleGlobalDrop = useCallback(
    async (e: DragEvent | React.DragEvent, slot?: 1 | 2) => {
      e.preventDefault()
      setIsDraggingOver(false)
      setDragCounter(0)
      setDropZoneHover(null)

      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file.type.startsWith("image/")) {
          setUseUrls(false)
          await handleImageUpload(file, 1)
          showToast("Photo uploaded successfully", "success")
        }
      }
    },
    [handleImageUpload],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyboard)
    document.addEventListener("paste", handleGlobalPaste)
    document.addEventListener("dragover", handleGlobalDragOver)
    document.addEventListener("dragleave", handleGlobalDragLeave)
    document.addEventListener("dragenter", handleGlobalDragEnter)
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyboard)
      document.removeEventListener("paste", handleGlobalPaste)
      document.removeEventListener("dragover", handleGlobalDragOver)
      document.removeEventListener("dragleave", handleGlobalDragLeave)
      document.removeEventListener("dragenter", handleGlobalDragEnter)
    }
  }, [handleGlobalKeyboard, handleGlobalPaste, handleGlobalDragOver, handleGlobalDragLeave, handleGlobalDragEnter])

  const clearAll = useCallback(() => {
    setPrompt("")
    clearImage(1)
    clearImage(2)
    setTimeout(() => {
      promptTextareaRef.current?.focus()
    }, 0)
  }, [clearImage])

  const handleFullscreenNavigate = useCallback(
    (direction: "prev" | "next") => {
      const completedGenerations = persistedGenerations.filter((g) => g.status === "complete" && g.imageUrl)
      const currentIndex = completedGenerations.findIndex((g) => g.imageUrl === fullscreenImageUrl)
      if (currentIndex === -1) return

      let newIndex: number
      if (direction === "prev") {
        newIndex = currentIndex === 0 ? completedGenerations.length - 1 : currentIndex - 1
      } else {
        newIndex = currentIndex === completedGenerations.length - 1 ? 0 : currentIndex + 1
      }

      setFullscreenImageUrl(completedGenerations[newIndex].imageUrl!)
      setSelectedGenerationId(completedGenerations[newIndex].id)
    },
    [persistedGenerations, fullscreenImageUrl, setSelectedGenerationId],
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return

      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const offsetX = e.clientX - containerRect.left
      const percentage = (offsetX / containerRect.width) * 100

      const clampedPercentage = Math.max(30, Math.min(70, percentage))
      setLeftWidth(clampedPercentage)
    },
    [isResizing],
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  const handleDoubleClick = useCallback(() => {
    setLeftWidth(50)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    } else {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <>
      <div className="fixed inset-0 -z-10">
        <DitheringWrapper
          color1={[0.03, 0.035, 0.028]}
          color2={[0.08, 0.09, 0.065]}
          color3={[0.04, 0.09, 0.08]}
          color4={[0.01, 0.012, 0.01]}
          speed={0.12}
          noiseScale={0.0024}
          noiseOffset={0.14}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus-ring fixed left-4 top-4 z-[100] rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Skip to Main Content
      </a>

      <div className="min-h-screen text-foreground">
        <div className="safe-page mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 md:gap-5 lg:gap-6">
          {/* Header */}
          <header className="studio-panel sticky top-3 z-40 flex flex-col gap-3 rounded-lg px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`relative flex size-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/5 transition-opacity duration-300 ${logoLoaded ? "opacity-100" : "opacity-0"}`}
              >
                <img
                  src="/logo.jpg"
                  alt="AI Avatar Studio Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                  onLoad={() => setLogoLoaded(true)}
                  style={{ opacity: logoLoaded ? 1 : 0 }}
                />
                {!logoLoaded && <Skeleton className="absolute inset-0 w-full h-full bg-gray-700" />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--studio-cyan)]">
                  Persona Studio
                </p>
                <h1 className="truncate text-xl font-bold leading-tight sm:text-2xl">AI Avatar Studio</h1>
                <p className="hidden text-xs text-muted-foreground md:block">
                  Turn one photo into a profile reveal people want to share.
                </p>
              </div>
            </div>

            <nav className="flex w-full items-center justify-end gap-2 sm:w-auto" aria-label="Account and Help">
              <div className="hidden rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-xs font-semibold text-[var(--accent)] lg:block">
                Viral Mode Live
              </div>
              <button
                onClick={() => setShowPricingModal(true)}
                className="focus-ring min-h-10 rounded-md border border-white/10 px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-[var(--studio-warm)]/60 hover:text-foreground"
              >
                Pricing
              </button>
              {session?.user ? (
                <UserProfileMenu onToast={showToast} />
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsGeneralLogin(true)
                      setShowAuthModal(true)
                    }}
                    className="focus-ring min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-[var(--accent)]"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowHowItWorks(true)}
                    className="focus-ring min-h-10 rounded-md border border-white/10 px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-white/25 hover:text-foreground"
                  >
                    How It Works
                  </button>
                </>
              )}
            </nav>
          </header>

          {/* Mobile Layout */}
          {isMobile ? (
            <div className="flex flex-col gap-4 pb-4">
              <section className="studio-panel rounded-lg p-3" aria-label="Avatar controls">
                <InputSection
                  prompt={prompt}
                  setPrompt={setPrompt}
                  aspectRatio={aspectRatio}
                  setAspectRatio={setAspectRatio}
                  availableAspectRatios={availableAspectRatios}
                  useUrls={useUrls}
                  setUseUrls={setUseUrls}
                  image1Preview={image1Preview}
                  image2Preview={image2Preview}
                  image1Url={image1Url}
                  image2Url={image2Url}
                  isConvertingHeic={isConvertingHeic}
                  canGenerate={canGenerate}
                  hasImages={!!hasImages}
                  onGenerate={runGeneration}
                  onClearAll={clearAll}
                  onImageUpload={handleImageUpload}
                  onUrlChange={handleUrlChange}
                  onClearImage={clearImage}
                  onKeyDown={handleKeyDown}
                  onPromptPaste={handlePromptPaste}
                  onImageFullscreen={openImageFullscreen}
                  promptTextareaRef={promptTextareaRef}
                  isAuthenticated={isAuthenticated}
                  remaining={remaining}
                  decrementOptimistic={decrementOptimistic}
                  usageLoading={usageLoading}
                  onShowAuthModal={() => setShowAuthModal(true)}
                  generations={persistedGenerations}
                  selectedGenerationId={selectedGenerationId}
                  onSelectGeneration={setSelectedGenerationId}
                  onCancelGeneration={cancelGeneration}
                  onDeleteGeneration={deleteGeneration}
                  historyLoading={historyLoading}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  isLoadingMore={isLoadingMore}
                  avatarStyle={avatarStyle}
                  setAvatarStyle={setAvatarStyle}
                  background={background}
                  setBackground={setBackground}
                  colorMood={colorMood}
                  setColorMood={setColorMood}
                  isLoading={isLoading}
                />
              </section>

              <section className="studio-panel min-h-[360px] rounded-lg p-3" aria-label="Generated avatar preview">
                <OutputSection
                  generatedImage={generatedImage}
                  isLoading={isLoading}
                  loadingGeneration={persistedGenerations.find((g) => g.status === "loading")}
                  selectedGeneration={selectedGeneration}
                  imageLoaded={imageLoaded}
                  setImageLoaded={setImageLoaded}
                  onFullscreen={openFullscreen}
                  onDownload={downloadImage}
                  onCopy={copyImageToClipboard}
                  onOpenInNewTab={openImageInNewTab}
                  onLoadAsInput={loadGeneratedAsInput}
                  onPartialRegeneration={openPartialRegenerationModal}
                  isPartialRegenerationLoading={isPartialRegenerationLoading}
                  isAuthenticated={isAuthenticated}
                  canUsePartialRegeneration={canUsePartialRegeneration}
                />
              </section>

              <GenerationHistory
                generations={persistedGenerations}
                selectedId={selectedGenerationId ?? undefined}
                onSelect={setSelectedGenerationId}
                onCancel={cancelGeneration}
                onDelete={deleteGeneration}
                onImageClick={openImageFullscreen}
                isLoading={historyLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                isLoadingMore={isLoadingMore}
              />
            </div>
          ) : (
            /* Desktop Layout */
            <div className="flex min-h-0 flex-1 flex-col gap-4 lg:gap-5">
              <div ref={containerRef} className="flex min-h-[64vh] gap-4 lg:min-h-[72vh] lg:gap-5">
                <div
                  className="studio-panel min-w-[360px] overflow-y-auto rounded-lg p-4 lg:p-5"
                  style={{ width: `${leftWidth}%` }}
                >
                  <InputSection
                    prompt={prompt}
                    setPrompt={setPrompt}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                    availableAspectRatios={availableAspectRatios}
                    useUrls={useUrls}
                    setUseUrls={setUseUrls}
                    image1Preview={image1Preview}
                    image2Preview={image2Preview}
                    image1Url={image1Url}
                    image2Url={image2Url}
                    isConvertingHeic={isConvertingHeic}
                    canGenerate={canGenerate}
                    hasImages={!!hasImages}
                    onGenerate={runGeneration}
                    onClearAll={clearAll}
                    onImageUpload={handleImageUpload}
                    onUrlChange={handleUrlChange}
                    onClearImage={clearImage}
                    onKeyDown={handleKeyDown}
                    onPromptPaste={handlePromptPaste}
                    onImageFullscreen={openImageFullscreen}
                    promptTextareaRef={promptTextareaRef}
                    isAuthenticated={isAuthenticated}
                    remaining={remaining}
                    decrementOptimistic={decrementOptimistic}
                    usageLoading={usageLoading}
                    onShowAuthModal={() => setShowAuthModal(true)}
                    generations={persistedGenerations}
                    selectedGenerationId={selectedGenerationId}
                    onSelectGeneration={setSelectedGenerationId}
                    onCancelGeneration={cancelGeneration}
                    onDeleteGeneration={deleteGeneration}
                    historyLoading={historyLoading}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                    isLoadingMore={isLoadingMore}
                    avatarStyle={avatarStyle}
                    setAvatarStyle={setAvatarStyle}
                    background={background}
                    setBackground={setBackground}
                    colorMood={colorMood}
                    setColorMood={setColorMood}
                    isLoading={isLoading}
                  />
                </div>

                {/* Resizable Divider */}
                <div
                  className="group relative w-2 flex-shrink-0 cursor-col-resize rounded-full transition-colors duration-200 hover:bg-white/10 active:bg-white/15"
                  onMouseDown={handleMouseDown}
                  onDoubleClick={handleDoubleClick}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize editor and preview panels"
                >
                  <div className="absolute inset-y-0 -left-2 -right-2" />
                  <div className="mx-auto h-full w-px bg-white/15 group-hover:bg-[var(--accent)]/70" />
                </div>

                <div
                  className="studio-panel flex min-w-[420px] flex-col rounded-lg p-4 lg:p-5"
                  style={{ width: `${100 - leftWidth}%` }}
                >
                  <OutputSection
                    generatedImage={generatedImage}
                    isLoading={isLoading}
                    loadingGeneration={persistedGenerations.find((g) => g.status === "loading")}
                    selectedGeneration={selectedGeneration}
                    imageLoaded={imageLoaded}
                    setImageLoaded={setImageLoaded}
                    onFullscreen={openFullscreen}
                    onDownload={downloadImage}
                    onCopy={copyImageToClipboard}
                    onOpenInNewTab={openImageInNewTab}
                    onLoadAsInput={loadGeneratedAsInput}
                    onPartialRegeneration={openPartialRegenerationModal}
                    isPartialRegenerationLoading={isPartialRegenerationLoading}
                    isAuthenticated={isAuthenticated}
                    canUsePartialRegeneration={canUsePartialRegeneration}
                  />
                </div>
              </div>

              <GenerationHistory
                generations={persistedGenerations}
                selectedId={selectedGenerationId ?? undefined}
                onSelect={setSelectedGenerationId}
                onCancel={cancelGeneration}
                onDelete={deleteGeneration}
                onImageClick={openImageFullscreen}
                isLoading={historyLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                isLoadingMore={isLoadingMore}
              />
            </div>
          )}
        </div>
      </div>

      <GlobalDropZone
        isDraggingOver={isDraggingOver}
        dropZoneHover={dropZoneHover}
        setDropZoneHover={setDropZoneHover}
        onDrop={handleGlobalDrop}
        singleSlot={true}
      />

      <div className="sr-only" role={toast?.type === "error" ? "alert" : "status"} aria-live="polite" aria-atomic="true">
        {toast?.message ?? ""}
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-4 left-1/2 z-[70] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border px-4 py-3 text-sm shadow-lg backdrop-blur-md",
            toast.type === "error"
              ? "border-red-500/40 bg-red-950/90 text-red-100"
              : "border-white/15 bg-card/95 text-card-foreground",
          )}
        >
          {toast.message}
        </div>
      )}

      <FullscreenViewer
        isOpen={showFullscreen}
        imageUrl={fullscreenImageUrl}
        onClose={closeFullscreen}
      />

      <PartialRegenerationModal
        isOpen={showPartialRegenerationModal}
        isSubmitting={isPartialRegenerationLoading}
        onClose={() => setShowPartialRegenerationModal(false)}
        onConfirm={handlePartialRegenerationSubmit}
      />

      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => {
          setShowAuthModal(false)
          setIsGeneralLogin(false)
        }}
        afterPayment={showAuthAfterPayment}
        isGeneralLogin={isGeneralLogin && !showAuthAfterPayment}
      />
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onSuccess={() => {
          setShowPricingModal(false)
          refreshCredits()
        }}
      />
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </>
  )
}
