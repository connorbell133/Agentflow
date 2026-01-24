'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/auth/use-user';
import { updateProfile, createProfile } from '@/actions/auth/profile';
import { createLogger } from '@/lib/infrastructure/logger';
import { profileSchema } from '@/lib/validation/schemas';
import { useFormValidation } from '@/hooks/use-form-validation';

const logger = createLogger('ProfileSetup');

interface ProfileSetupProps {
  onComplete: () => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { user, profile } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    email: user?.email || '',
    avatarUrl: profile?.avatar_url || '',
  });

  const [generalError, setGeneralError] = useState<string>('');
  const { validate, errors, isValidating, clearFieldError } = useFormValidation(profileSchema);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = await validate({
      fullName: formData.fullName,
      email: formData.email,
    });

    if (!validation.success) return;
    if (!user?.id) return;

    setIsLoading(true);

    try {
      logger.info('Starting profile setup', { userId: user.id });

      // Update the profile with the form data
      const result = await updateProfile(user.id, {
        ...formData,
        signupComplete: false, // Will be set to true after org setup
      });

      if (result.success) {
        logger.info('Profile setup completed', { userId: user.id });
        onComplete();
      } else {
        logger.error('Failed to update profile', {
          userId: user.id,
          error: result.error,
        });
        setGeneralError(result.error || 'Failed to save profile');
      }
    } catch (error) {
      logger.error('Profile setup error:', error);
      setGeneralError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Skip email changes since it's read-only
    if (field === 'email') return;

    setFormData(prev => ({ ...prev, [field]: value }));
    clearFieldError(field);

    if (generalError) {
      setGeneralError('');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <Badge variant="outline" className="text-primary">
            Step 1 of 2
          </Badge>
          <h1 className="text-3xl font-bold text-foreground">Welcome to AgentFlow</h1>
          <p className="text-muted-foreground">
            Let&apos;s set up your account details to get started
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Complete your profile with your name and details. Your email is already verified from
              sign-up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {generalError && (
                <div className="bg-destructive/10 border-destructive/20 rounded-md border p-3 text-sm text-destructive">
                  {generalError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={e => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter your full name"
                  className={errors.fullName ? 'border-destructive' : ''}
                  maxLength={100}
                  data-testid="onboarding-full-name-input"
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  readOnly
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
                <p className="text-sm text-muted-foreground">
                  Email is provided from your authentication and cannot be changed here
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Profile Picture URL (Optional)</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={formData.avatarUrl}
                  onChange={e => handleInputChange('avatarUrl', e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-sm text-muted-foreground">
                  You can update this later in your profile settings
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isValidating}
                data-testid="onboarding-continue-to-org-setup-button"
              >
                {isLoading || isValidating ? 'Saving...' : 'Continue to Organization Setup'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Your information is secure and will only be used to enhance your experience
          </p>
        </div>
      </div>
    </div>
  );
}
