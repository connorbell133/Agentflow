'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useUser } from '@/hooks/auth/use-user';
import { usePathname, useRouter } from 'next/navigation';
import { getProfile } from '@/actions/auth/profile';
import { createLogger } from '@/lib/infrastructure/logger';
import { EXCLUDED_PATHS } from '@/constants/routes';

const logger = createLogger('ProfileCompletionProvider');

interface ProfileCompletionProviderProps {
  children: React.ReactNode;
}

export function ProfileCompletionProvider({ children }: ProfileCompletionProviderProps) {
  const { user, isUserLoaded: isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const lastCheckedUserId = useRef<string | null>(null);
  const primaryEmail = user?.email;

  useEffect(() => {
    const checkProfile = async () => {
      // Skip check if not loaded or no user
      if (!isLoaded || !user) {
        setIsChecking(false);
        return;
      }

      // Skip check for excluded paths
      if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
        setIsChecking(false);
        return;
      }

      // Avoid re-checking the same user repeatedly (prevents redirect loops)
      // If we've already validated this user and they have a profile, skip.
      // If they don't have a profile yet (e.g., returning from onboarding), re-check.
      if (lastCheckedUserId.current === user.id && hasProfile) {
        setIsChecking(false);
        return;
      }

      lastCheckedUserId.current = user.id;

      try {
        logger.info('Checking profile existence for user', { userId: user.id });
        const result = await getProfile(user.id);

        if (!result.success || !result.data) {
          logger.warn('Profile not found for authenticated user', {
            userId: user.id,
            email: user.email,
          });

          // Redirect to onboarding
          router.push('/onboarding');
          setIsChecking(false);
          return;
        }

        // Check if profile is complete
        if (!result.data.signup_complete) {
          logger.info('Profile exists but signup not complete', { userId: user.id });
          router.push('/onboarding');
          setIsChecking(false);
          return;
        }

        setHasProfile(true);
      } catch (error) {
        logger.error('Error checking profile', { error, userId: user.id });
        // In case of error, allow access but log it
        setHasProfile(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkProfile();
  }, [isLoaded, user?.id, user?.email, pathname, router, primaryEmail, hasProfile]);

  // Show loading state while checking
  if (
    isChecking ||
    (isLoaded && user && !hasProfile && !EXCLUDED_PATHS.some(path => pathname.startsWith(path)))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Verifying your profile...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
