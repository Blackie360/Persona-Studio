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

// Suppress React warnings for Dithering component's known limitation
// The component internally spreads custom props (noiseScale, noiseOffset) to DOM elements
// This happens at module load time to catch warnings during render
if (typeof window !== "undefined") {
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    // Check if any argument contains the noiseScale/noiseOffset warning
    const errorMessage = args
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
    
    // Suppress warnings about noiseScale and noiseOffset props
    if (
      errorMessage.includes("noiseScale") ||
      errorMessage.includes("noiseOffset") ||
      errorMessage.includes("noisescale") ||
      errorMessage.includes("noiseoffset") ||
      errorMessage.includes("React does not recognize") ||
      errorMessage.includes("lowercase `noisescale`") ||
      errorMessage.includes("lowercase `noiseoffset`")
    ) {
      // Suppress this specific warning from Dithering component
      return
    }
    originalError(...args)
  }
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
    usageLoading,
    refreshCredits,
    updateRemainingFromServer,
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

  const {
    selectedGenerationId,
    setSelectedGenerationId,
    imageLoaded,
    setImageLoaded,
    generateImage: runGeneration,
    cancelGeneration,
    loadGeneratedAsInput,
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
    updateRemainingFromServer,
  })

  const selectedGeneration = persistedGenerations.find((g) => g.id === selectedGenerationId) || persistedGenerations[0]
  const isLoading = persistedGenerations.some((g) => g.status === "loading")
  const generatedImage =
    selectedGeneration?.status === "complete" && selectedGeneration.imageUrl
      ? { url: selectedGeneration.imageUrl, prompt: selectedGeneration.prompt }
      : null

  const hasImages = useUrls ? !!image1Url : !!image1
  const canGenerate = hasImages && canGenerateFromLimit

  // Show auth modal automatically when limit is reached and user tries to generate
  useEffect(() => {
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
    showToast("Downloading image...", "success")
    
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
      showToast("Failed to download image. Opening in new tab...", "error")
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

      setToast({ message: "Copying image...", type: "success" })
      
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
          color1={[0, 0, 0]}
          color2={[0.05, 0.05, 0.1]}
          color3={[0.02, 0.02, 0.05]}
          color4={[0, 0, 0]}
          speed={0.2}
          noiseScale={0.003}
          noiseOffset={0.2}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <div className="min-h-screen text-white">
        <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 max-w-[1920px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 md:mb-6 lg:mb-8">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap w-full sm:w-auto">
              <div
                className={`relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 transition-opacity duration-300 ${logoLoaded ? "opacity-100" : "opacity-0"}`}
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
              <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight">AI Avatar Studio</h1>
            </div>

            <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
              <button
                onClick={() => setShowPricingModal(true)}
                className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
              >
                Pricing 💰
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
                    className="text-xs sm:text-sm bg-white text-black hover:bg-gray-200 px-3 py-1.5 rounded-md font-medium transition-colors flex-shrink-0 cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowHowItWorks(true)}
                    className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                  >
                    How It Works
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Layout */}
          {isMobile ? (
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 border border-gray-700/50 backdrop-blur-sm p-3">
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

              <div className="bg-black/40 border border-gray-700/50 backdrop-blur-sm p-3">
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
                />
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
          ) : (
            /* Desktop Layout */
            <div className="flex flex-col gap-4 lg:gap-6">
              <div ref={containerRef} className="flex gap-4 lg:gap-6 min-h-[60vh] lg:min-h-[70vh]">
                <div
                  className="bg-black/40 border border-gray-700/50 backdrop-blur-sm p-4 lg:p-6 overflow-y-auto"
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
                  className="w-1 flex-shrink-0 cursor-col-resize hover:bg-white/20 active:bg-white/30 transition-colors group relative"
                  onMouseDown={handleMouseDown}
                  onDoubleClick={handleDoubleClick}
                >
                  <div className="absolute inset-y-0 -left-2 -right-2" />
                  <div className="h-full w-full bg-gray-700/50 group-hover:bg-white/20" />
                </div>

                <div
                  className="bg-black/40 border border-gray-700/50 backdrop-blur-sm p-4 lg:p-6 flex flex-col"
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

      <FullscreenViewer
        isOpen={showFullscreen}
        imageUrl={fullscreenImageUrl}
        onClose={closeFullscreen}
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
