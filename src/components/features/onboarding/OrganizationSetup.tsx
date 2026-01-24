'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/lib/auth/client-helpers';
import { useInvites } from '@/hooks/organization/use-invites';
import { markSignupComplete, createProfile, getProfile } from '@/actions/auth/profile';
import { Invite } from '@/lib/supabase/types';
import { OnboardingSuccess } from './OnboardingSuccess';
import { DirectOrgCreationForm } from '@/components/features/admin/org_management/DirectOrgCreationForm';

interface OrganizationSetupProps {
  onComplete: () => void;
}

type SetupState = 'choosing' | 'success';
type UserType = 'creator' | 'member';

export function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const { fetchInvites, isLoading: invitesLoading, acceptInvite, denyInvite } = useInvites();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('join');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [setupState, setSetupState] = useState<SetupState>('choosing');
  const [userType, setUserType] = useState<UserType>('creator');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteDisplayData, setInviteDisplayData] = useState<
    Map<string, { orgName: string; groupName: string; inviterEmail: string }>
  >(new Map());
  const [invitesLoadingState, setInvitesLoadingState] = useState(true);
  const [acceptedInvites, setAcceptedInvites] = useState<Set<string>>(new Set());
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  // Fetch invites on component mount
  useEffect(() => {
    const loadInvites = async () => {
      if (user?.email) {
        setInvitesLoadingState(true);
        try {
          const result = await fetchInvites(user.email);
          setInvites(result.invites);
          setInviteDisplayData(result.displayData);
        } catch (error) {
          console.error('Error fetching invites:', error);
          setInvites([]);
          setInviteDisplayData(new Map());
        } finally {
          setInvitesLoadingState(false);
        }
      } else {
        setInvitesLoadingState(false);
      }
    };
    loadInvites();
  }, [user?.email, fetchInvites]);

  const handleOrgCreated = async (orgName: string) => {
    if (!user?.id) return;

    try {
      // Mark signup as complete after organization is created
      await markSignupComplete(user.id);

      // Set success state
      setUserType('creator');
      setOrganizationName(orgName);
      setSetupState('success');
    } catch (error) {
      console.error('Error completing signup:', error);
      setErrors({ general: 'Failed to complete signup' });
    }
  };

  const handleJoinOrg = async (invite: Invite) => {
    if (!user?.id || !invite.id) return;

    setProcessingInviteId(invite.id);

    try {
      // Check if profile exists, if not create it
      const profileResult = await getProfile(user.id);
      if (!profileResult.success || !profileResult.data) {
        // Profile doesn't exist, create it with data from user metadata
        const createResult = await createProfile(user.id, {
          fullName: (user.user_metadata?.full_name as string) || 'User',
          email: user.email || '',
          avatarUrl: user.user_metadata?.avatar_url as string,
          signupComplete: false, // Will be marked true after org setup
        });

        if (!createResult.success) {
          setErrors({ general: 'Failed to create user profile. Please try again.' });
          return;
        }
      }

      const success = await acceptInvite(invite);

      if (success) {
        // Add to accepted invites set
        setAcceptedInvites(prev => new Set(prev).add(invite.id));

        // Remove from pending invites
        setInvites(prev => prev.filter(i => i.id !== invite.id));

        // Clear any errors
        setErrors({});
      } else {
        setErrors({ general: 'Failed to join organization' });
      }
    } catch (error) {
      console.error('Join organization error:', error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleDeclineInvite = async (invite: Invite) => {
    if (!invite.id) return;

    setProcessingInviteId(invite.id);
    try {
      await denyInvite(invite);
      // Remove from pending invites
      setInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch (error) {
      console.error('Decline invite error:', error);
      setErrors({ general: 'Failed to decline invitation' });
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleSkip = async () => {
    if (!user?.id) return;

    setIsLoading(true);

    try {
      // Check if profile exists, if not create it
      const profileResult = await getProfile(user.id);
      if (!profileResult.success || !profileResult.data) {
        // Profile doesn't exist, create it with data from user metadata
        const createResult = await createProfile(user.id, {
          fullName: (user.user_metadata?.full_name as string) || 'User',
          email: user.email || '',
          avatarUrl: user.user_metadata?.avatar_url as string,
          signupComplete: true, // Mark as complete since they're skipping
        });

        if (!createResult.success) {
          setErrors({ general: 'Failed to complete setup. Please try again.' });
          return;
        }
      } else {
        // Profile exists, just mark signup as complete
        const result = await markSignupComplete(user.id);
        if (!result.success) {
          setErrors({ general: 'Failed to complete setup. Please try again.' });
          return;
        }
      }

      onComplete();
    } catch (error) {
      console.error('Skip setup error:', error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  if (invitesLoadingState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading organization options...</p>
        </div>
      </div>
    );
  }

  // Show success state
  if (setupState === 'success') {
    return (
      <OnboardingSuccess
        onContinue={onComplete}
        userType={userType}
        organizationName={organizationName}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <Badge variant="outline" className="text-primary">
            Final Step
          </Badge>
          <h1 className="text-3xl font-bold text-foreground">Organization Setup</h1>
          <p className="text-muted-foreground">Join an existing organization or create your own</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose Your Path</CardTitle>
            <CardDescription>
              You can always change or create additional organizations later
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errors.general && (
              <div className="bg-destructive/10 border-destructive/20 mb-4 rounded-md border p-3 text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="join">
                  Join Organization
                  {invites && invites.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {invites.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="create">Create Organization</TabsTrigger>
              </TabsList>

              <TabsContent value="join" className="space-y-4">
                {acceptedInvites.size > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">Accepted</h3>
                      <Badge variant="default" className="bg-green-600">
                        {acceptedInvites.size}
                      </Badge>
                    </div>
                    <div className="rounded-lg border border-green-600/20 bg-green-600/10 p-4">
                      <p className="text-sm text-green-700 dark:text-green-400">
                        ✓ You&apos;ve accepted {acceptedInvites.size} invitation
                        {acceptedInvites.size > 1 ? 's' : ''}. You can accept more below or
                        continue.
                      </p>
                    </div>
                  </div>
                )}

                {invites && invites.length > 0 ? (
                  <div className="space-y-3">
                    <h3
                      className="text-sm font-medium text-foreground"
                      role="heading"
                      aria-level={3}
                    >
                      Pending Invitations
                    </h3>
                    {invites.map(invite => {
                      const mapKey = invite.id || `${invite.org_id}-${invite.invitee}`;
                      const displayInfo = inviteDisplayData.get(mapKey) || {
                        orgName: invite.org_id,
                        groupName: invite.group_id || '',
                        inviterEmail: invite.inviter,
                      };
                      const isProcessing = processingInviteId === invite.id;
                      return (
                        <Card key={invite.id} className="border-border">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h4 className="font-medium text-foreground">
                                  {displayInfo.orgName || 'Organization'}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Invited by {displayInfo.inviterEmail}
                                </p>
                                {displayInfo.groupName && (
                                  <Badge variant="outline" className="text-xs">
                                    {displayInfo.groupName}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeclineInvite(invite)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? 'Processing...' : 'Decline'}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleJoinOrg(invite)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? 'Accepting...' : 'Accept'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : acceptedInvites.size > 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No more pending invitations</p>
                    <Button
                      onClick={handleSkip}
                      disabled={isLoading}
                      className="mt-4"
                      data-testid="continue-after-accepting-invites-button"
                    >
                      Continue
                    </Button>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No organization invitations found</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="create" className="space-y-4">
                <DirectOrgCreationForm
                  user={{
                    id: user?.id || '',
                    full_name: (user?.user_metadata?.full_name as string) || null,
                    email: user?.email || '',
                    avatar_url: (user?.user_metadata?.avatar_url as string) || null,
                    signup_complete: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }}
                  onSuccess={handleOrgCreated}
                />
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground"
                data-testid="organization-setup-skip-button"
              >
                Skip for now
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                You can set up an organization later in your settings
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
