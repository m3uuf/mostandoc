import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, jsonb, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export { sessions } from "./models/auth";
export { users } from "./models/auth";
export type { User, UpsertUser } from "./models/auth";

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  username: text("username").unique().notNull(),
  fullName: text("full_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  profession: text("profession"),
  location: text("location"),
  emailPublic: text("email_public"),
  phonePublic: text("phone_public"),
  website: text("website"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  taxNumber: text("tax_number"),
  logoUrl: text("logo_url"),
  socialLinks: jsonb("social_links").$type<Record<string, string>>().default({}),
  primaryColor: text("primary_color").default("#3B5FE5"),
  accentColor: text("accent_color").default("#E8752A"),
  headerStyle: text("header_style").default("gradient"),
  coverImageUrl: text("cover_image_url"),
  themeMode: text("theme_mode").default("light"),
  buttonStyle: text("button_style").default("filled"),
  isPublic: boolean("is_public").default(true),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_clients_user_id").on(table.userId),
  index("idx_clients_name").on(table.name),
]);

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  clientId: varchar("client_id"),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  value: decimal("value", { precision: 12, scale: 2 }),
  currency: text("currency").default("SAR"),
  status: text("status").default("draft"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_contracts_user_id").on(table.userId),
  index("idx_contracts_title").on(table.title),
]);

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  clientId: varchar("client_id"),
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status").default("draft"),
  issueDate: date("issue_date").default(sql`CURRENT_DATE`),
  dueDate: date("due_date"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("15.00"),
  vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  paymentMethod: text("payment_method"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_invoices_user_id").on(table.userId),
  index("idx_invoices_number").on(table.invoiceNumber),
]);

export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  clientId: varchar("client_id"),
  contractId: varchar("contract_id"),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("not_started"),
  priority: text("priority").default("medium"),
  startDate: date("start_date"),
  deadline: date("deadline"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_projects_user_id").on(table.userId),
  index("idx_projects_name").on(table.name),
]);

export const projectTasks = pgTable("project_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo"),
  priority: text("priority").default("medium"),
  dueDate: date("due_date"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }),
  priceType: text("price_type").default("fixed"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portfolioItems = pgTable("portfolio_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  link: text("link"),
  category: text("category"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_notifications_user_id").on(table.userId)]);

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"),
  plan: text("plan").default("free"),
  status: text("status").default("inactive"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  clientLimit: integer("client_limit"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_subscriptions_user_id").on(table.userId), index("idx_subscriptions_stripe_customer_id").on(table.stripeCustomerId)]);

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  clientId: varchar("client_id"),
  title: text("title").notNull(),
  docType: text("doc_type").default("file"),
  content: text("content"),
  fileUrl: text("file_url"),
  fileData: text("file_data"),
  fileType: text("file_type"),
  status: text("status").default("draft"),
  shareToken: varchar("share_token").unique(),
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_documents_user_id").on(table.userId),
  index("idx_documents_share_token").on(table.shareToken),
  index("idx_documents_title").on(table.title),
]);

export const documentFields = pgTable("document_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  type: text("type").notNull(),
  label: text("label"),
  value: text("value"),
  x: decimal("x", { precision: 10, scale: 2 }).notNull(),
  y: decimal("y", { precision: 10, scale: 2 }).notNull(),
  width: decimal("width", { precision: 10, scale: 2 }).default("200"),
  height: decimal("height", { precision: 10, scale: 2 }).default("40"),
  page: integer("page").default(0),
  required: boolean("required").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const documentSignatures = pgTable("document_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  signerName: text("signer_name").notNull(),
  signerEmail: text("signer_email"),
  signatureData: text("signature_data").notNull(),
  ipAddress: text("ip_address"),
  signedAt: timestamp("signed_at").defaultNow(),
});

// ─── Content Library ─────────────────────────────────────────────
export const contentLibrary = pgTable("content_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  category: text("category").default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("content_library_user_idx").on(table.userId),
]);

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertPortfolioItemSchema = createInsertSchema(portfolioItems).omit({ id: true, createdAt: true });
export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentFieldSchema = createInsertSchema(documentFields).omit({ id: true });
export const insertDocumentSignatureSchema = createInsertSchema(documentSignatures).omit({ id: true, signedAt: true });

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;
export type InsertPortfolioItem = z.infer<typeof insertPortfolioItemSchema>;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocumentField = z.infer<typeof insertDocumentFieldSchema>;
export type DocumentField = typeof documentFields.$inferSelect;
export type InsertDocumentSignature = z.infer<typeof insertDocumentSignatureSchema>;
export type DocumentSignature = typeof documentSignatures.$inferSelect;
export const insertContentLibrarySchema = createInsertSchema(contentLibrary).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentLibrary = z.infer<typeof insertContentLibrarySchema>;
export type ContentLibraryItem = typeof contentLibrary.$inferSelect;

// ─── Audit Logs (سجل النشاطات) ──────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: varchar("target_id"),
  details: jsonb("details").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_logs_actor_id").on(table.actorId),
  index("idx_audit_logs_created_at").on(table.createdAt),
  index("idx_audit_logs_action").on(table.action),
]);

