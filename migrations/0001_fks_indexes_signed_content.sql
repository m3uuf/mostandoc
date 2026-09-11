-- ── Pre-flight cleanup so the constraints below can be added on a live database ──
-- Optional links to a deleted client/contract become NULL (history is kept).
UPDATE "contracts" SET "client_id" = NULL WHERE "client_id" IS NOT NULL AND "client_id" NOT IN (SELECT "id" FROM "clients");--> statement-breakpoint
UPDATE "invoices" SET "client_id" = NULL WHERE "client_id" IS NOT NULL AND "client_id" NOT IN (SELECT "id" FROM "clients");--> statement-breakpoint
UPDATE "documents" SET "client_id" = NULL WHERE "client_id" IS NOT NULL AND "client_id" NOT IN (SELECT "id" FROM "clients");--> statement-breakpoint
UPDATE "projects" SET "client_id" = NULL WHERE "client_id" IS NOT NULL AND "client_id" NOT IN (SELECT "id" FROM "clients");--> statement-breakpoint
UPDATE "projects" SET "contract_id" = NULL WHERE "contract_id" IS NOT NULL AND "contract_id" NOT IN (SELECT "id" FROM "contracts");--> statement-breakpoint
-- Rows whose owner no longer exists are unreachable by any route (everything is scoped by user_id); drop them.
DELETE FROM "profiles" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "clients" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "contracts" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "invoices" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "projects" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "documents" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "notifications" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "subscriptions" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "content_library" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "email_verification_tokens" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "password_reset_tokens" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
DELETE FROM "services" WHERE "profile_id" NOT IN (SELECT "id" FROM "profiles");--> statement-breakpoint
DELETE FROM "portfolio_items" WHERE "profile_id" NOT IN (SELECT "id" FROM "profiles");--> statement-breakpoint
DELETE FROM "contact_messages" WHERE "profile_id" NOT IN (SELECT "id" FROM "profiles");--> statement-breakpoint
DELETE FROM "invoice_items" WHERE "invoice_id" NOT IN (SELECT "id" FROM "invoices");--> statement-breakpoint
DELETE FROM "project_tasks" WHERE "project_id" NOT IN (SELECT "id" FROM "projects");--> statement-breakpoint
DELETE FROM "document_fields" WHERE "document_id" NOT IN (SELECT "id" FROM "documents");--> statement-breakpoint
DELETE FROM "document_files" WHERE "document_id" NOT IN (SELECT "id" FROM "documents");--> statement-breakpoint
DELETE FROM "document_signatures" WHERE "document_id" NOT IN (SELECT "id" FROM "documents");--> statement-breakpoint
-- Duplicate invoice numbers within one account get a numeric suffix so the unique index can be created.
WITH dups AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id", "invoice_number" ORDER BY "created_at", "id") AS rn
  FROM "invoices"
)
UPDATE "invoices" i SET "invoice_number" = i."invoice_number" || '-' || d.rn
FROM dups d WHERE d."id" = i."id" AND d.rn > 1;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "signed_content" text;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_library" ADD CONSTRAINT "content_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_fields" ADD CONSTRAINT "document_fields_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contact_messages_profile_id" ON "contact_messages" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_client_id" ON "contracts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_end_date" ON "contracts" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "idx_document_fields_document_id" ON "document_fields" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_document_signatures_document_id" ON "document_signatures" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_document_signatures_signed_at" ON "document_signatures" USING btree ("signed_at");--> statement-breakpoint
CREATE INDEX "idx_documents_client_id" ON "documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_documents_status" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invoice_items_invoice_id" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_client_id" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invoices_due_date" ON "invoices" USING btree ("due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_invoices_user_number" ON "invoices" USING btree ("user_id","invoice_number");--> statement-breakpoint
CREATE INDEX "idx_portfolio_items_profile_id" ON "portfolio_items" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_project_tasks_project_id" ON "project_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_projects_client_id" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_projects_contract_id" ON "projects" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_services_profile_id" ON "services" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" USING btree ("status");