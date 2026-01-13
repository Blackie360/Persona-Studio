import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, integer } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const generationLog = pgTable("generation_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  status: text("status").notNull(), // loading, complete, error
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url"),
  avatarStyle: text("avatar_style"),
  background: text("background"),
  colorMood: text("color_mood"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => [
  index("generation_log_userId_idx").on(table.userId),
  index("generation_log_createdAt_idx").on(table.createdAt),
]);

export const adminUser = pgTable("admin_user", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const blockedUser = pgTable("blocked_user", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  email: text("email"),
  sessionId: text("session_id"),
  reason: text("reason"),
  blockedAt: timestamp("blocked_at").defaultNow().notNull(),
  blockedBy: text("blocked_by").notNull(), // admin id
  isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
  index("blocked_user_userId_idx").on(table.userId),
  index("blocked_user_isActive_idx").on(table.isActive),
]);

export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  paystackReference: text("paystack_reference").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  amount: integer("amount").notNull(), // Amount in smallest currency unit (cents/kobo)
  currency: text("currency").default("KES").notNull(),
  status: text("status").notNull().default("pending"), // pending, success, failed, cancelled
  generationsGranted: integer("generations_granted").default(5).notNull(),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("payment_userId_idx").on(table.userId),
  index("payment_paystackReference_idx").on(table.paystackReference),
  index("payment_status_idx").on(table.status),
  index("payment_createdAt_idx").on(table.createdAt),
]);

export const userCredits = pgTable("user_credits", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }).notNull().unique(),
  paidGenerations: integer("paid_generations").default(0).notNull(),
  lastUpdated: timestamp("last_updated")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("user_credits_userId_idx").on(table.userId),
]);
