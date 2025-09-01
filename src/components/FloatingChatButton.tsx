import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const FloatingChatButton = () => {
  return (
    <a
      href="https://wa.me/8619589456744"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Live Chat on WhatsApp"
      className="fixed bottom-4 right-4 z-50"
    >
      <Button size="sm" className="shadow-lg">
        <MessageSquare className="h-4 w-4 mr-2" />
        Live Chat
      </Button>
    </a>
  );
};

export default FloatingChatButton;
