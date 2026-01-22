"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OnboardingSuccessProps {
    onContinue: () => void;
    userType: "creator" | "member";
    organizationName?: string;
}

export function OnboardingSuccess({
    onContinue,
    userType,
    organizationName
}: OnboardingSuccessProps) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto">
                        <svg
                            className="w-10 h-10 text-primary-foreground"
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
                        <Badge variant="outline" className="text-primary">
                            Setup Complete
                        </Badge>
                        <h1 className="text-3xl font-bold text-foreground">
                            Welcome to AgentFlow!
                        </h1>
                        <p className="text-muted-foreground">
                            {userType === "creator"
                                ? organizationName === "pending approval"
                                    ? `Your organization request has been submitted and is pending approval.`
                                    : `You've successfully created "${organizationName}" and are ready to start building.`
                                : `You've joined "${organizationName}" and are ready to collaborate.`
                            }
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{`What's Next?`}</CardTitle>
                        <CardDescription>
                            {`Here's what you can do now that your account is set up`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <h4 className="font-medium text-foreground">Explore AI Models</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Discover and configure AI agents for your workflow
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <h4 className="font-medium text-foreground">Start Conversations</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Begin chatting with AI agents to get work done
                                    </p>
                                </div>
                            </div>

                            {userType === "creator" && organizationName !== "pending approval" && (
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                    <div>
                                        <h4 className="font-medium text-foreground">Invite Team Members</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Add colleagues to collaborate on projects
                                        </p>
                                    </div>
                                </div>
                            )}

                            {userType === "creator" && organizationName === "pending approval" && (
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                                    <div>
                                        <h4 className="font-medium text-foreground">Check Approval Status</h4>
                                        <p className="text-sm text-muted-foreground">
                                            You&apos;ll receive an email once your organization is approved
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <h4 className="font-medium text-foreground">Customize Settings</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Personalize your experience and preferences
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button onClick={onContinue} className="w-full">
                            Get Started
                        </Button>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Need help getting started? Check out our{" "}
                        <a href="/docs" className="text-primary hover:underline">
                            documentation
                        </a>{" "}
                        or{" "}
                        <a href="/support" className="text-primary hover:underline">
                            contact support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
