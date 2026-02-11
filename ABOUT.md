# About the Project

## What inspired you

Professional headshots are expensive and time-consuming—yet they matter for LinkedIn, job applications, and personal branding. We wanted to give everyone access to polished, style-consistent avatars without the cost of a photo shoot or the inconsistency of casual selfies. The idea was simple: **one photo in, many avatars out**—LinkedIn-ready, corporate, or creative (Anime, Cyberpunk)—so people can show up confidently online regardless of budget.

We also wanted to build something that felt *local*: payments via M-Pesa through Paystack, so users in Kenya and similar markets could pay in a way that actually works for them.

---

## What you learned

- **AI image APIs in production**: Using an AI gateway with Gemini for avatar generation taught us prompt engineering, handling rate limits, and designing for partial regeneration (e.g. “change only background”) to save cost—turning one full generation into two lighter edits with \(\frac{1}{2}\) credit each.
- **Payments and credits**: Modeling a credit system (full vs partial generations), linking pre-auth payments to accounts after sign-up, and verifying Paystack webhooks made us think through edge cases: duplicate webhooks, failed payments, and idempotent credit allocation.
- **Auth and quotas**: We learned to separate anonymous usage (e.g. \(n\) free generations in `localStorage`) from authenticated users (weekly free quota + purchased credits), and to enforce limits consistently across client and server.

---

## How you built your project

- **Stack**: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Shadcn/Radix UI, PostgreSQL with Drizzle ORM, Better Auth (Google OAuth), Paystack for M-Pesa, and Google Gemini via an AI gateway.
- **Flow**: User uploads a photo and selects style (LinkedIn, Corporate, Anime, Cyberpunk, Vintage), background, and color mood. The app calls the image-generation API, stores the result, and tracks usage. Authenticated users can do partial regeneration (background/lighting only) for \(0.5\) credits.
- **Credits**:  
  - Unauthenticated: \(2\) free generations (client-tracked).  
  - Authenticated: \(3\) free generations per 7-day window plus purchased packs.  
  - Full generation = \(1\) credit; partial = \(0.5\) credits:  
  \[
  \text{credits used} = \#_{\text{full}} \cdot 1 + \#_{\text{partial}} \cdot 0.5
  \]
- **Payments**: Paystack integration for one-time packs (e.g. KES 5 for 5 generations, KES 100 for 20). Users can pay before signing up; we link credits when they register with the same email.
- **Admin**: Separate JWT-based admin auth, dashboard for users, generations, and payment analytics (revenue, paying users, trends).

---

## Challenges you faced

1. **Partial regeneration**: Getting the model to change only background and lighting while preserving face and style required careful prompting and sometimes multiple attempts; we added a dedicated “partial” mode and clear UX so users know they’re spending \(0.5\) credits.
2. **Credit linking**: Matching pre-auth payments (email-only) to accounts created later meant robust matching (same email), idempotent webhook handling, and clear messaging (“Sign up with this email to claim your credits”).
3. **Generation limits everywhere**: Enforcing limits for both anonymous and logged-in users required shared logic: server-side checks on every generation, plus client-side guards and clear feedback when limits are hit.
4. **Admin in a Next.js app**: Keeping admin routes and JWT validation separate from main app auth (Better Auth) without duplicating too much logic was a design challenge; we used a dedicated admin API and session secret.
5. **Responsive avatar UX**: Making the upload → style selection → result flow work on mobile (touch, small screens) and desktop (keyboard shortcuts like Ctrl/Cmd+P for partial regeneration) took iteration on layout and component behavior.

---

*Persona Studio: turn selfies into pro avatars—free tries, then pay via M-Pesa. Built for Kenya-friendly payments and every device.*
