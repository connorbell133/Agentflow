'use client';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background">
      {/* Animated background gradients using primary color */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="from-primary/10 absolute -left-1/2 -top-1/2 h-full w-full animate-pulse rounded-full bg-gradient-to-br via-transparent to-transparent opacity-20 blur-3xl"></div>
        <div
          className="from-primary/10 absolute -bottom-1/2 -right-1/2 h-full w-full animate-pulse rounded-full bg-gradient-to-tl via-transparent to-transparent opacity-20 blur-3xl"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                           linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          color: 'var(--foreground)',
        }}
      ></div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-12 px-4 md:flex-row md:gap-20">
        {/* Left side - Branding */}
        <div className="flex flex-col items-center space-y-6 text-center md:items-start md:text-left">
          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
              <span className="to-primary/70 bg-gradient-to-r from-primary via-primary bg-clip-text text-transparent">
                Agent
              </span>
              <span className="text-foreground">Flow</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground md:text-xl">
              AI Connection and Distribution Platform
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-96 w-px bg-gradient-to-b from-transparent via-border to-transparent md:block"></div>

        {/* Right side - Auth Form */}
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Bottom gradient accent */}
      <div className="via-primary/50 absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent"></div>
    </div>
  );
}
