import { db } from "../lib/db"
import { adminUser } from "../lib/db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

async function initAdmin() {
  try {
    const username = "blackie"
    const password = "@Gamer360"

    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(adminUser)
      .where(eq(adminUser.username, username))
      .limit(1)

    if (existingAdmin.length > 0) {
      console.log("Admin user already exists. Skipping initialization.")
      return
    }

    // Create admin user
    const passwordHash = await hashPassword(password)
    const adminId = nanoid()

    await db.insert(adminUser).values({
      id: adminId,
      username,
      passwordHash,
    })

    console.log("Admin user created successfully!")
    console.log(`Username: ${username}`)
    console.log("Password: @Gamer360")
  } catch (error) {
    console.error("Error initializing admin user:", error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  initAdmin()
    .then(() => {
      console.log("Admin initialization complete.")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Failed to initialize admin:", error)
      process.exit(1)
    })
}

export { initAdmin }

