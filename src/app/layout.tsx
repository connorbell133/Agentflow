import type { Metadata } from 'next';
import { DM_Sans, Roboto_Mono, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { twMerge } from 'tailwind-merge';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeScript } from '@/components/shared/theme/ThemeScript';
import { ProfileCompletionProvider } from '@/providers/ProfileCompletionProvider';
import { ToastProvider } from '@/components/ui/toast';
import { BugReportButton } from '@/components/features/feedback/BugReportButton';
import * as Sentry from '@sentry/nextjs';

const dmSans = DM_Sans({ subsets: ['latin'] });
const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-roboto-mono' });
const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage-grotesque',
  weight: ['400'], // Regular weight
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // In CI environment without real Clerk keys, skip ClerkProvider to allow build
  const isCI = process.env.CI === 'true';
  const hasValidClerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_');

  const content = (
    <html lang="en" className="relative" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={twMerge(
          dmSans.className,
          robotoMono.variable,
          bricolageGrotesque.variable,
          'bg-[#EAEEFE] antialiased dark:bg-background'
        )}
      >
        <ProfileCompletionProvider>
          <ToastProvider>
            {children}
            <BugReportButton />
          </ToastProvider>
        </ProfileCompletionProvider>
      </body>
    </html>
  );

  // Only use ClerkProvider if we have valid keys (not in CI build)
  if (isCI && !hasValidClerkKey) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}

// Add or edit your "generateMetadata" to include the Sentry trace data:
export function generateMetadata(): Metadata {
  return {
    title: 'AgentFlow',
    description: 'AI Chat Management Platform',
    other: {
      ...Sentry.getTraceData(),
    },
  };
}
