"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

const DEMO_MESSAGES: ChatMessage[] = [
  { id: "1", user: "User123", message: "Great video!", timestamp: new Date() },
  { id: "2", user: "FitnessFan", message: "Love this workout", timestamp: new Date() },
];

interface ChatProps {
  channelId: string;
}

export function Chat({ channelId }: ChatProps) {
  const [message, setMessage] = useState("");

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b border-border/50 p-3">
          <MessageCircle className="h-4 w-4 text-reel" />
          <h3 className="font-medium">Live Chat</h3>
        </div>
        <div className="h-64 space-y-2 overflow-y-auto p-3">
          {DEMO_MESSAGES.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="font-medium text-reel">{msg.user}: </span>
              <span className="text-muted-foreground">{msg.message}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-border/50 p-3">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-md border border-border/50 bg-muted/50 px-3 py-1.5 text-sm"
          />
          <Button size="sm" className="bg-reel hover:bg-reel/90">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
