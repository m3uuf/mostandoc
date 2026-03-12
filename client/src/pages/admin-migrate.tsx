import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Users, UserCheck, FileText, Building2, Copy, RefreshCw,
  AlertCircle, CheckCircle2, Play, Loader2, Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DataPreview {
  users: { total: number; email: number; google: number };
  clients: { total: number };
  userDocs: { total: number };
  clientDocs: { total: number };
  companyProfiles: { total: number };
  templates: { total: number };
}

interface MigrationState {
  phase: string;
  currentStep: string;
  processed: number;
  total: number;
  skipped: number;
  errors: string[];
  log: string[];
  startedAt?: string;
  finishedAt?: string;
}

const phaseLabels: Record<string, string> = {
  idle: "جاهز",
  users: "نقل المستخدمين...",
  clients: "نقل العملاء...",
  contracts: "نقل العقود...",
  profiles: "نقل الملفات...",
  done: "اكتمل",
  error: "خطأ",
};

const phaseColors: Record<string, string> = {
  idle: "secondary",
  users: "default",
  clients: "default",
  contracts: "default",
  profiles: "default",
  done: "default",
  error: "destructive",
};

export default function AdminMigratePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const logRef = useRef<HTMLDivElement>(null);
  const [polling, setPolling] = useState(false);

  const { data: preview } = useQuery<DataPreview>({
    queryKey: ["/api/admin/migrate/preview"],
  });

  const { data: migState, refetch: refetchState } = useQuery<MigrationState>({
    queryKey: ["/api/admin/migrate/state"],
    refetchInterval: polling ? 1500 : false,
  });

  const isRunning = migState && !["idle", "done", "error"].includes(migState.phase);

  useEffect(() => {
    if (isRunning) {
      setPolling(true);
    } else {
      setPolling(false);
    }
  }, [isRunning]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [migState?.log]);

  const runMutation = useMutation({
    mutationFn: (endpoint: string) => apiRequest("POST", endpoint),
    onSuccess: () => {
      setPolling(true);
      setTimeout(() => refetchState(), 500);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/migrate/reset"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/migrate/state"] });
      toast({ title: "تم إعادة التعيين" });
    },
  });

  const copyLog = () => {
    const text = migState?.log?.join("\n") || "";
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  };

  const progressPct = migState && migState.total > 0
    ? Math.round((migState.processed / migState.total) * 100)
    : 0;

  const steps = [
    {
      id: "users",
      label: "نقل المستخدمين",
      description: `${preview?.users?.total ?? 395} مستخدم — إنشاء حسابات وإرسال إيميل إعادة تعيين`,
      icon: Users,
      endpoint: "/api/admin/migrate/users",
      color: "text-blue-500",
    },
    {
      id: "clients",
      label: "نقل العملاء",
      description: `${preview?.clients?.total ?? 109} عميل — ربط بحساباتهم`,
      icon: UserCheck,
      endpoint: "/api/admin/migrate/clients",
      color: "text-green-500",
    },
    {
      id: "contracts",
      label: "نقل العقود والمستندات",
      description: `${(preview?.userDocs?.total ?? 364) + (preview?.clientDocs?.total ?? 153)} مستند — من المنصة القديمة`,
      icon: FileText,
      endpoint: "/api/admin/migrate/contracts",
      color: "text-orange-500",
    },
    {
      id: "profiles",
      label: "نقل ملفات الشركات",
      description: `${preview?.companyProfiles?.total ?? 6} ملف شركة`,
      icon: Building2,
      endpoint: "/api/admin/migrate/profiles",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-7 w-7 text-primary" />
            أداة نقل البيانات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            نقل بيانات Bubble.io إلى مستندك — لمرة واحدة فقط
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchState()}>
            <RefreshCw className="h-4 w-4 ml-1" />
            تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetMutation.mutate()}
            disabled={isRunning || resetMutation.isPending}
          >
            إعادة تعيين
          </Button>
        </div>
      </div>

      {/* Stats Preview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Users className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{preview?.users?.total ?? "—"}</div>
            <div className="text-xs text-muted-foreground">مستخدم</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <UserCheck className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{preview?.clients?.total ?? "—"}</div>
            <div className="text-xs text-muted-foreground">عميل</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <FileText className="h-6 w-6 text-orange-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">
              {preview ? (preview.userDocs.total + preview.clientDocs.total) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">مستند وعقد</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Building2 className="h-6 w-6 text-purple-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{preview?.companyProfiles?.total ?? "—"}</div>
            <div className="text-xs text-muted-foreground">ملف شركة</div>
          </CardContent>
        </Card>
      </div>

      {/* Migration State */}
      {migState && migState.phase !== "idle" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                {migState.phase === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {migState.phase === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                {migState.currentStep || phaseLabels[migState.phase] || migState.phase}
              </CardTitle>
              <Badge variant={phaseColors[migState.phase] as any}>
                {phaseLabels[migState.phase] || migState.phase}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {migState.total > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>تم معالجة {migState.processed} من {migState.total}</span>
                  <span>{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="text-green-600">✅ تم: {migState.processed}</span>
                  <span className="text-yellow-600">⏭ تخطي: {migState.skipped}</span>
                  <span className="text-red-600">❌ أخطاء: {migState.errors.length}</span>
                </div>
              </div>
            )}

            {migState.log && migState.log.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-muted-foreground">السجل</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={copyLog}>
                    <Copy className="h-3 w-3 ml-1" />
                    نسخ
                  </Button>
                </div>
                <div
                  ref={logRef}
                  className="bg-muted rounded-md p-3 text-xs font-mono space-y-0.5 max-h-48 overflow-y-auto text-right"
                  dir="rtl"
                >
                  {migState.log.slice(-50).map((line, i) => (
                    <div key={i} className={
                      line.includes("❌") ? "text-red-500" :
                      line.includes("✅") ? "text-green-600" :
                      line.includes("⚠️") ? "text-yellow-600" :
                      "text-muted-foreground"
                    }>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {migState.errors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-500 mb-1">الأخطاء ({migState.errors.length})</p>
                <div className="bg-red-50 dark:bg-red-950/20 rounded-md p-2 text-xs space-y-0.5 max-h-32 overflow-y-auto">
                  {migState.errors.slice(0, 20).map((err, i) => (
                    <div key={i} className="text-red-600">{err}</div>
                  ))}
                  {migState.errors.length > 20 && (
                    <div className="text-red-400">... و{migState.errors.length - 20} خطأ آخر</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground">مراحل النقل</h2>
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isThisRunning = migState?.phase === step.id;
          const isAnyRunning = isRunning;

          return (
            <Card key={step.id} className={isThisRunning ? "border-primary" : ""}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg bg-muted`}>
                      <Icon className={`h-5 w-5 ${step.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{step.label}</span>
                        <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => runMutation.mutate(step.endpoint)}
                    disabled={isAnyRunning || runMutation.isPending}
                    data-testid={`button-migrate-${step.id}`}
                  >
                    {isThisRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    ) : (
                      <Play className="h-4 w-4 ml-1" />
                    )}
                    {isThisRunning ? "جارٍ النقل..." : "ابدأ"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      <div className="text-xs text-muted-foreground space-y-1 rounded-lg bg-muted p-3">
        <p className="font-medium text-foreground mb-2">⚠️ ملاحظات مهمة</p>
        <p>• نفّذ المراحل بالترتيب: المستخدمون أولاً، ثم العملاء، ثم العقود، ثم الملفات</p>
        <p>• المستخدمون الموجودون مسبقاً سيُتخطَّون دون أي تغيير</p>
        <p>• كل مستخدم جديد سيتلقى إيميل لتعيين كلمة مرور جديدة</p>
        <p>• هذه الأداة مخصصة للاستخدام مرة واحدة فقط عند النقل</p>
      </div>
    </div>
  );
}
