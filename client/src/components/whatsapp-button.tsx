import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "966558842227";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("مرحبًا، أحتاج مساعدة في مستندك")}`;

export default function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      aria-label="تواصل عبر واتساب"
    >
      <MessageCircle className="h-5 w-5 fill-current" />
      <span className="text-sm font-semibold hidden sm:inline group-hover:inline">
        تحتاج مساعدة؟
      </span>
    </a>
  );
}
