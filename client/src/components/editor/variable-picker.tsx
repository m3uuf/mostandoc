import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { SMART_VARIABLES, type SmartVariableDefinition } from "./variable-extension";
import { User, Building2, FileText, Search } from "lucide-react";
import type { Editor } from "@tiptap/react";

const GROUP_ICONS = {
  client: User,
  company: Building2,
  document: FileText,
};

const GROUP_COLORS = {
  client: "#3B82F6",
  company: "#10B981",
  document: "#F59E0B",
};

interface VariablePickerProps {
  editor: Editor;
  children: React.ReactNode;
}

export function VariablePicker({ editor, children }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? SMART_VARIABLES.filter(
        (v) => v.label.includes(search) || v.name.includes(search)
      )
    : SMART_VARIABLES;

  // Group variables
  const groups = Object.entries(
    filtered.reduce<Record<string, SmartVariableDefinition[]>>((acc, v) => {
      if (!acc[v.group]) acc[v.group] = [];
      acc[v.group].push(v);
      return acc;
    }, {})
  );

  const insertVar = (name: string) => {
    (editor.commands as any).insertVariable(name);
    editor.commands.focus();
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-0"
        dir="rtl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search */}
        <div className="p-2 border-b relative">
          <Search className="h-3.5 w-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن متغير..."
            className="h-8 text-xs pr-8 border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-lg"
            autoFocus
          />
        </div>

        {/* Variables list */}
        <div className="max-h-64 overflow-y-auto py-1">
          {groups.map(([groupKey, vars]) => {
            const Icon = GROUP_ICONS[groupKey as keyof typeof GROUP_ICONS];
            const color = GROUP_COLORS[groupKey as keyof typeof GROUP_COLORS];
            const groupLabel = vars[0]?.groupLabel || groupKey;
            return (
              <div key={groupKey}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <Icon className="h-3 w-3" style={{ color }} />
                  <span>{groupLabel}</span>
                </div>
                {vars.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => insertVar(v.name)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors text-right"
                  >
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono"
                      style={{
                        background: `${color}15`,
                        color,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {`{{${v.name}}}`}
                    </span>
                    <span className="text-xs text-muted-foreground">{v.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
          {groups.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              لا توجد نتائج
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
