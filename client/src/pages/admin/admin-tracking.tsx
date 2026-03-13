import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Code, Plus, Pencil, Trash2, BarChart3, Eye, EyeOff, Copy, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrackingScript {
  id: string;
  name: string;
  platform: string;
  trackingId: string | null;
  headCode: string | null;
  bodyCode: string | null;
  placement: string;
  isActive: boolean;
  createdAt: string;
}

const PLATFORMS = [
  { value: "google_analytics", label: "Google Analytics", icon: "📊", idLabel: "Measurement ID", idPlaceholder: "G-XXXXXXXXXX" },
  { value: "google_tag_manager", label: "Google Tag Manager", icon: "🏷️", idLabel: "Container ID", idPlaceholder: "GTM-XXXXXXX" },
  { value: "meta_pixel", label: "Meta Pixel (Facebook)", icon: "📘", idLabel: "Pixel ID", idPlaceholder: "123456789012345" },
  { value: "snapchat_pixel", label: "Snapchat Pixel", icon: "👻", idLabel: "Pixel ID", idPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx" },
  { value: "tiktok_pixel", label: "TikTok Pixel", icon: "🎵", idLabel: "Pixel ID", idPlaceholder: "XXXXXXXXXXXXXXXXX" },
  { value: "twitter_pixel", label: "X (Twitter) Pixel", icon: "✖️", idLabel: "Pixel ID", idPlaceholder: "xxxxx" },
  { value: "linkedin_pixel", label: "LinkedIn Insight Tag", icon: "💼", idLabel: "Partner ID", idPlaceholder: "123456" },
  { value: "hotjar", label: "Hotjar", icon: "🔥", idLabel: "Site ID", idPlaceholder: "1234567" },
  { value: "custom", label: "سكربت مخصص", icon: "⚙️", idLabel: null, idPlaceholder: null },
];

const PLACEMENTS = [
  { value: "all", label: "جميع الصفحات" },
  { value: "landing_only", label: "الصفحة الرئيسية فقط" },
  { value: "dashboard_only", label: "لوحة التحكم فقط" },
  { value: "public_profile", label: "الصفحات العامة فقط" },
];

function generateSnippet(platform: string, trackingId: string): { head: string; body: string } {
  switch (platform) {
    case "google_analytics":
      return {
        head: `<!-- Google Analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${trackingId}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${trackingId}');\n</script>`,
        body: "",
      };
    case "google_tag_manager":
      return {
        head: `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','${trackingId}');</script>`,
        body: `<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${trackingId}"\nheight="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`,
      };
    case "meta_pixel":
      return {
        head: `<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '${trackingId}');\nfbq('track', 'PageView');\n</script>\n<noscript><img height="1" width="1" style="display:none"\nsrc="https://www.facebook.com/tr?id=${trackingId}&ev=PageView&noscript=1"\n/></noscript>`,
        body: "",
      };
    case "snapchat_pixel":
      return {
        head: `<!-- Snapchat Pixel Code -->\n<script type='text/javascript'>\n(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()\n{a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};\na.queue=[];var s='script';r=t.createElement(s);r.async=!0;\nr.src=n;var u=t.getElementsByTagName(s)[0];\nu.parentNode.insertBefore(r,u);})(window,document,\n'https://sc-static.net/scevent.min.js');\nsnaptr('init', '${trackingId}', {\n'user_email': '__INSERT_USER_EMAIL__'\n});\nsnaptr('track', 'PAGE_VIEW');\n</script>`,
        body: "",
      };
    case "tiktok_pixel":
      return {
        head: `<!-- TikTok Pixel Code -->\n<script>\n!function (w, d, t) {\n  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};\n  ttq.load('${trackingId}');\n  ttq.page();\n}(window, document, 'ttq');\n</script>`,
        body: "",
      };
    case "twitter_pixel":
      return {
        head: `<!-- Twitter Pixel -->\n<script>\n!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);\n},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',\na=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');\ntwq('config','${trackingId}');\n</script>`,
        body: "",
      };
    case "linkedin_pixel":
      return {
        head: `<!-- LinkedIn Insight Tag -->\n<script type="text/javascript">\n_linkedin_partner_id = "${trackingId}";\nwindow._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];\nwindow._linkedin_data_partner_ids.push(_linkedin_partner_id);\n</script>\n<script type="text/javascript">\n(function(l) {\nif (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};\nwindow.lintrk.q=[]}\nvar s = document.getElementsByTagName("script")[0];\nvar b = document.createElement("script");\nb.type = "text/javascript";b.async = true;\nb.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";\ns.parentNode.insertBefore(b, s);})(window.lintrk);\n</script>\n<noscript>\n<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=${trackingId}&fmt=gif" />\n</noscript>`,
        body: "",
      };
    case "hotjar":
      return {
        head: `<!-- Hotjar Tracking Code -->\n<script>\n(function(h,o,t,j,a,r){\n  h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};\n  h._hjSettings={hjid:${trackingId},hjsv:6};\n  a=o.getElementsByTagName('head')[0];\n  r=o.createElement('script');r.async=1;\n  r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;\n  a.appendChild(r);\n})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');\n</script>`,
        body: "",
      };
    default:
      return { head: "", body: "" };
  }
}

export default function AdminTracking() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<TrackingScript | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("google_analytics");
  const [trackingId, setTrackingId] = useState("");
  const [headCode, setHeadCode] = useState("");
  const [bodyCode, setBodyCode] = useState("");
  const [placement, setPlacement] = useState("all");
  const [isActive, setIsActive] = useState(true);
  const [useCustomCode, setUseCustomCode] = useState(false);

  const { data: scripts = [], isLoading } = useQuery<TrackingScript[]>({
    queryKey: ["/api/admin/tracking-scripts"],
    queryFn: () => apiRequest("GET", "/api/admin/tracking-scripts").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/tracking-scripts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tracking-scripts"] });
      toast({ title: "تم إضافة كود التتبع بنجاح" });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/tracking-scripts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tracking-scripts"] });
      toast({ title: "تم تحديث كود التتبع" });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/tracking-scripts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tracking-scripts"] });
      toast({ title: "تم حذف كود التتبع" });
      setDeleteConfirm(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/tracking-scripts/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tracking-scripts"] });
    },
  });

  function openCreate() {
    setEditingScript(null);
    setName("");
    setPlatform("google_analytics");
    setTrackingId("");
    setHeadCode("");
    setBodyCode("");
    setPlacement("all");
    setIsActive(true);
    setUseCustomCode(false);
    setDialogOpen(true);
  }

  function openEdit(script: TrackingScript) {
    setEditingScript(script);
    setName(script.name);
    setPlatform(script.platform);
    setTrackingId(script.trackingId || "");
    setHeadCode(script.headCode || "");
    setBodyCode(script.bodyCode || "");
    setPlacement(script.placement);
    setIsActive(script.isActive);
    setUseCustomCode(script.platform === "custom" || !!script.headCode || !!script.bodyCode);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingScript(null);
  }

  function handleSave() {
    let finalHead = headCode;
    let finalBody = bodyCode;

    // Auto-generate snippet if not using custom code
    if (!useCustomCode && platform !== "custom" && trackingId) {
      const snippet = generateSnippet(platform, trackingId);
      finalHead = snippet.head;
      finalBody = snippet.body;
    }

    const data = {
      name: name || PLATFORMS.find(p => p.value === platform)?.label || "سكربت",
      platform,
      trackingId: trackingId || null,
      headCode: finalHead || null,
      bodyCode: finalBody || null,
      placement,
      isActive,
    };

    if (editingScript) {
      updateMutation.mutate({ id: editingScript.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const selectedPlatform = PLATFORMS.find(p => p.value === platform);
  const activeCount = scripts.filter(s => s.isActive).length;

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code className="h-6 w-6" />
            أكواد التتبع والسكربتات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة أكواد التتبع للمنصات الإعلانية والتحليلية
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة كود تتبع
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{scripts.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي السكربتات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">مفعّلة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
              <EyeOff className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{scripts.length - activeCount}</p>
              <p className="text-xs text-muted-foreground">معطّلة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scripts List */}
      {scripts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد أكواد تتبع</h3>
            <p className="text-muted-foreground mb-4">أضف أكواد التتبع لمنصات مثل Google Analytics أو Meta Pixel أو TikTok Pixel</p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة أول كود تتبع
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => {
            const p = PLATFORMS.find(pl => pl.value === script.platform);
            return (
              <Card key={script.id} className={!script.isActive ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p?.icon || "⚙️"}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{script.name}</h3>
                          <Badge variant={script.isActive ? "default" : "secondary"} className="text-xs">
                            {script.isActive ? "مفعّل" : "معطّل"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {PLACEMENTS.find(pl => pl.value === script.placement)?.label || "جميع الصفحات"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {p?.label || "سكربت مخصص"}
                          {script.trackingId && (
                            <span className="font-mono text-xs mr-2 bg-muted px-1.5 py-0.5 rounded" dir="ltr">
                              {script.trackingId}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={script.isActive}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: script.id, isActive: v })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(script)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(script.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Show code preview */}
                  {(script.headCode || script.bodyCode) && (
                    <div className="mt-3 space-y-2">
                      {script.headCode && (
                        <div className="relative">
                          <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-24 overflow-y-auto" dir="ltr">
                            {script.headCode.substring(0, 200)}{script.headCode.length > 200 ? "..." : ""}
                          </pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 left-1 h-7 w-7"
                            onClick={() => copyCode(script.headCode!, script.id + "-head")}
                          >
                            {copiedId === script.id + "-head" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              حذف كود التتبع
            </DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف هذا الكود؟ لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingScript ? "تعديل كود التتبع" : "إضافة كود تتبع جديد"}</DialogTitle>
            <DialogDescription>
              {editingScript ? "عدّل إعدادات كود التتبع" : "اختر المنصة وأدخل معرّف التتبع أو الكود المخصص"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Platform */}
            <div>
              <Label>المنصة</Label>
              <Select value={platform} onValueChange={(v) => {
                setPlatform(v);
                if (v === "custom") setUseCustomCode(true);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div>
              <Label>الاسم التعريفي</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedPlatform?.label || "اسم السكربت"}
              />
            </div>

            {/* Tracking ID — only for non-custom platforms */}
            {selectedPlatform?.idLabel && (
              <div>
                <Label>{selectedPlatform.idLabel}</Label>
                <Input
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder={selectedPlatform.idPlaceholder || ""}
                  dir="ltr"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  أدخل المعرّف فقط وسيتم توليد الكود تلقائياً، أو فعّل "كود مخصص" لإدخاله يدوياً
                </p>
              </div>
            )}

            {/* Custom Code Toggle */}
            {platform !== "custom" && (
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">استخدام كود مخصص</p>
                  <p className="text-xs text-muted-foreground">أدخل الكود يدوياً بدلاً من التوليد التلقائي</p>
                </div>
                <Switch checked={useCustomCode} onCheckedChange={setUseCustomCode} />
              </div>
            )}

            {/* Custom Code Fields */}
            {(useCustomCode || platform === "custom") && (
              <>
                <div>
                  <Label>كود الـ Head</Label>
                  <Textarea
                    value={headCode}
                    onChange={(e) => setHeadCode(e.target.value)}
                    placeholder="<!-- الكود الذي يُحقن في <head> -->"
                    dir="ltr"
                    className="font-mono text-xs min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">يُحقن قبل إغلاق {"</head>"}</p>
                </div>
                <div>
                  <Label>كود الـ Body</Label>
                  <Textarea
                    value={bodyCode}
                    onChange={(e) => setBodyCode(e.target.value)}
                    placeholder="<!-- الكود الذي يُحقن بعد فتح <body> -->"
                    dir="ltr"
                    className="font-mono text-xs min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">يُحقن بعد فتح {"<body>"} مباشرة (مثل noscript لـ GTM)</p>
                </div>
              </>
            )}

            <Separator />

            {/* Placement */}
            <div>
              <Label>مكان العرض</Label>
              <Select value={placement} onValueChange={setPlacement}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLACEMENTS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">مفعّل</p>
                <p className="text-xs text-muted-foreground">تفعيل أو تعطيل هذا الكود مباشرة</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || (!trackingId && !headCode && !bodyCode)}
            >
              {(createMutation.isPending || updateMutation.isPending) ? "جاري الحفظ..." : editingScript ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
