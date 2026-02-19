import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ page, totalPages, total, limit, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap px-2 py-3" data-testid="pagination-controls">
      <span className="text-sm text-muted-foreground" data-testid="text-pagination-info">
        عرض {start} - {end} من {total}
      </span>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => onPageChange(1)} data-testid="button-first-page">
          <ChevronsRight className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)} data-testid="button-prev-page">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm px-2 min-w-[80px] text-center" data-testid="text-page-number">
          {page} / {totalPages}
        </span>
        <Button size="icon" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} data-testid="button-next-page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} data-testid="button-last-page">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
