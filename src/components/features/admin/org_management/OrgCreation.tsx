'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Profile } from '@/lib/supabase/types';
import { DirectOrgCreationForm } from './DirectOrgCreationForm';

interface OrgCreationScreenProps {
  user: Profile;
}

type CreationStep = 'form' | 'success';

export default function OrgCreationScreen({ user }: OrgCreationScreenProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<CreationStep>('form');
  const [createdOrgName, setCreatedOrgName] = useState('');

  const handleOrgCreated = (orgName: string) => {
    setCreatedOrgName(orgName);
    setCurrentStep('success');
  };

  const handleGoToDashboard = () => {
    // Force a full page refresh to reload admin dashboard with new org
    window.location.href = '/admin';
  };

  const handleCreateAnother = () => {
    setCurrentStep('form');
    setCreatedOrgName('');
  };

  // Success State
  if (currentStep === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary">
              <svg
                className="h-10 w-10 text-primary-foreground"
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

            <div className="space-y-2">
              <Badge variant="outline" className="text-primary" data-testid="org-created-badge">
                Organization Created
              </Badge>
              <h1 className="text-3xl font-bold text-foreground" data-testid="org-success-title">
                {`Welcome to "${createdOrgName}"!`}
              </h1>
              <p className="text-muted-foreground" data-testid="org-success-message">
                {`Your organization has been successfully created and you've been added as the administrator.`}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{`What's Next?`}</CardTitle>
              <CardDescription>
                Start building your team and configuring your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></div>
                  <div>
                    <h4 className="font-medium text-foreground">Invite Team Members</h4>
                    <p className="text-sm text-muted-foreground">
                      Add colleagues to collaborate on projects
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></div>
                  <div>
                    <h4 className="font-medium text-foreground">Set Up Groups</h4>
                    <p className="text-sm text-muted-foreground">
                      Create groups to organize team access and permissions
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></div>
                  <div>
                    <h4 className="font-medium text-foreground">Configure AI Models</h4>
                    <p className="text-sm text-muted-foreground">
                      {`Add and configure AI agents for your team's workflow`}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex space-x-3">
                <Button onClick={handleGoToDashboard} className="flex-1">
                  Go to Admin Dashboard
                </Button>
                <Button onClick={handleCreateAnother} variant="outline">
                  Create Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Form State - Direct creation enabled (no approval needed)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="bg-primary/10 border-primary/20 mx-auto flex h-16 w-16 items-center justify-center rounded-full border">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Create Your Organization</h1>
            <p className="mx-auto max-w-md text-xl text-muted-foreground">
              Set up your organization to start collaborating with your team on AgentFlow
            </p>
          </div>
        </div>

        {/* Main Form Card - Direct Creation */}
        <DirectOrgCreationForm user={user} onSuccess={handleOrgCreated} />

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            By creating an organization, you agree to our{' '}
            <a href="/terms" className="text-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
