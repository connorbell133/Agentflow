"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ProfileSetup } from "./ProfileSetup";
import { OrganizationSetup } from "./OrganizationSetup";
import { getProfile } from "@/actions/auth/profile";

type OnboardingStep = "profile" | "organization" | "complete";

export function OnboardingFlow() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<OnboardingStep>("profile");
    const [isLoading, setIsLoading] = useState(true);

    // Check if user has already completed onboarding
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (!isLoaded || !user?.id) return;

            try {
                const result = await getProfile(user.id);

                if (result.success && result.data) {
                    // If signup is already complete, redirect to main app
                    if (result.data.signup_complete) {
                        router.push("/");
                        return;
                    }

                    // If profile exists but signup not complete, go to org setup
                    if (result.data.full_name && result.data.email) {
                        setCurrentStep("organization");
                    }
                }
            } catch (error) {
                console.error("Error checking onboarding status:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkOnboardingStatus();
    }, [isLoaded, user?.id, router]);

    const handleProfileComplete = () => {
        setCurrentStep("organization");
    };

    const handleOrganizationComplete = () => {
        setCurrentStep("complete");
        // Redirect to main app after a brief delay
        setTimeout(() => {
            router.push("/");
        }, 1000);
    };

    // Loading state
    if (!isLoaded || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // User not authenticated
    if (!user) {
        router.push("/sign-in");
        return null;
    }

    // Completion state
    if (currentStep === "complete") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                        <svg
                            className="w-8 h-8 text-primary-foreground"
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
        case "profile":
            return <ProfileSetup onComplete={handleProfileComplete} />;
        case "organization":
            return <OrganizationSetup onComplete={handleOrganizationComplete} />;
        default:
            return null;
    }
}
