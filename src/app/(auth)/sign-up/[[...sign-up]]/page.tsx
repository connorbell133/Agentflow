import { SignUp } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function SignUpPage() {
    return (
        <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background">
            {/* Animated background gradients using primary color */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent animate-pulse opacity-20 blur-3xl rounded-full"></div>
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/10 via-transparent to-transparent animate-pulse opacity-20 blur-3xl rounded-full" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(rgba(var(--foreground-rgb), 0.05) 1px, transparent 1px),
                                     linear-gradient(90deg, rgba(var(--foreground-rgb), 0.05) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            ></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-center w-full max-w-6xl mx-auto px-4 gap-12 md:gap-20">
                {/* Left side - Branding */}
                <div className="flex flex-col items-center md:items-start space-y-6 text-center md:text-left">
                    {/* Logo/Icon */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                        <Card className="relative p-6 bg-card/80 backdrop-blur-xl border-border shadow-2xl">
                            <svg
                                width="64"
                                height="64"
                                viewBox="0 0 100 100"
                                className="text-primary"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M20 30C20 23.3726 25.3726 18 32 18H68C74.6274 18 80 23.3726 80 30V55C80 61.6274 74.6274 67 68 67H45L32 75V67C25.3726 67 20 61.6274 20 55V30Z"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    fill="currentColor"
                                    fillOpacity="0.2"
                                />
                                <circle cx="40" cy="42" r="3" fill="currentColor" opacity="0.8" />
                                <circle cx="50" cy="42" r="3" fill="currentColor" opacity="0.8" />
                                <circle cx="60" cy="42" r="3" fill="currentColor" opacity="0.8" />
                            </svg>
                        </Card>
                    </div>

                    {/* Title */}
                    <div className="space-y-3">
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                            <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                                Agent
                            </span>
                            <span className="text-foreground">Flow</span>
                        </h1>
                        <p className="text-muted-foreground text-lg md:text-xl max-w-md">
                            AI Connection and Distribution Platform
                        </p>
                    </div>

                    {/* Feature badges */}
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <Badge variant="secondary" className="text-xs font-medium">
                            Multi-tenant
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-medium">
                            Secure
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-medium">
                            Scalable
                        </Badge>
                    </div>
                </div>

                {/* Divider */}
                <div className="hidden md:block h-96 w-px bg-gradient-to-b from-transparent via-border to-transparent"></div>

                {/* Right side - Sign Up Form */}
                <div className="w-full max-w-md">
                    <SignUp
                        appearance={{
                            baseTheme: undefined,
                            variables: {
                                colorPrimary: 'oklch(var(--primary))',
                                colorBackground: 'oklch(var(--card))',
                                colorInputBackground: 'oklch(var(--muted))',
                                colorInputText: 'oklch(var(--foreground))',
                                colorText: 'oklch(var(--foreground))',
                                colorTextSecondary: 'oklch(var(--muted-foreground))',
                                borderRadius: 'var(--radius)',
                            },
                            elements: {
                                rootBox: 'w-full',
                                card: 'bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl',
                                headerTitle: 'text-foreground text-2xl font-bold',
                                headerSubtitle: 'text-muted-foreground',
                                socialButtonsBlockButton: 'bg-muted border border-border text-foreground hover:bg-muted/80 transition-all duration-200',
                                socialButtonsBlockButtonText: 'text-foreground font-medium',
                                socialButtonsProviderIcon: 'brightness-90',
                                formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all duration-200',
                                formFieldInput: 'bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring',
                                footerActionLink: 'text-primary hover:text-primary/80 transition-colors',
                                identityPreviewText: 'text-foreground',
                                formFieldLabel: 'text-foreground',
                                dividerLine: 'bg-border',
                                dividerText: 'text-muted-foreground',
                                formFieldInputShowPasswordButton: 'text-muted-foreground hover:text-foreground',
                                otpCodeFieldInput: 'bg-input border-border text-foreground',
                                formResendCodeLink: 'text-primary hover:text-primary/80',
                                alertText: 'text-foreground',
                                formFieldError: 'text-destructive',
                                footerActionText: 'text-muted-foreground',
                            },
                        }}
                    />
                </div>
            </div>

            {/* Bottom gradient accent */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
        </div>
    )
}
