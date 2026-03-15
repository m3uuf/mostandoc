import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50" dir="rtl">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">404 — الصفحة غير موجودة</h1>
          <p className="mt-2 text-sm text-gray-600 mb-6">
            الصفحة اللي تدور عليها مو موجودة أو تم نقلها.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            العودة للصفحة الرئيسية ←
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
