import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingFlow } from '@/components/features/onboarding/OnboardingFlow';

export default function FlowPage() {
  return (
    <ThemeProvider>
      <OnboardingFlow />
    </ThemeProvider>
  );
}
