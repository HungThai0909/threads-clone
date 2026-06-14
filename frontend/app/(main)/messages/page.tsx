import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="flex-1 flex items-center justify-center h-full bg-background">
      <div className="text-center space-y-3">
        {/* Thay đổi màu xám cố định của Icon sang màu nhẹ của theme hiện tại */}
        <MessageCircle size={48} className="text-muted-foreground/40 mx-auto" />
        {/* text-foreground giúp chữ "Your messages" chuyển thành Đen (Light) / Trắng (Dark) */}
        <p className="text-foreground font-medium">Your messages</p>
        <p className="text-muted-foreground text-sm">Select a conversation or start a new one.</p>
      </div>
    </div>
  );
}