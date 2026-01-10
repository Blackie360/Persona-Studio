import { cookies } from "next/headers"
import { db } from "./db"
import { adminUser } from "./db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { SignJWT, jwtVerify } from "jose"

const ADMIN_SESSION_COOKIE = "admin_session"
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.BETTER_AUTH_SECRET
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

if (!ADMIN_SESSION_SECRET) {
  throw new Error("ADMIN_SESSION_SECRET or BETTER_AUTH_SECRET environment variable is required")
}

// Simple password hashing using Web Crypto API (since bcrypt requires native bindings)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

export async function verifyAdminCredentials(username: string, password: string): Promise<{ success: boolean; adminId?: string; error?: string }> {
  try {
    const [admin] = await db.select().from(adminUser).where(eq(adminUser.username, username)).limit(1)

    if (!admin) {
      return { success: false, error: "Invalid credentials" }
    }

    const isValid = await verifyPassword(password, admin.passwordHash)
    if (!isValid) {
      return { success: false, error: "Invalid credentials" }
    }

    return { success: true, adminId: admin.id }
  } catch (error) {
    console.error("Error verifying admin credentials:", error)
    return { success: false, error: "Internal server error" }
  }
}

export async function createAdminSession(adminId: string): Promise<string> {
  const sessionToken = nanoid()
  const expiresAt = new Date(Date.now() + SESSION_DURATION)

  const jwt = await new SignJWT({ adminId, sessionToken })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(ADMIN_SESSION_SECRET))

  return jwt
}

export async function getAdminSession(request?: Request): Promise<{ adminId: string } | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)

    if (!sessionCookie?.value) {
      return null
    }

    const { payload } = await jwtVerify(
      sessionCookie.value,
      new TextEncoder().encode(ADMIN_SESSION_SECRET)
    )

    if (!payload.adminId || typeof payload.adminId !== "string") {
      return null
    }

    return { adminId: payload.adminId as string }
  } catch (error) {
    console.error("Error getting admin session:", error)
    return null
  }
}

export async function requireAdmin(request?: Request): Promise<{ adminId: string }> {
  const session = await getAdminSession(request)
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE)
}

