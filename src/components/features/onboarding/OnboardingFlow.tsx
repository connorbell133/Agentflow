'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth/client-helpers';
import { useRouter } from 'next/navigation';
import { ProfileSetup } from './ProfileSetup';
import { OrganizationSetup } from './OrganizationSetup';
import { getProfile } from '@/actions/auth/profile';

type OnboardingStep = 'profile' | 'organization' | 'complete';

export function OnboardingFlow() {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile');
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (isPending || !user?.id) return;

      try {
        const result = await getProfile(user.id);

        if (result.success && result.data) {
          // If signup is already complete, redirect to main app
          if (result.data.signup_complete) {
            router.push('/');
            return;
          }
        }

        // Skip profile setup since we get name from signup
        // Go directly to organization setup
        setCurrentStep('organization');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [isPending, user?.id, router]);

  const handleProfileComplete = () => {
    setCurrentStep('organization');
  };

  const handleOrganizationComplete = () => {
    setCurrentStep('complete');
    // Redirect to main app after a brief delay with hard refresh
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  // Loading state
  if (isPending || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    router.push('/sign-in');
    return null;
  }

  // Completion state
  if (currentStep === 'complete') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <svg
              className="h-8 w-8 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Welcome to AgentFlow!</h2>
          <p className="text-muted-foreground">
            Your account is all set up. Redirecting you to the app...
          </p>
        </div>
      </div>
    );
  }

  // Render current step
  switch (currentStep) {
    case 'profile':
      return <ProfileSetup onComplete={handleProfileComplete} />;
    case 'organization':
      return <OrganizationSetup onComplete={handleOrganizationComplete} />;
    default:
      return null;
  }
}
