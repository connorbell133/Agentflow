"use client";
import React from "react";
import { cn } from "@/utils/cn";
import { SignIn } from "@clerk/nextjs";
interface LayoutProps {
  user: any;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  links: any;
  children: React.ReactNode;
}

export const Layout = ({
  user,
  open,
  setOpen,
  links,
  children,
}: LayoutProps) => (
  <div
    className={cn(
      "flex flex-col md:flex-row flex-1 border overflow-hidden",
      "h-screen w-screen bg-background text-foreground"
    )}
  >
    {user ? (
      children // Render specific page content
    ) : (
      <div className="flex items-center">
        <SignIn />
      </div>
    )}
  </div>
);
