"use client"

import { createAuthClient } from "better-auth/react"

if (!process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
  throw new Error("NEXT_PUBLIC_BETTER_AUTH_URL environment variable is not set")
}

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
})

export const { signIn, signOut, useSession, deleteUser } = authClient

