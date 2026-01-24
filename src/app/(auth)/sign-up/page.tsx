'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/auth/supabase-client';
import { AuthLayout } from '@/components/features/auth/AuthLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!acceptedTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message || 'Sign up failed');
      } else {
        // Check if user was auto-confirmed (session exists)
        if (data.session) {
          // User is automatically signed in, redirect to onboarding
          router.push('/onboarding');
        } else {
          // Email confirmation required
          setMessage('Check your email for a confirmation link!');
          // Redirect after 3 seconds
          setTimeout(() => {
            router.push('/sign-in');
          }, 3000);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="bg-card/95 rounded-xl border border-border shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-foreground">Create Account</CardTitle>
          <CardDescription className="text-muted-foreground">
            Get started with AgentFlow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="border-destructive/50 bg-destructive/10 flex items-start gap-2 rounded-lg border p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="flex items-start gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{message}</p>
            </div>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="John Doe"
                data-testid="sign-up-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                data-testid="sign-up-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={8}
                data-testid="sign-up-password-input"
              />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                data-testid="sign-up-confirm-password-input"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={checked => setAcceptedTerms(checked === true)}
                data-testid="sign-up-terms-checkbox"
                className="mt-1"
              />
              <div className="text-sm leading-none">
                <Label htmlFor="terms" className="cursor-pointer font-normal">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              data-testid="sign-up-submit-button"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
