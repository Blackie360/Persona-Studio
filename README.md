# Persona Studio

An AI-powered avatar generation application that transforms your photos into stunning professional avatars. Choose from multiple styles including LinkedIn, Corporate, Anime, and Cyberpunk.

## ✨ Features

- **AI Avatar Generation**: Transform photos into professional avatars using Google Gemini AI
- **Multiple Styles**: LinkedIn, Corporate, Anime, and Cyberpunk styles
- **Customization Options**: 
  - Avatar styles (Corporate, LinkedIn, Anime, Cyberpunk)
  - Background options (Studio, Gradient, Blur, Solid)
  - Color moods (Natural, Warm, Cool, Vibrant, Muted, High-Contrast)
- **Free Generations**: 
  - 2 free generations for unauthenticated users
  - 3 additional free generations for authenticated users (resets every 7 days)
- **Payment Integration**: Pay via M-Pesa through Paystack
  - Starter Plan: KES 5 for 5 generations
  - Value Pack: KES 100 for 20 generations
- **Responsive Design**: Fully responsive across all screen sizes (mobile, tablet, desktop)
- **Admin Dashboard**: Comprehensive analytics and user management
- **Payment Analytics**: Track payments, revenue, and customer behavior

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (package manager)
- PostgreSQL database
- Paystack account (for payments)
- Google OAuth credentials (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Persona-Studio
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL=your_postgresql_connection_string

   # Authentication (Better Auth)
   BETTER_AUTH_SECRET=your_better_auth_secret
   BETTER_AUTH_URL=http://localhost:3000

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Paystack (for payments)
   PAYSTACK_SECRET_KEY=your_paystack_secret_key
   PAYSTACK_PUBLIC_KEY=your_paystack_public_key

   # AI Gateway
   AI_GATEWAY_API_KEY=your_ai_gateway_api_key

   # Admin (optional, defaults to BETTER_AUTH_SECRET)
   ADMIN_SESSION_SECRET=your_admin_session_secret
   ```

4. **Run database migrations**
   ```bash
   pnpm drizzle-kit push
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

   The app will be available at `http://localhost:3000`

## 📦 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm drizzle-kit push` - Push database schema changes

## 🎨 Generation Limits

### Unauthenticated Users
- **2 free generations** (tracked in localStorage)
- Once used, users must sign up to continue

### Authenticated Users
- **3 free generations** (resets every 7 days)
- Plus any purchased generations from payment plans
- Free generations are used first, then paid generations

### Payment Plans
- **Starter Plan**: KES 5 → 5 generations
- **Value Pack**: KES 100 → 20 generations

## 💳 Payment Flow

1. **Unauthenticated Users**:
   - Click "Pricing" button
   - Select a plan
   - Enter email address
   - Complete payment via M-Pesa
   - Sign up with the same email to link credits

2. **Authenticated Users**:
   - Click "Pricing" button
   - Select a plan
   - Complete payment via M-Pesa
   - Credits are automatically added to account

## 🔐 Admin Dashboard

Access the admin dashboard at `/admin/login` with your admin credentials.

### Features:
- User management (view, block/unblock users)
- Generation statistics and analytics
- Payment analytics:
  - Total revenue
  - Paying users count
  - Payment status breakdown
  - Payment history (first-time, repeat, third-time payers)
  - Revenue trends over time
- Paying customers list with transaction details
- Recent generations monitoring

### Admin Setup:
Admin users must be created directly in the database. The admin dashboard uses JWT-based authentication separate from user authentication.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn UI, Radix UI
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth (Google OAuth)
- **Payments**: Paystack (M-Pesa integration)
- **AI**: Google Gemini (via AI Gateway)
- **Animations**: Framer Motion
- **Package Manager**: pnpm

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Mobile**: 320px+
- **Tablet**: 768px+
- **Desktop**: 1024px+
- **Large Desktop**: 1920px+

All components adapt seamlessly across screen sizes with:
- Responsive typography
- Mobile-friendly tables with horizontal scrolling
- Adaptive layouts and spacing
- Touch-friendly interactive elements

## 🎨 Fonts

The application uses custom fonts:
- **Sans-Serif**: ABeeZee (default body text)
- **Serif**: Adamina (headings)
- **Monospace**: Chivo Mono (code elements)

## 🔒 Security Notes

- Never commit `.env.local` or any files containing secrets
- Admin credentials should be set via environment variables
- Admin users must be created directly in the database
- Payment webhooks are verified using Paystack signatures
- User sessions are managed securely via Better Auth

## 📝 Project Structure

```
Persona-Studio/
├── app/
│   ├── api/
│   │   ├── admin/          # Admin API routes
│   │   ├── generate-image/ # Image generation endpoint
│   │   └── payments/       # Payment handling
│   ├── admin/              # Admin dashboard pages
│   └── layout.tsx          # Root layout
├── components/
│   ├── admin/              # Admin dashboard components
│   ├── image-combiner/     # Main image generation UI
│   └── ui/                 # Shadcn UI components
├── lib/
│   ├── auth.ts             # Better Auth configuration
│   ├── db/                 # Database schema and connection
│   └── payments/           # Payment logic (Paystack)
└── public/                 # Static assets
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Commit with descriptive messages
4. Push to your branch
5. Create a pull request

## 📄 License

Private project - All rights reserved
