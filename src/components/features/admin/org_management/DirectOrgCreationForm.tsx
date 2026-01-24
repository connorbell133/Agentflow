'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Profile } from '@/lib/supabase/types';
import { createOrg } from '@/actions/organization/organizations';
import { getUserOrgStatus } from '@/actions/organization/user-org-status';
import { createProfile, getProfile } from '@/actions/auth/profile';
import { z } from 'zod';

interface DirectOrgCreationFormProps {
  user: Profile;
  onSuccess: (orgName: string) => void;
}

const orgNameSchema = z
  .string()
  .trim()
  .min(3, 'Organization name must be at least 3 characters')
  .max(50, 'Organization name too long (max 50 characters)')
  .regex(/^[a-zA-Z0-9\s-]+$/, 'Only letters, numbers, spaces, and hyphens allowed');

export function DirectOrgCreationForm({ user, onSuccess }: DirectOrgCreationFormProps) {
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string>('');
  const [hasOrg, setHasOrg] = useState(false);

  // Check if user already has an organization
  const checkUserOrg = useCallback(async () => {
    if (!user?.id) return;

    setIsChecking(true);
    try {
      const orgStatus = await getUserOrgStatus(user.id);
      if (orgStatus.success && orgStatus.data?.hasOrganization) {
        setHasOrg(true);
      }
    } catch (error) {
      console.error('Error checking user org status:', error);
    } finally {
      setIsChecking(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkUserOrg();
  }, [checkUserOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user?.id) {
      setError('User authentication required');
      return;
    }

    // Validate organization name
    const validation = orgNameSchema.safeParse(orgName);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Invalid organization name');
      return;
    }

    setIsLoading(true);

    try {
      // Check if profile exists, if not create it
      const profileResult = await getProfile(user.id);
      if (!profileResult.success || !profileResult.data) {
        // Profile doesn't exist, create it with data from user metadata
        const createResult = await createProfile(user.id, {
          fullName: user.full_name || 'User',
          email: user.email,
          avatarUrl: user.avatar_url ?? undefined,
          signupComplete: false, // Will be marked true after org setup
        });

        if (!createResult.success) {
          setError('Failed to create user profile. Please try again.');
          return;
        }
      }

      // Create organization
      const result = await createOrg(validation.data, user.id);

      if (result && result.length > 0) {
        // Note: The database trigger automatically adds the owner to org_map
        // with role='owner', so we don't need to call addUserToOrg here

        // Success - notify parent component
        onSuccess(validation.data);
      } else {
        setError('Failed to create organization. Please try again.');
      }
    } catch (error) {
      console.error('Organization creation error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Checking organization status...</p>
        </div>
      </div>
    );
  }

  if (hasOrg) {
    return (
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-green-200 bg-green-100 dark:border-green-800 dark:bg-green-900/30">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
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
              <h3 className="text-xl font-bold text-foreground">
                You Already Have an Organization
              </h3>
              <p className="text-muted-foreground">
                You&apos;re already part of an organization. Each user can only belong to one
                organization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Create Your Organization</CardTitle>
        <CardDescription>
          Choose a name for your organization. You&apos;ll be able to invite team members and
          configure settings later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border-destructive/20 rounded-md border p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-sm font-medium">
              Organization Name *
            </Label>
            <Input
              id="orgName"
              type="text"
              value={orgName}
              onChange={e => {
                setOrgName(e.target.value);
                setError('');
              }}
              placeholder="e.g. Acme Corporation"
              className={error ? 'border-destructive' : ''}
              maxLength={50}
              required
              disabled={isLoading}
              data-testid="org-name-input"
            />
            <p className="text-xs text-muted-foreground">
              Choose a name that represents your team or company
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="mb-2 text-sm font-medium text-foreground">What happens next?</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Your organization will be created immediately</p>
              <p>• You&apos;ll become the organization administrator</p>
              <p>• You can invite team members and configure AI models</p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !orgName.trim()}
            className="w-full"
            data-testid="create-org-button"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Creating Organization...
              </>
            ) : (
              'Create Organization'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
