import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  Users, FileText, PenTool, TrendingUp, CreditCard, Briefcase,
  UserCheck, FileCheck, Clock, AlertCircle, Receipt,
} from "lucide-react";

interface AnalyticsData {
  summary: {
    total_users: number;
    new_users_30d: number;
    new_users_7d: number;
    new_users_today: number;
    suspended_users: number;
    verified_users: number;
    total_documents: number;
    signed_documents: number;
    sent_documents: number;
    draft_documents: number;
    new_documents_30d: number;
    total_signatures: number;
    signatures_30d: number;
    signatures_7d: number;
    total_clients: number;
    new_clients_30d: number;
    total_invoices: number;
    paid_invoices: number;
    pending_invoices: number;
    overdue_invoices: number;
    total_projects: number;
    active_projects: number;
    total_profiles: number;
    paid_subscriptions: number;
  };
  dailySignups: { date: string; count: number }[];
  dailyDocuments: { date: string; count: number }[];
  dailySignatures: { date: string; count: number }[];
  topUsers: { first_name: string; last_name: string; email: string; doc_count: number }[];
  docTypes: { doc_type: string; count: number }[];
}

const COLORS = ["#E8752A", "#3B5FE5", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: number | string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">{typeof value === "number" ? value.toLocaleString("ar-SA") : value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
  });

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">التحليلات والإحصائيات</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const s = data.summary;
  const verificationRate = s.total_users > 0 ? Math.round((s.verified_users / s.total_users) * 100) : 0;

  const docTypeLabels: Record<string, string> = {
    text: "نصي",
    pdf: "PDF",
    template: "قالب",
    upload: "مرفوع",
  };

  const pieData = data.docTypes.map((d) => ({
    name: docTypeLabels[d.doc_type] || d.doc_type || "أخرى",
    value: Number(d.count),
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <TrendingUp className="h-6 w-6" />
        التحليلات والإحصائيات
      </h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard title="إجمالي المستخدمين" value={Number(s.total_users)} sub={`+${s.new_users_today} اليوم`} icon={Users} color="bg-blue-500" />
        <StatCard title="مستخدمون جدد (30 يوم)" value={Number(s.new_users_30d)} sub={`${s.new_users_7d} هذا الأسبوع`} icon={UserCheck} color="bg-emerald-500" />
        <StatCard title="نسبة التفعيل" value={`${verificationRate}%`} sub={`${s.verified_users} من ${s.total_users}`} icon={UserCheck} color="bg-teal-500" />
        <StatCard title="موقوفون" value={Number(s.suspended_users)} icon={AlertCircle} color="bg-red-500" />

        <StatCard title="إجمالي المستندات" value={Number(s.total_documents)} sub={`+${s.new_documents_30d} هذا الشهر`} icon={FileText} color="bg-orange-500" />
        <StatCard title="المستندات الموقعة" value={Number(s.signed_documents)} icon={FileCheck} color="bg-green-500" />
        <StatCard title="بانتظار التوقيع" value={Number(s.sent_documents)} icon={Clock} color="bg-yellow-500" />
        <StatCard title="مسودات" value={Number(s.draft_documents)} icon={FileText} color="bg-gray-500" />

        <StatCard title="إجمالي التوقيعات" value={Number(s.total_signatures)} sub={`${s.signatures_30d} هذا الشهر`} icon={PenTool} color="bg-indigo-500" />
        <StatCard title="العملاء" value={Number(s.total_clients)} sub={`+${s.new_clients_30d} هذا الشهر`} icon={Briefcase} color="bg-purple-500" />
        <StatCard title="الفواتير" value={Number(s.total_invoices)} sub={`${s.paid_invoices} مدفوعة`} icon={Receipt} color="bg-cyan-500" />
        <StatCard title="اشتراكات مدفوعة" value={Number(s.paid_subscriptions)} icon={CreditCard} color="bg-pink-500" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Signups */}
        <Card>
          <CardHeader><CardTitle className="text-base">التسجيلات اليومية (30 يوم)</CardTitle></CardHeader>
          <CardContent>
            {data.dailySignups.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.dailySignups}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip labelFormatter={formatDate} formatter={(v: number) => [v, "مستخدم"]} />
                  <Area type="monotone" dataKey="count" stroke="#3B5FE5" fill="#3B5FE5" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* Daily Documents */}
        <Card>
          <CardHeader><CardTitle className="text-base">المستندات اليومية (30 يوم)</CardTitle></CardHeader>
          <CardContent>
            {data.dailyDocuments.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.dailyDocuments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip labelFormatter={formatDate} formatter={(v: number) => [v, "مستند"]} />
                  <Bar dataKey="count" fill="#E8752A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Signatures */}
        <Card>
          <CardHeader><CardTitle className="text-base">التوقيعات اليومية (30 يوم)</CardTitle></CardHeader>
          <CardContent>
            {data.dailySignatures.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.dailySignatures}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip labelFormatter={formatDate} formatter={(v: number) => [v, "توقيع"]} />
                  <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        {/* Document Types */}
        <Card>
          <CardHeader><CardTitle className="text-base">أنواع المستندات</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "مستند"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoices Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">حالة الفواتير</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "مدفوعة", value: Number(s.paid_invoices), color: "bg-green-500", total: Number(s.total_invoices) },
                { label: "معلقة", value: Number(s.pending_invoices), color: "bg-yellow-500", total: Number(s.total_invoices) },
                { label: "متأخرة", value: Number(s.overdue_invoices), color: "bg-red-500", total: Number(s.total_invoices) },
              ].map((item) => {
                const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">{item.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader><CardTitle className="text-base">أكثر المستخدمين نشاطاً</CardTitle></CardHeader>
          <CardContent>
            {data.topUsers.length > 0 ? (
              <div className="space-y-2">
                {data.topUsers.filter(u => Number(u.doc_count) > 0).slice(0, 8).map((u, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary">{u.doc_count} مستند</span>
                  </div>
                ))}
                {data.topUsers.filter(u => Number(u.doc_count) > 0).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">لا توجد بيانات</p>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
