import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import UpgradePrompt from "@/components/upgrade-prompt";
import { Plus, Loader2, FolderKanban, Pencil, Trash2, GripVertical } from "lucide-react";
import { PaginationControls } from "@/components/pagination";
import type { Project, ProjectTask, Client } from "@shared/schema";

const statusLabels: Record<string, string> = { not_started: "لم يبدأ", in_progress: "قيد التنفيذ", on_hold: "متوقف", completed: "مكتمل", cancelled: "ملغي" };
const priorityLabels: Record<string, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية", urgent: "عاجلة" };
const priorityColors: Record<string, string> = { low: "text-blue-500", medium: "text-amber-500", high: "text-orange-500", urgent: "text-red-500" };
const taskStatusLabels: Record<string, string> = { todo: "قائمة المهام", in_progress: "قيد التنفيذ", review: "للمراجعة", done: "مكتمل" };

export default function ProjectsPage() {
  const { toast } = useToast();
  const { canCreate, usage, limits } = usePlanLimits();
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", dueDate: "", status: "todo" });
  const [form, setForm] = useState({ name: "", clientId: "", description: "", status: "not_started", priority: "medium", startDate: "", deadline: "", budget: "" });
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [filterStatus]);

  const { data: result, isLoading } = useQuery<{ data: (Project & { clientName?: string })[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: ["/api/projects", { status: filterStatus, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      params.set("page", String(page));
      const res = await fetch(`/api/projects?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const { data: projectsList = [], total = 0, totalPages = 0, limit = 20 } = result || {};

  const { data: projectDetail } = useQuery<Project & { tasks: ProjectTask[] }>({
    queryKey: ["/api/projects", detailOpen],
    enabled: !!detailOpen,
  });

  const { data: clientsResult } = useQuery<{ data: Client[] }>({ queryKey: ["/api/clients"] });
  const clients = clientsResult?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setDialogOpen(false);
      toast({ title: "تم إنشاء المشروع بنجاح" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setDialogOpen(false);
      setEditingProject(null);
      toast({ title: "تم تحديث المشروع" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setDeleteConfirm(null);
      toast({ title: "تم حذف المشروع" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${detailOpen}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", detailOpen] });
      setTaskDialogOpen(false);
      setTaskForm({ title: "", description: "", priority: "medium", dueDate: "", status: "todo" });
      toast({ title: "تم إضافة المهمة" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/tasks/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects", detailOpen] }); },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", detailOpen] });
      toast({ title: "تم حذف المهمة" });
    },
  });

  const openCreate = () => {
    setEditingProject(null);
    setForm({ name: "", clientId: "", description: "", status: "not_started", priority: "medium", startDate: "", deadline: "", budget: "" });
    setDialogOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      name: project.name, clientId: project.clientId || "", description: project.description || "",
      status: project.status || "not_started", priority: project.priority || "medium",
      startDate: project.startDate || "", deadline: project.deadline || "", budget: project.budget || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast({ title: "اسم المشروع مطلوب", variant: "destructive" }); return; }
    const data = { ...form, clientId: form.clientId || null, budget: form.budget || null };
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const tasks = projectDetail?.tasks || [];
  const taskColumns = ["todo", "in_progress", "review", "done"];
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FolderKanban className="h-6 w-6" /> المشاريع</h1>
        <Button onClick={openCreate} disabled={!canCreate("projects")} data-testid="button-add-project"><Plus className="ml-2 h-4 w-4" /> مشروع جديد</Button>
      </div>

      {!canCreate("projects") && limits && usage && (
        <UpgradePrompt type="limit" resource="المشاريع" current={usage.projects} limit={limits.projects} />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {["all", "not_started", "in_progress", "on_hold", "completed"].map((s) => (
          <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)}>
            {s === "all" ? "الكل" : statusLabels[s]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !projectsList.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد مشاريع. أنشئ مشروعك الأول!</CardContent></Card>
      ) : (
        <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsList.map((project) => (
            <Card key={project.id} className="hover-elevate cursor-pointer" onClick={() => setDetailOpen(project.id)} data-testid={`card-project-${project.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.clientName || "بدون عميل"}</p>
                  </div>
                  <Badge variant="secondary">{statusLabels[project.status || "not_started"]}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={priorityColors[project.priority || "medium"]}>{priorityLabels[project.priority || "medium"]}</span>
                  {project.deadline && <span className="text-muted-foreground">الموعد: {project.deadline}</span>}
                </div>
                <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(project)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(project.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <PaginationControls page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingProject ? "تعديل المشروع" : "إنشاء مشروع جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم المشروع *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-project-name" /></div>
            <div>
              <Label>العميل</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الأولوية</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>تاريخ البدء</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>الموعد النهائي</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <div><Label>الميزانية</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
              <span>{projectDetail?.name}</span>
              <Button size="sm" onClick={() => setTaskDialogOpen(true)} data-testid="button-add-task"><Plus className="ml-1 h-3 w-3" /> إضافة مهمة</Button>
            </DialogTitle>
          </DialogHeader>
          {tasks.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Progress value={progress} className="flex-1" />
              <span>{progress}% ({doneCount}/{tasks.length})</span>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {taskColumns.map((col) => (
              <div key={col} className="space-y-2">
                <h4 className="text-sm font-semibold text-center p-2 bg-muted rounded-md">{taskStatusLabels[col]}</h4>
                {tasks.filter((t) => t.status === col).map((task) => (
                  <Card key={task.id} className="text-sm" data-testid={`task-${task.id}`}>
                    <CardContent className="p-2 space-y-1">
                      <p className="font-medium text-xs">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                      <div className="flex items-center justify-between gap-1">
                        <Select value={task.status || "todo"} onValueChange={(v) => updateTaskMutation.mutate({ id: task.id, data: { status: v } })}>
                          <SelectTrigger className="h-6 text-xs w-auto"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(taskStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteTaskMutation.mutate(task.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة مهمة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>العنوان *</Label><Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} data-testid="input-task-title" /></div>
            <div><Label>الوصف</Label><Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
            <div>
              <Label>الأولوية</Label>
              <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>تاريخ الاستحقاق</Label><Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>إلغاء</Button>
            <Button onClick={() => createTaskMutation.mutate(taskForm)} disabled={createTaskMutation.isPending || !taskForm.title.trim()} data-testid="button-save-task">
              {createTaskMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذا المشروع وجميع مهامه؟</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
