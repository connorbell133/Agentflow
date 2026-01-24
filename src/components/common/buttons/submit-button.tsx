'use client';

import { Button } from '@/components/ui/button';
// import { ArrowRight, Loader2 } from "lucide-react";
import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-full border border-gray-200 bg-white text-black hover:bg-gray-100"
    >
      {pending ? (
        <>
          {/* <Loader2 className="animate-spin mr-2 h-4 w-4" /> */}
          Loading...
        </>
      ) : (
        <>
          Get Started
          {/* <ArrowRight className="ml-2 h-4 w-4" /> */}
        </>
      )}
    </Button>
  );
}
