"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Profile } from "@/lib/supabase/types";
import { TempOrgRequestForm } from "./TempOrgRequestForm";
import { CreateOrgForm } from "./CreateOrgForm";

interface OrgCreationScreenProps {
  user: Profile;
}

type CreationStep = "form" | "success";

export default function OrgCreationScreen({ user }: OrgCreationScreenProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<CreationStep>("form");
  const [createdOrgName, setCreatedOrgName] = useState("");

  const handleOrgCreated = (org_id: string, orgName: string) => {
    setCreatedOrgName(orgName);
    setCurrentStep("success");
  };

  const handleGoToDashboard = () => {
    router.push("/admin");
  };

  const handleCreateAnother = () => {
    setCurrentStep("form");
    setCreatedOrgName("");
  };

  // Success State
  if (currentStep === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
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
                Organization Created
              </Badge>
              <h1 className="text-3xl font-bold text-foreground">
                {`Welcome to "${createdOrgName}"!`}
              </h1>
              <p className="text-muted-foreground">
                {`Your organization has been successfully created and you've been added as the administrator.`}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{`What's Next?`}</CardTitle>
              <CardDescription>
                Start building your team and configuring your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-foreground">Invite Team Members</h4>
                    <p className="text-sm text-muted-foreground">
                      Add colleagues to collaborate on projects
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-foreground">Set Up Groups</h4>
                    <p className="text-sm text-muted-foreground">
                      Create groups to organize team access and permissions
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-foreground">Configure AI Models</h4>
                    <p className="text-sm text-muted-foreground">
                      {`Add and configure AI agents for your team's workflow`}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex space-x-3">
                <Button onClick={handleGoToDashboard} className="flex-1">
                  Go to Admin Dashboard
                </Button>
                <Button onClick={handleCreateAnother} variant="outline">
                  Create Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const requestMode = true; // Set to true to show org request form, false to show direct creation

  // Form State
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">
              Create Your Organization
            </h1>
            <p className="text-xl text-muted-foreground max-w-md mx-auto">
              Set up your organization to start collaborating with your team on AgentFlow
            </p>
          </div>
        </div>

        {/* Main Form Card */}
        {requestMode ? (
          <TempOrgRequestForm user={user} />
        ) : (
          <CreateOrgForm
            userId={user.id}
            onSuccess={handleOrgCreated}
            onCancel={() => router.push("/admin")}
            className="shadow-xl"
          />
        )}

        {/* Footer */}
        {!requestMode && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              By creating an organization, you agree to our{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
