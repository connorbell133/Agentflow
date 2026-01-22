"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Profile } from '@/lib/supabase/types';
import { NamePopup } from '@/components/shared/menus/UserMenu';

interface ChangelogViewerProps {
    content: string;
    user: Profile | null;
}

export const ChangelogViewer: React.FC<ChangelogViewerProps> = ({ content, user }) => {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-8">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 font-semibold">
                            <span className="text-lg">AgentFlow</span>
                        </Link>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-medium">Changelog</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="gap-2 hidden sm:flex">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Chat
                            </Button>
                        </Link>
                        {user && (
                            <div className="relative">
                                <NamePopup user={user} isOpen={true} location="bottom" />
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <article className="prose dark:prose-invert max-w-none 
          prose-headings:text-foreground 
          prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-8 prose-h1:tracking-tight
          prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-b prose-h2:border-border prose-h2:pb-2
          prose-h3:text-xl prose-h3:font-medium prose-h3:mt-8 prose-h3:mb-4
          prose-p:text-muted-foreground prose-p:leading-7
          prose-li:text-muted-foreground
          prose-strong:text-foreground prose-strong:font-semibold
          prose-ul:my-6 prose-li:my-2
        ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                </article>
            </main>
        </div>
    );
};

