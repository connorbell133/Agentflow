'use client';
import React from 'react';
import { cn } from '@/utils/cn';
import { useRouter } from 'next/navigation';

interface LayoutProps {
  user: any;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  links: any;
  children: React.ReactNode;
}

export const Layout = ({ user, open, setOpen, links, children }: LayoutProps) => {
  const router = useRouter();

  React.useEffect(() => {
    if (!user) {
      router.push('/sign-in?redirect=/admin');
    }
  }, [user, router]);

  return (
    <div
      className={cn(
        'flex flex-1 flex-col overflow-hidden border md:flex-row',
        'h-screen w-screen bg-background text-foreground'
      )}
    >
      {user ? (
        children // Render specific page content
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Redirecting to sign in...</p>
        </div>
      )}
    </div>
  );
};
