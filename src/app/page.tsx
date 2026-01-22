"use client";
import React from "react";
import { ChatAI } from "@/components/features/chat/web/conversation/ChatAI";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function ChatUI() {
  return (
    <ThemeProvider>
      <ChatAI />
    </ThemeProvider>
  );
}
