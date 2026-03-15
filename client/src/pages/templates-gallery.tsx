import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EDITOR_TEMPLATES, type EditorTemplate } from "@/components/editor/editor-templates";
import {
  LayoutTemplate, Eye, ArrowLeft, Loader2, FileText, Handshake, ReceiptText,
  Sparkles, Lock,
} from "lucide-react";
const logoIcon = "/favicon.png";

const categoryLabels: Record<string, string> = {
  all: "الكل",
  contract: "عقود",
  document: "مستندات",
  proposal: "عروض أسعار",
};

const categoryColors: Record<string, string> = {
  contract: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  document: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  proposal: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const categoryIcons: Record<string, typeof FileText> = {
  contract: Handshake,
  document: FileText,
  proposal: ReceiptText,
};

interface Props {
  embedded?: boolean;
  [key: string]: any;
}

export default function TemplatesGallery({ embedded }: Props) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [previewTemplate, setPreviewTemplate] = useState<EditorTemplate | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (!embedded) {
      document.title = "قوالب مستندك - عقود وعروض أسعار ومستندات جاهزة للاستخدام";
    }
  }, [embedded]);

  const filtered = filter === "all"
    ? EDITOR_TEMPLATES.filter((t) => t.id !== "blank")
    : EDITOR_TEMPLATES.filter((t) => t.category === filter);

  const handleUseTemplate = async (template: EditorTemplate) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setCreating(template.id);
    try {
      const res = await apiRequest("POST", "/api/documents", {
        title: template.label,
        docType: "text",
        content: template.getContent(),
      });
      const doc = await res.json();
      toast({ title: `تم إنشاء "${template.label}"` });
      navigate(`/dashboard/documents/text/${doc.id}`);
    } catch {
      toast({ title: "فشل إنشاء المستند", variant: "destructive" });
    } finally {
      setCreating(null);
    }
  };

  const content = (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <LayoutTemplate className="h-7 w-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">قوالب جاهزة</h1>
        </div>
        <p className="text-muted-foreground max-w-lg mx-auto">
          اختر من مجموعة قوالب احترافية لعقودك ومستنداتك وعروض أسعارك. عدّل القالب حسب احتياجك وأرسله لعميلك.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {Object.entries(categoryLabels).map(([key, label]) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key)}
            className="rounded-full"
          >
            {label}
            {key !== "all" && (
              <span className="mr-1 text-xs opacity-70">
                ({EDITOR_TEMPLATES.filter((t) => t.category === key).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((template) => {
          const CatIcon = categoryIcons[template.category] || FileText;
          return (
            <Card
              key={template.id}
              className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/30"
              onClick={() => setPreviewTemplate(template)}
            >
              <CardContent className="p-5 space-y-3">
                {/* Icon + Category */}
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${template.color}15` }}
                  >
                    <template.icon className="h-5 w-5" style={{ color: template.color }} />
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${categoryColors[template.category]}`}>
                    <CatIcon className="h-3 w-3 ml-1" />
                    {categoryLabels[template.category]}
                  </Badge>
                </div>

                {/* Title + Description */}
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {template.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewTemplate(template);
                    }}
                  >
                    <Eye className="h-3 w-3 ml-1" />
                    معاينة
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8"
                    disabled={creating === template.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(template);
                    }}
                  >
                    {creating === template.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : !user ? (
                      <>
                        <Lock className="h-3 w-3 ml-1" />
                        سجّل لتستخدم
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 ml-1" />
                        استخدم
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* SEO Text (public only) */}
      {!embedded && !user && (
        <div className="text-center space-y-3 pt-8 pb-4">
          <div className="inline-flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            سجّل مجاناً لاستخدام القوالب وتعديلها وإرسالها لعملائك
          </div>
          <div>
            <Button size="lg" onClick={() => navigate("/auth")} className="rounded-full px-8">
              ابدأ الآن مجاناً
            </Button>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <previewTemplate.icon className="h-5 w-5" style={{ color: previewTemplate.color }} />
                  {previewTemplate.label}
                  <Badge variant="secondary" className={`text-[10px] mr-2 ${categoryColors[previewTemplate.category]}`}>
                    {categoryLabels[previewTemplate.category]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>

              {/* Content Preview */}
              <div
                className="border rounded-lg p-6 bg-white dark:bg-zinc-950 prose prose-sm max-w-none text-right"
                style={{ direction: "rtl", lineHeight: 1.8, fontSize: "13px" }}
                dangerouslySetInnerHTML={{ __html: previewTemplate.getContent() }}
              />

              {/* Action */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  إغلاق
                </Button>
                <Button
                  disabled={creating === previewTemplate.id}
                  onClick={() => handleUseTemplate(previewTemplate)}
                >
                  {creating === previewTemplate.id ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : !user ? (
                    <>
                      <Lock className="h-4 w-4 ml-2" />
                      سجّل لتستخدم هذا القالب
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 ml-2" />
                      استخدم هذا القالب
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // Embedded mode (inside dashboard sidebar)
  if (embedded) {
    return <div className="p-4 md:p-6">{content}</div>;
  }

  // Public mode (standalone page)
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Public Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src={logoIcon} alt="مستندك" className="h-7 w-7" />
            <span className="font-bold text-lg">مستندك</span>
          </a>
          <div className="flex items-center gap-2">
            {user ? (
              <Button size="sm" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4 ml-1" />
                لوحة التحكم
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => navigate("/auth")}>
                  تسجيل الدخول
                </Button>
                <Button size="sm" onClick={() => navigate("/auth")}>
                  ابدأ مجاناً
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {content}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} مستندك - جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}
