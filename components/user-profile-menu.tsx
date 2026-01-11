"use client"

import { useState, useRef, useEffect } from "react"
import { useSession, signOut, deleteUser } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { User, LogOut, Trash2 } from "lucide-react"

interface UserProfileMenuProps {
  onToast?: (message: string, type: "success" | "error") => void
}

export function UserProfileMenu({ onToast }: UserProfileMenuProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const clearLocalStorage = () => {
    try {
      localStorage.removeItem("generation_count")
      localStorage.removeItem("generation_count_auth")
      localStorage.removeItem("nb2_generations")
    } catch (error) {
      console.error("Error clearing localStorage:", error)
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      clearLocalStorage()
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            setIsOpen(false)
            if (onToast) {
              onToast("Signed out successfully", "success")
            }
            // Reload page to reset state
            window.location.href = "/"
          },
          onError: (error) => {
            console.error("Sign out error:", error)
            if (onToast) {
              onToast("Failed to sign out. Please try again.", "error")
            }
            setIsSigningOut(false)
          },
        },
      })
    } catch (error) {
      console.error("Error signing out:", error)
      if (onToast) {
        onToast("Failed to sign out. Please try again.", "error")
      }
      setIsSigningOut(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      clearLocalStorage()
      await deleteUser({
        callbackURL: "/",
        fetchOptions: {
          onSuccess: () => {
            setShowDeleteConfirm(false)
            setIsOpen(false)
            if (onToast) {
              onToast("Account deleted successfully", "success")
            }
            // Redirect will happen via callbackURL
            window.location.href = "/"
          },
          onError: (error) => {
            console.error("Delete account error:", error)
            if (onToast) {
              onToast(
                error?.message || "Failed to delete account. Please try again.",
                "error"
              )
            }
            setIsDeleting(false)
          },
        },
      })
    } catch (error: any) {
      console.error("Error deleting account:", error)
      if (onToast) {
        onToast(
          error?.message || "Failed to delete account. Please try again.",
          "error"
        )
      }
      setIsDeleting(false)
    }
  }

  if (!session?.user) {
    return null
  }

  const user = session.user
  const userImage = user.image
  const userName = user.name || user.email?.split("@")[0] || "User"

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 transition-all hover:opacity-80"
          aria-label="User menu"
        >
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="w-8 h-8 rounded-full border-2 border-gray-600 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-black/95 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              {user.email && (
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              )}
            </div>
            <div className="py-1">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4" />
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setShowDeleteConfirm(true)
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-black/95 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-400">
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete your account? This action cannot be undone.
              All your data will be permanently removed from our database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="bg-gray-700 text-white hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


