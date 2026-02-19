import { eq, and, desc, like, or, sql, count, sum, lt, gte, lte } from "drizzle-orm";
import { db } from "./db";
import {
  profiles, clients, contracts, invoices, invoiceItems, projects, projectTasks,
  services, portfolioItems, contactMessages, notifications,
  type Profile, type InsertProfile,
  type Client, type InsertClient,
  type Contract, type InsertContract,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type Project, type InsertProject,
  type ProjectTask, type InsertProjectTask,
  type Service, type InsertService,
  type PortfolioItem, type InsertPortfolioItem,
  type ContactMessage, type InsertContactMessage,
  type Notification, type InsertNotification,
} from "@shared/schema";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface IStorage {
  getProfile(userId: string): Promise<Profile | undefined>;
  getProfileByUsername(username: string): Promise<Profile | undefined>;
  upsertProfile(data: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, data: Partial<InsertProfile>): Promise<Profile | undefined>;

  getClients(userId: string, pagination: PaginationParams, search?: string, status?: string): Promise<PaginatedResult<Client>>;
  getClient(id: string, userId: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  updateClient(id: string, userId: string, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string, userId: string): Promise<boolean>;
  getClientCount(userId: string): Promise<number>;

  getContracts(userId: string, pagination: PaginationParams, status?: string, search?: string): Promise<PaginatedResult<Contract & { clientName?: string | null }>>;
  getContract(id: string, userId: string): Promise<Contract | undefined>;
  createContract(data: InsertContract): Promise<Contract>;
  updateContract(id: string, userId: string, data: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: string, userId: string): Promise<boolean>;
  getActiveContractCount(userId: string): Promise<number>;
  getExpiringContracts(userId: string, days: number): Promise<(Contract & { clientName?: string | null })[]>;

  getInvoices(userId: string, pagination: PaginationParams, status?: string): Promise<PaginatedResult<Invoice & { clientName?: string | null }>>;
  getInvoice(id: string, userId: string): Promise<Invoice | undefined>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, userId: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string, userId: string): Promise<boolean>;
  getNextInvoiceNumber(userId: string): Promise<string>;
  getPendingInvoiceStats(userId: string): Promise<{ count: number; total: string }>;
  getOverdueInvoices(userId: string): Promise<(Invoice & { clientName?: string | null })[]>;

  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(data: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, data: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: string): Promise<boolean>;
  deleteInvoiceItemsByInvoiceId(invoiceId: string): Promise<boolean>;

  getProjects(userId: string, pagination: PaginationParams, status?: string): Promise<PaginatedResult<Project & { clientName?: string | null }>>;
  getProject(id: string, userId: string): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, userId: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string, userId: string): Promise<boolean>;
  getActiveProjectCount(userId: string): Promise<number>;

  getProjectTasks(projectId: string): Promise<ProjectTask[]>;
  getProjectTaskById(id: string): Promise<ProjectTask | undefined>;
  createProjectTask(data: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: string, data: Partial<InsertProjectTask>): Promise<ProjectTask | undefined>;
  deleteProjectTask(id: string): Promise<boolean>;

  getServices(profileId: string): Promise<Service[]>;
  getServiceById(id: string): Promise<Service | undefined>;
  createService(data: InsertService): Promise<Service>;
  updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<boolean>;

  getPortfolioItems(profileId: string): Promise<PortfolioItem[]>;
  getPortfolioItemById(id: string): Promise<PortfolioItem | undefined>;
  createPortfolioItem(data: InsertPortfolioItem): Promise<PortfolioItem>;
  updatePortfolioItem(id: string, data: Partial<InsertPortfolioItem>): Promise<PortfolioItem | undefined>;
  deletePortfolioItem(id: string): Promise<boolean>;

  getContactMessages(profileId: string, pagination: PaginationParams): Promise<PaginatedResult<ContactMessage>>;
  getContactMessageById(id: string): Promise<ContactMessage | undefined>;
  createContactMessage(data: InsertContactMessage): Promise<ContactMessage>;
  markMessageAsRead(id: string): Promise<boolean>;
  getUnreadMessageCount(profileId: string): Promise<number>;

  getNotifications(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Notification>>;
  getNotificationById(id: string): Promise<Notification | undefined>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  getDashboardStats(userId: string): Promise<{
    clientCount: number;
    activeContractCount: number;
    pendingInvoiceCount: number;
    pendingInvoiceTotal: string;
    activeProjectCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getProfile(userId: string) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async getProfileByUsername(username: string) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.username, username));
    return profile;
  }

  async upsertProfile(data: InsertProfile) {
    const [profile] = await db.insert(profiles).values(data)
      .onConflictDoUpdate({ target: profiles.userId, set: { ...data, updatedAt: new Date() } })
      .returning();
    return profile;
  }

  async updateProfile(userId: string, data: Partial<InsertProfile>) {
    const [profile] = await db.update(profiles).set({ ...data, updatedAt: new Date() })
      .where(eq(profiles.userId, userId)).returning();
    return profile;
  }

  async getClients(userId: string, pagination: PaginationParams, search?: string, status?: string) {
    const conditions: any[] = [eq(clients.userId, userId)];
    if (status && status !== "all") {
      conditions.push(eq(clients.status, status));
    }
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(or(like(clients.name, searchPattern), like(clients.email, searchPattern), like(clients.company, searchPattern)));
    }
    const whereClause = and(...conditions);
    const [totalResult] = await db.select({ count: count() }).from(clients).where(whereClause);
    const total = totalResult.count;
    const offset = (pagination.page - 1) * pagination.limit;
    const data = await db.select().from(clients).where(whereClause).orderBy(desc(clients.createdAt)).limit(pagination.limit).offset(offset);
    return { data, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
  }

  async getClient(id: string, userId: string) {
    const [client] = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return client;
  }

  async createClient(data: InsertClient) {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async updateClient(id: string, userId: string, data: Partial<InsertClient>) {
    const [client] = await db.update(clients).set({ ...data, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.userId, userId))).returning();
    return client;
  }

  async deleteClient(id: string, userId: string) {
    const [contractCount] = await db.select({ count: count() }).from(contracts)
      .where(and(eq(contracts.clientId, id), eq(contracts.userId, userId)));
    const [invoiceCount] = await db.select({ count: count() }).from(invoices)
      .where(and(eq(invoices.clientId, id), eq(invoices.userId, userId)));
    const [projectCount] = await db.select({ count: count() }).from(projects)
      .where(and(eq(projects.clientId, id), eq(projects.userId, userId)));
    const total = contractCount.count + invoiceCount.count + projectCount.count;
    if (total > 0) {
      throw new Error(`CLIENT_HAS_RELATIONS:${contractCount.count}:${invoiceCount.count}:${projectCount.count}`);
    }
    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return true;
  }

  async getClientCount(userId: string) {
    const [result] = await db.select({ count: count() }).from(clients).where(eq(clients.userId, userId));
    return result.count;
  }

  async getContracts(userId: string, pagination: PaginationParams, status?: string, search?: string) {
    const conditions: any[] = [eq(contracts.userId, userId)];
    if (status && status !== "all") conditions.push(eq(contracts.status, status));
    const whereClause = and(...conditions);

    const [totalResult] = await db.select({ count: count() }).from(contracts).where(whereClause);
    const total = totalResult.count;
    const offset = (pagination.page - 1) * pagination.limit;

    const data = await db.select({
      id: contracts.id, userId: contracts.userId, clientId: contracts.clientId,
      title: contracts.title, description: contracts.description, content: contracts.content,
      value: contracts.value, currency: contracts.currency, status: contracts.status,
      startDate: contracts.startDate, endDate: contracts.endDate,
      createdAt: contracts.createdAt, updatedAt: contracts.updatedAt,
      clientName: clients.name,
    }).from(contracts)
      .leftJoin(clients, eq(contracts.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(contracts.createdAt))
      .limit(pagination.limit).offset(offset);
    return { data, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
  }

  async getContract(id: string, userId: string) {
    const [contract] = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return contract;
  }

  async createContract(data: InsertContract) {
    const [contract] = await db.insert(contracts).values(data).returning();
    return contract;
  }

  async updateContract(id: string, userId: string, data: Partial<InsertContract>) {
    const [contract] = await db.update(contracts).set({ ...data, updatedAt: new Date() })
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId))).returning();
    return contract;
  }

  async deleteContract(id: string, userId: string) {
    await db.delete(contracts).where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return true;
  }

  async getActiveContractCount(userId: string) {
    const [result] = await db.select({ count: count() }).from(contracts)
      .where(and(eq(contracts.userId, userId), eq(contracts.status, "active")));
    return result.count;
  }

  async getExpiringContracts(userId: string, days: number) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    const result = await db.select({
      id: contracts.id, userId: contracts.userId, clientId: contracts.clientId,
      title: contracts.title, description: contracts.description, content: contracts.content,
      value: contracts.value, currency: contracts.currency, status: contracts.status,
      startDate: contracts.startDate, endDate: contracts.endDate,
      createdAt: contracts.createdAt, updatedAt: contracts.updatedAt,
      clientName: clients.name,
    }).from(contracts)
      .leftJoin(clients, eq(contracts.clientId, clients.id))
      .where(and(
        eq(contracts.userId, userId),
        eq(contracts.status, "active"),
        lte(contracts.endDate, futureDate.toISOString().split("T")[0]),
        gte(contracts.endDate, now.toISOString().split("T")[0])
      ));
    return result;
  }

  async getInvoices(userId: string, pagination: PaginationParams, status?: string) {
    const conditions: any[] = [eq(invoices.userId, userId)];
    if (status && status !== "all") conditions.push(eq(invoices.status, status));
    const whereClause = and(...conditions);

    const [totalResult] = await db.select({ count: count() }).from(invoices).where(whereClause);
    const total = totalResult.count;
    const offset = (pagination.page - 1) * pagination.limit;

    const data = await db.select({
      id: invoices.id, userId: invoices.userId, clientId: invoices.clientId,
      invoiceNumber: invoices.invoiceNumber, status: invoices.status,
      issueDate: invoices.issueDate, dueDate: invoices.dueDate,
      subtotal: invoices.subtotal, vatRate: invoices.vatRate,
      vatAmount: invoices.vatAmount, total: invoices.total,
      notes: invoices.notes, paymentMethod: invoices.paymentMethod,
      paidAt: invoices.paidAt, createdAt: invoices.createdAt, updatedAt: invoices.updatedAt,
      clientName: clients.name,
    }).from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(invoices.createdAt))
      .limit(pagination.limit).offset(offset);
    return { data, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
  }

  async getInvoice(id: string, userId: string) {
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return invoice;
  }

  async createInvoice(data: InsertInvoice) {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  }

  async updateInvoice(id: string, userId: string, data: Partial<InsertInvoice>) {
    const [invoice] = await db.update(invoices).set({ ...data, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId))).returning();
    return invoice;
  }

  async deleteInvoice(id: string, userId: string) {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return true;
  }

  async getNextInvoiceNumber(userId: string) {
    const [result] = await db.select({ count: count() }).from(invoices).where(eq(invoices.userId, userId));
    const num = (result.count + 1).toString().padStart(4, "0");
    return `INV-${num}`;
  }

  async getPendingInvoiceStats(userId: string) {
    const [result] = await db.select({
      count: count(),
      total: sum(invoices.total),
    }).from(invoices).where(and(
      eq(invoices.userId, userId),
      or(eq(invoices.status, "sent"), eq(invoices.status, "overdue"))
    ));
    return { count: result.count, total: result.total || "0" };
  }

  async getOverdueInvoices(userId: string) {
    const today = new Date().toISOString().split("T")[0];
    return db.select({
      id: invoices.id, userId: invoices.userId, clientId: invoices.clientId,
      invoiceNumber: invoices.invoiceNumber, status: invoices.status,
      issueDate: invoices.issueDate, dueDate: invoices.dueDate,
      subtotal: invoices.subtotal, vatRate: invoices.vatRate,
      vatAmount: invoices.vatAmount, total: invoices.total,
      notes: invoices.notes, paymentMethod: invoices.paymentMethod,
      paidAt: invoices.paidAt, createdAt: invoices.createdAt, updatedAt: invoices.updatedAt,
      clientName: clients.name,
    }).from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        eq(invoices.userId, userId),
        or(eq(invoices.status, "sent"), eq(invoices.status, "overdue")),
        lt(invoices.dueDate, today)
      ));
  }

  async getInvoiceItems(invoiceId: string) {
    return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(invoiceItems.sortOrder);
  }

  async createInvoiceItem(data: InsertInvoiceItem) {
    const [item] = await db.insert(invoiceItems).values(data).returning();
    return item;
  }

  async updateInvoiceItem(id: string, data: Partial<InsertInvoiceItem>) {
    const [item] = await db.update(invoiceItems).set(data).where(eq(invoiceItems.id, id)).returning();
    return item;
  }

  async deleteInvoiceItem(id: string) {
    await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
    return true;
  }

  async deleteInvoiceItemsByInvoiceId(invoiceId: string) {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    return true;
  }

  async getProjects(userId: string, pagination: PaginationParams, status?: string) {
    const conditions: any[] = [eq(projects.userId, userId)];
    if (status && status !== "all") conditions.push(eq(projects.status, status));
    const whereClause = and(...conditions);

    const [totalResult] = await db.select({ count: count() }).from(projects).where(whereClause);
    const total = totalResult.count;
    const offset = (pagination.page - 1) * pagination.limit;

    const data = await db.select({
      id: projects.id, userId: projects.userId, clientId: projects.clientId,
      contractId: projects.contractId, name: projects.name,
      description: projects.description, status: projects.status,
      priority: projects.priority, startDate: projects.startDate,
      deadline: projects.deadline, budget: projects.budget,
      createdAt: projects.createdAt, updatedAt: projects.updatedAt,
      clientName: clients.name,
    }).from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(projects.createdAt))
      .limit(pagination.limit).offset(offset);
    return { data, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
  }

  async getProject(id: string, userId: string) {
    const [project] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return project;
  }

  async createProject(data: InsertProject) {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async updateProject(id: string, userId: string, data: Partial<InsertProject>) {
    const [project] = await db.update(projects).set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId))).returning();
    return project;
  }

  async deleteProject(id: string, userId: string) {
    const project = await this.getProject(id, userId);
    if (project) {
      await db.delete(projectTasks).where(eq(projectTasks.projectId, id));
    }
    await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return true;
  }

  async getActiveProjectCount(userId: string) {
    const [result] = await db.select({ count: count() }).from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.status, "in_progress")));
    return result.count;
  }

  async getProjectTasks(projectId: string) {
    return db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId)).orderBy(projectTasks.sortOrder);
  }

  async getProjectTaskById(id: string) {
    const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    return task;
  }

  async createProjectTask(data: InsertProjectTask) {
    const [task] = await db.insert(projectTasks).values(data).returning();
    return task;
  }

  async updateProjectTask(id: string, data: Partial<InsertProjectTask>) {
    const [task] = await db.update(projectTasks).set({ ...data, updatedAt: new Date() })
      .where(eq(projectTasks.id, id)).returning();
    return task;
  }

  async deleteProjectTask(id: string) {
    await db.delete(projectTasks).where(eq(projectTasks.id, id));
    return true;
  }

  async getServices(profileId: string) {
    return db.select().from(services).where(eq(services.profileId, profileId)).orderBy(services.sortOrder);
  }

  async getServiceById(id: string) {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(data: InsertService) {
    const [service] = await db.insert(services).values(data).returning();
    return service;
  }

  async updateService(id: string, data: Partial<InsertService>) {
    const [service] = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return service;
  }

  async deleteService(id: string) {
    await db.delete(services).where(eq(services.id, id));
    return true;
  }

  async getPortfolioItems(profileId: string) {
    return db.select().from(portfolioItems).where(eq(portfolioItems.profileId, profileId)).orderBy(portfolioItems.sortOrder);
  }

  async getPortfolioItemById(id: string) {
    const [item] = await db.select().from(portfolioItems).where(eq(portfolioItems.id, id));
    return item;
  }

  async createPortfolioItem(data: InsertPortfolioItem) {
    const [item] = await db.insert(portfolioItems).values(data).returning();
    return item;
  }

  async updatePortfolioItem(id: string, data: Partial<InsertPortfolioItem>) {
    const [item] = await db.update(portfolioItems).set(data).where(eq(portfolioItems.id, id)).returning();
    return item;
  }

  async deletePortfolioItem(id: string) {
    await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
    return true;
  }

  async getContactMessageById(id: string) {
    const [msg] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return msg;
  }

  async getContactMessages(profileId: string, pagination: PaginationParams) {
    const whereClause = eq(contactMessages.profileId, profileId);
    const [totalResult] = await db.select({ count: count() }).from(contactMessages).where(whereClause);
    const total = totalResult.count;
    const offset = (pagination.page - 1) * pagination.limit;
    const data = await db.select().from(contactMessages).where(whereClause).orderBy(desc(contactMessages.createdAt)).limit(pagination.limit).offset(offset);
    return { data, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
  }

  async createContactMessage(data: InsertContactMessage) {
    const [message] = await db.insert(contactMessages).values(data).returning();
    return message;
  }

  async markMessageAsRead(id: string) {
    await db.update(contactMessages).set({ isRead: true }).where(eq(contactMessages.id, id));
    return true;
  }

  async getUnreadMessageCount(profileId: string) {
    const [result] = await db.select({ count: count() }).from(contactMessages)
      .where(and(eq(contactMessages.profileId, profileId), eq(contactMessages.isRead, false)));
    return result.count;
  }

  async getNotificationById(id: string) {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async getNotifications(userId: string, pagination: PaginationParams) {
    const whereClause = eq(notifications.userId, userId);
    const [totalResult] = await db.select({ count: count() }).from(notifications).where(whereClause);
    const total = totalResult.count;
    const offset = (pagination.page - 1) * pagination.limit;
    const data = await db.select().from(notifications).where(whereClause).orderBy(desc(notifications.createdAt)).limit(pagination.limit).offset(offset);
    return { data, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
  }

  async createNotification(data: InsertNotification) {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationAsRead(id: string) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    return true;
  }

  async markAllNotificationsAsRead(userId: string) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
    return true;
  }

  async getUnreadNotificationCount(userId: string) {
    const [result] = await db.select({ count: count() }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.count;
  }

  async getDashboardStats(userId: string) {
    const [clientResult] = await db.select({ count: count() }).from(clients).where(eq(clients.userId, userId));
    const [contractResult] = await db.select({ count: count() }).from(contracts)
      .where(and(eq(contracts.userId, userId), eq(contracts.status, "active")));
    const pendingStats = await this.getPendingInvoiceStats(userId);
    const [projectResult] = await db.select({ count: count() }).from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.status, "in_progress")));

    return {
      clientCount: clientResult.count,
      activeContractCount: contractResult.count,
      pendingInvoiceCount: pendingStats.count,
      pendingInvoiceTotal: pendingStats.total,
      activeProjectCount: projectResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
