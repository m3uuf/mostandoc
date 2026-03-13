import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, PenTool, CreditCard, TrendingUp, UserPlus, FileCheck, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminStats {
  users: number;
  activeUsers: number;
  suspendedUsers: number;
  clients: number;
  contracts: number;
  invoices: number;
  projects: number;
  profiles: number;
  newUsersToday: number;
  newUsersWeek: number;
  documents: number;
  documentsSent: number;
  documentsSigned: number;
  signaturesToday: number;
  signaturesWeek: number;
  signaturesMonth: number;
  monthlyRevenue: number;
}

interface GrowthData {
  month: string;
  users: number;
  documents: number;
  signatures: number;
  revenue: number;
}

function StatCard({ title, value, icon: Icon, description, color }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: growth } = useQuery<GrowthData[]>({
    queryKey: ["/api/admin/stats/growth"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">نظرة عامة</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const s = stats || {} as AdminStats;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">نظرة عامة</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المستخدمين" value={s.users || 0} icon={Users} description={`نشط: ${s.activeUsers || 0} • معلق: ${s.suspendedUsers || 0}`} color="bg-blue-600" />
        <StatCard title="مستخدمون جدد" value={s.newUsersToday || 0} icon={UserPlus} description={`هذا الأسبوع: ${s.newUsersWeek || 0}`} color="bg-green-600" />
        <StatCard title="المستندات" value={s.documents || 0} icon={FileText} description={`مرسلة: ${s.documentsSent || 0} • موقعة: ${s.documentsSigned || 0}`} color="bg-purple-600" />
        <StatCard title="التوقيعات" value={s.signaturesMonth || 0} icon={PenTool} description={`اليوم: ${s.signaturesToday || 0} • الأسبوع: ${s.signaturesWeek || 0}`} color="bg-orange-600" />
        <StatCard title="العملاء" value={s.clients || 0} icon={Users} color="bg-teal-600" />
        <StatCard title="العقود" value={s.contracts || 0} icon={FileCheck} color="bg-indigo-600" />
        <StatCard title="الفواتير" value={s.invoices || 0} icon={CreditCard} color="bg-amber-600" />
        <StatCard title="الإيرادات الشهرية" value={`${s.monthlyRevenue || 0} ر.س`} icon={TrendingUp} color="bg-emerald-600" />
      </div>

      {/* Growth Charts */}
      {growth && growth.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                نمو المستخدمين والمستندات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" name="مستخدمون" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="documents" name="مستندات" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                الإيرادات الشهرية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" name="الإيرادات (ر.س)" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
                  <Line type="monotone" dataKey="signatures" name="التوقيعات" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
