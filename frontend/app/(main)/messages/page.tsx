import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="flex-1 flex items-center justify-center h-full bg-background">
      <div className="text-center space-y-3">
        <MessageCircle size={48} className="text-muted-foreground/40 mx-auto" />

        <p className="text-foreground font-medium">Your messages</p>
        <p className="text-muted-foreground text-sm">
          Select a conversation or start a new one.
        </p>
      </div>
    </div>
  );
}
