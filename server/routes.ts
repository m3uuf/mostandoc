import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replit_integrations/auth/replitAuth";

function getUserId(req: Request): string {
  return (req.user as any)?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats(getUserId(req));
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الإحصائيات" });
    }
  });

  app.get("/api/dashboard/overdue-invoices", isAuthenticated, async (req, res) => {
    try {
      const invoices = await storage.getOverdueInvoices(getUserId(req));
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الفواتير المتأخرة" });
    }
  });

  app.get("/api/dashboard/expiring-contracts", isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.getExpiringContracts(getUserId(req), 30);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل العقود" });
    }
  });

  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      res.json(profile || null);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل البروفايل" });
    }
  });

  app.post("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.upsertProfile({ ...req.body, userId: getUserId(req) });
      res.json(profile);
    } catch (error: any) {
      if (error.constraint === "profiles_username_unique") {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      res.status(500).json({ message: "فشل في حفظ البروفايل" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.updateProfile(getUserId(req), req.body);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث البروفايل" });
    }
  });

  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const { search, status } = req.query;
      const clientsList = await storage.getClients(getUserId(req), search as string, status as string);
      res.json(clientsList);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل العملاء" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id, getUserId(req));
      if (!client) return res.status(404).json({ message: "العميل غير موجود" });
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل العميل" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.createClient({ ...req.body, userId: getUserId(req) });
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "فشل في إضافة العميل" });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, getUserId(req), req.body);
      if (!client) return res.status(404).json({ message: "العميل غير موجود" });
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث العميل" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id, getUserId(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف العميل" });
    }
  });

  app.get("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const { status, search } = req.query;
      const contractsList = await storage.getContracts(getUserId(req), status as string, search as string);
      res.json(contractsList);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل العقود" });
    }
  });

  app.get("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.getContract(req.params.id, getUserId(req));
      if (!contract) return res.status(404).json({ message: "العقد غير موجود" });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل العقد" });
    }
  });

  app.post("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.createContract({ ...req.body, userId: getUserId(req) });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ message: "فشل في إنشاء العقد" });
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.updateContract(req.params.id, getUserId(req), req.body);
      if (!contract) return res.status(404).json({ message: "العقد غير موجود" });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث العقد" });
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteContract(req.params.id, getUserId(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف العقد" });
    }
  });

  app.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const invoicesList = await storage.getInvoices(getUserId(req), status as string);
      res.json(invoicesList);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الفواتير" });
    }
  });

  app.get("/api/invoices/next-number", isAuthenticated, async (req, res) => {
    try {
      const number = await storage.getNextInvoiceNumber(getUserId(req));
      res.json({ number });
    } catch (error) {
      res.status(500).json({ message: "فشل في توليد رقم الفاتورة" });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id, getUserId(req));
      if (!invoice) return res.status(404).json({ message: "الفاتورة غير موجودة" });
      const items = await storage.getInvoiceItems(req.params.id);
      res.json({ ...invoice, items });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الفاتورة" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const { items, ...invoiceData } = req.body;
      const invoice = await storage.createInvoice({ ...invoiceData, userId: getUserId(req) });
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createInvoiceItem({ ...item, invoiceId: invoice.id });
        }
      }
      const createdItems = await storage.getInvoiceItems(invoice.id);
      res.json({ ...invoice, items: createdItems });
    } catch (error) {
      res.status(500).json({ message: "فشل في إنشاء الفاتورة" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const { items, ...invoiceData } = req.body;
      const invoice = await storage.updateInvoice(req.params.id, getUserId(req), invoiceData);
      if (!invoice) return res.status(404).json({ message: "الفاتورة غير موجودة" });
      if (items) {
        await storage.deleteInvoiceItemsByInvoiceId(req.params.id);
        for (const item of items) {
          await storage.createInvoiceItem({ ...item, invoiceId: req.params.id });
        }
      }
      const updatedItems = await storage.getInvoiceItems(req.params.id);
      res.json({ ...invoice, items: updatedItems });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث الفاتورة" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInvoice(req.params.id, getUserId(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف الفاتورة" });
    }
  });

  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const projectsList = await storage.getProjects(getUserId(req), status as string);
      res.json(projectsList);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل المشاريع" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id, getUserId(req));
      if (!project) return res.status(404).json({ message: "المشروع غير موجود" });
      const tasks = await storage.getProjectTasks(req.params.id);
      res.json({ ...project, tasks });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل المشروع" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.createProject({ ...req.body, userId: getUserId(req) });
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "فشل في إنشاء المشروع" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, getUserId(req), req.body);
      if (!project) return res.status(404).json({ message: "المشروع غير موجود" });
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث المشروع" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProject(req.params.id, getUserId(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف المشروع" });
    }
  });

  app.get("/api/projects/:id/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getProjectTasks(req.params.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل المهام" });
    }
  });

  app.post("/api/projects/:id/tasks", isAuthenticated, async (req, res) => {
    try {
      const task = await storage.createProjectTask({ ...req.body, projectId: req.params.id });
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "فشل في إضافة المهمة" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const task = await storage.updateProjectTask(req.params.id, req.body);
      if (!task) return res.status(404).json({ message: "المهمة غير موجودة" });
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث المهمة" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProjectTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف المهمة" });
    }
  });

  app.get("/api/services", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.json([]);
      const servicesList = await storage.getServices(profile.id);
      res.json(servicesList);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الخدمات" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.status(400).json({ message: "يرجى إعداد البروفايل أولاً" });
      const service = await storage.createService({ ...req.body, profileId: profile.id });
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "فشل في إضافة الخدمة" });
    }
  });

  app.patch("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const service = await storage.updateService(req.params.id, req.body);
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث الخدمة" });
    }
  });

  app.delete("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteService(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف الخدمة" });
    }
  });

  app.get("/api/portfolio", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.json([]);
      const items = await storage.getPortfolioItems(profile.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل معرض الأعمال" });
    }
  });

  app.post("/api/portfolio", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.status(400).json({ message: "يرجى إعداد البروفايل أولاً" });
      const item = await storage.createPortfolioItem({ ...req.body, profileId: profile.id });
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "فشل في إضافة العمل" });
    }
  });

  app.patch("/api/portfolio/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.updatePortfolioItem(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث العمل" });
    }
  });

  app.delete("/api/portfolio/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePortfolioItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف العمل" });
    }
  });

  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.json([]);
      const messages = await storage.getContactMessages(profile.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الرسائل" });
    }
  });

  app.patch("/api/messages/:id/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markMessageAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في تعليم الرسالة كمقروءة" });
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifs = await storage.getNotifications(getUserId(req));
      res.json(notifs);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الإشعارات" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(getUserId(req));
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل عدد الإشعارات" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في تعليم الإشعار كمقروء" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(getUserId(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في تعليم الإشعارات كمقروءة" });
    }
  });

  app.get("/api/public/:username", async (req, res) => {
    try {
      const profile = await storage.getProfileByUsername(req.params.username);
      if (!profile || !profile.isPublic) return res.status(404).json({ message: "الصفحة غير موجودة" });
      const servicesList = await storage.getServices(profile.id);
      const portfolio = await storage.getPortfolioItems(profile.id);
      res.json({ profile, services: servicesList, portfolio });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الصفحة" });
    }
  });

  app.post("/api/public/:username/contact", async (req, res) => {
    try {
      const profile = await storage.getProfileByUsername(req.params.username);
      if (!profile) return res.status(404).json({ message: "الصفحة غير موجودة" });
      const message = await storage.createContactMessage({ ...req.body, profileId: profile.id });
      await storage.createNotification({
        userId: profile.userId,
        type: "new_message",
        title: "رسالة جديدة",
        message: `رسالة جديدة من ${req.body.senderName} عبر صفحتك العامة`,
        link: "/dashboard/my-page",
      });
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "فشل في إرسال الرسالة" });
    }
  });

  return httpServer;
}