// ─── Platform Templates (قوالب المنصة) ──────────────────────────
export const platformTemplates = pgTable("platform_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  category: text("category").default("general"),
  icon: text("icon"),
  color: text("color").default("#3B5FE5"),
  isFeatured: boolean("is_featured").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  usageCount: integer("usage_count").default(0),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Platform Settings (إعدادات المنصة) ─────────────────────────
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").unique().notNull(),
  value: jsonb("value").$type<any>().notNull(),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Admin Notifications (إشعارات الأدمن) ───────────────────────
export const adminNotifications = pgTable("admin_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  targetUserId: varchar("target_user_id"),
  sentBy: varchar("sent_by").notNull(),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Discount Coupons (كوبونات الخصم) ───────────────────────────
export const discountCoupons = pgTable("discount_coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").unique().notNull(),
  discountType: text("discount_type").default("percentage"),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Tracking Scripts (أكواد التتبع والسكربتات) ─────────────────
export const trackingScripts = pgTable("tracking_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  platform: text("platform").notNull(), // google_analytics, google_tag_manager, meta_pixel, snapchat_pixel, tiktok_pixel, twitter_pixel, linkedin_pixel, custom
  trackingId: text("tracking_id"), // e.g. GA-XXXXXXX, GTM-XXXXXXX, pixel ID
  headCode: text("head_code"), // code injected in <head>
  bodyCode: text("body_code"), // code injected after <body>
  placement: text("placement").default("all"), // all, landing_only, dashboard_only, public_profile
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Insert Schemas & Types ─────────────────────────────────────
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export const insertPlatformTemplateSchema = createInsertSchema(platformTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformTemplate = z.infer<typeof insertPlatformTemplateSchema>;
export type PlatformTemplate = typeof platformTemplates.$inferSelect;

export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({ id: true, updatedAt: true });
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;

export const insertAdminNotificationSchema = createInsertSchema(adminNotifications).omit({ id: true, createdAt: true });
export type InsertAdminNotification = z.infer<typeof insertAdminNotificationSchema>;
export type AdminNotification = typeof adminNotifications.$inferSelect;

export const insertDiscountCouponSchema = createInsertSchema(discountCoupons).omit({ id: true, createdAt: true });
export type InsertDiscountCoupon = z.infer<typeof insertDiscountCouponSchema>;
export type DiscountCoupon = typeof discountCoupons.$inferSelect;

export const insertTrackingScriptSchema = createInsertSchema(trackingScripts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrackingScript = z.infer<typeof insertTrackingScriptSchema>;
export type TrackingScript = typeof trackingScripts.$inferSelect;
