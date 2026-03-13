import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Users, FileSignature, Receipt, FileText, FolderKanban,
  Search, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResults {
  clients: Array<{ id: string; name: string; email: string | null; company: string | null; status: string | null }>;
  contracts: Array<{ id: string; title: string; status: string | null; value: string | null; currency: string | null }>;
  invoices: Array<{ id: string; invoiceNumber: string; status: string | null; total: string | null }>;
  documents: Array<{ id: string; title: string; status: string | null; docType: string | null; recipientName: string | null }>;
  projects: Array<{ id: string; name: string; status: string | null; priority: string | null }>;
}

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  prospect: "محتمل",
  draft: "مسودة",
  sent: "مرسل",
  signed: "موقّع",
  rejected: "مرفوض",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
  not_started: "لم يبدأ",
  in_progress: "قيد التنفيذ",
  on_hold: "معلّق",
  completed: "مكتمل",
  expired: "منتهي",
  terminated: "مُنهى",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600",
  signed: "bg-green-500/10 text-green-600",
  paid: "bg-green-500/10 text-green-600",
  completed: "bg-green-500/10 text-green-600",
  draft: "bg-gray-500/10 text-gray-600",
  not_started: "bg-gray-500/10 text-gray-600",
  sent: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-blue-500/10 text-blue-600",
  rejected: "bg-red-500/10 text-red-600",
  overdue: "bg-red-500/10 text-red-600",
  cancelled: "bg-red-500/10 text-red-600",
  expired: "bg-orange-500/10 text-orange-600",
  on_hold: "bg-yellow-500/10 text-yellow-600",
  prospect: "bg-purple-500/10 text-purple-600",
  inactive: "bg-gray-500/10 text-gray-500",
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [, navigate] = useLocation();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Clear query when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => setQuery(""), 200);
    }
  }, [open]);

  const { data: results, isLoading } = useQuery<SearchResults>({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: () =>
      fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`, { credentials: "include" })
        .then((r) => r.json()),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  const goTo = useCallback((path: string) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  const hasResults = results && (
    results.clients.length > 0 ||
    results.contracts.length > 0 ||
    results.invoices.length > 0 ||
    results.documents.length > 0 ||
    results.projects.length > 0
  );

  const totalResults = results
    ? results.clients.length + results.contracts.length + results.invoices.length + results.documents.length + results.projects.length
    : 0;

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-lg border bg-muted/50 hover:bg-muted transition-colors min-w-[200px]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-right">بحث...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex" dir="ltr">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command palette dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="ابحث في العملاء، العقود، الفواتير، المستندات، المشاريع..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[400px]">
          {/* Loading state */}
          {isLoading && debouncedQuery.length >= 2 && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
              جاري البحث...
            </div>
          )}

          {/* Empty state */}
          {!isLoading && debouncedQuery.length >= 2 && !hasResults && (
            <CommandEmpty>لا توجد نتائج لـ "{debouncedQuery}"</CommandEmpty>
          )}

          {/* Initial state */}
          {debouncedQuery.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              اكتب حرفين على الأقل للبحث
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <>
              {/* Results count */}
              <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                {totalResults} نتيجة
              </div>

              {/* Clients */}
              {results!.clients.length > 0 && (
                <CommandGroup heading="العملاء">
                  {results!.clients.map((client) => (
                    <CommandItem
                      key={`client-${client.id}`}
                      value={`client-${client.name}-${client.email}`}
                      onSelect={() => goTo("/dashboard/clients")}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Users className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {client.email}{client.company ? ` • ${client.company}` : ""}
                        </p>
                      </div>
                      {client.status && (
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[client.status] || ""}`}>
                          {STATUS_LABELS[client.status] || client.status}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Contracts */}
              {results!.contracts.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="العقود">
                    {results!.contracts.map((contract) => (
                      <CommandItem
                        key={`contract-${contract.id}`}
                        value={`contract-${contract.title}`}
                        onSelect={() => goTo("/dashboard/contracts")}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <FileSignature className="h-4 w-4 text-purple-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{contract.title}</p>
                          {contract.value && (
                            <p className="text-xs text-muted-foreground">
                              {parseFloat(contract.value).toLocaleString()} {contract.currency || "SAR"}
                            </p>
                          )}
                        </div>
                        {contract.status && (
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[contract.status] || ""}`}>
                            {STATUS_LABELS[contract.status] || contract.status}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Invoices */}
              {results!.invoices.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="الفواتير">
                    {results!.invoices.map((invoice) => (
                      <CommandItem
                        key={`invoice-${invoice.id}`}
                        value={`invoice-${invoice.invoiceNumber}`}
                        onSelect={() => goTo("/dashboard/invoices")}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <Receipt className="h-4 w-4 text-green-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">فاتورة #{invoice.invoiceNumber}</p>
                          {invoice.total && (
                            <p className="text-xs text-muted-foreground">
                              {parseFloat(invoice.total).toLocaleString()} SAR
                            </p>
                          )}
                        </div>
                        {invoice.status && (
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[invoice.status] || ""}`}>
                            {STATUS_LABELS[invoice.status] || invoice.status}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Documents */}
              {results!.documents.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="المستندات">
                    {results!.documents.map((doc) => (
                      <CommandItem
                        key={`doc-${doc.id}`}
                        value={`doc-${doc.title}`}
                        onSelect={() => goTo(doc.docType === "text" ? `/dashboard/documents/text/${doc.id}` : `/dashboard/documents/${doc.id}`)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-orange-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          {doc.recipientName && (
                            <p className="text-xs text-muted-foreground truncate">
                              المستلم: {doc.recipientName}
                            </p>
                          )}
                        </div>
                        {doc.status && (
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[doc.status] || ""}`}>
                            {STATUS_LABELS[doc.status] || doc.status}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Projects */}
              {results!.projects.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="المشاريع">
                    {results!.projects.map((project) => (
                      <CommandItem
                        key={`project-${project.id}`}
                        value={`project-${project.name}`}
                        onSelect={() => goTo("/dashboard/projects")}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <FolderKanban className="h-4 w-4 text-cyan-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{project.name}</p>
                        </div>
                        {project.status && (
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[project.status] || ""}`}>
                            {STATUS_LABELS[project.status] || project.status}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ للتنقل • Enter للاختيار • Esc للإغلاق</span>
        </div>
      </CommandDialog>
    </>
  );
}
