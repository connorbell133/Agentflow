"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { useInvites } from "@/hooks/organization/use-invites";
import { markSignupComplete } from "@/actions/auth/profile";
import { Invite } from "@/lib/supabase/types";
import { OnboardingSuccess } from "./OnboardingSuccess";
import { Waitlist } from "@clerk/nextjs";
import { TempOrgRequestForm } from "@/components/features/admin/org_management/TempOrgRequestForm";
interface OrganizationSetupProps {
    onComplete: () => void;
}

type SetupState = "choosing" | "success";
type UserType = "creator" | "member";

export function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
    const { user } = useUser();
    const { fetchInvites, isLoading: invitesLoading, acceptInvite, denyInvite } = useInvites();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("join");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [setupState, setSetupState] = useState<SetupState>("choosing");
    const [userType, setUserType] = useState<UserType>("creator");
    const [organizationName, setOrganizationName] = useState<string>("");
    const [invites, setInvites] = useState<Invite[]>([]);
    const [inviteDisplayData, setInviteDisplayData] = useState<Map<string, { orgName: string, groupName: string, inviterEmail: string }>>(new Map());
    const [invitesLoadingState, setInvitesLoadingState] = useState(true);
    // Fetch invites on component mount
    useEffect(() => {
        const loadInvites = async () => {
            if (user?.primaryEmailAddress?.emailAddress) {
                setInvitesLoadingState(true);
                try {
                    const result = await fetchInvites(user.primaryEmailAddress.emailAddress);
                    setInvites(result.invites);
                    setInviteDisplayData(result.displayData);
                } catch (error) {
                    console.error("Error fetching invites:", error);
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
    }, [user?.primaryEmailAddress?.emailAddress, fetchInvites])

    const handleOrgRequested = async () => {
        if (!user?.id) return;

        try {
            // Mark signup as complete even when organization is pending
            await markSignupComplete(user.id);

            // Set success state for request
            setUserType("creator");
            setOrganizationName("pending approval");
            setSetupState("success");
        } catch (error) {
            console.error("Error completing signup:", error);
            setErrors({ general: "Failed to complete signup" });
        }
    };

    const handleJoinOrg = async (invite: Invite) => {
        if (!user?.id) return;

        setIsLoading(true);

        try {
            const success = await acceptInvite(invite);

            if (success) {
                // Mark signup as complete
                await markSignupComplete(user.id);

                // Get display data for the organization name
                const displayInfo = inviteDisplayData.get(invite.id);
                const orgName = displayInfo?.orgName || invite.org_id || "the organization";

                // Set success state
                setUserType("member");
                setOrganizationName(orgName);
                setSetupState("success");
            } else {
                setErrors({ general: "Failed to join organization" });
            }
        } catch (error) {
            console.error("Join organization error:", error);
            setErrors({ general: "An unexpected error occurred" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeclineInvite = async (invite: Invite) => {
        try {
            await denyInvite(invite);
        } catch (error) {
            console.error("Decline invite error:", error);
        }
    };

    const handleSkip = async () => {
        if (!user?.id) return;

        setIsLoading(true);

        try {
            // Mark signup as complete even without org
            await markSignupComplete(user.id);
            onComplete();
        } catch (error) {
            console.error("Skip setup error:", error);
            setErrors({ general: "An unexpected error occurred" });
        } finally {
            setIsLoading(false);
        }
    };

    if (invitesLoadingState) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading organization options...</p>
                </div>
            </div>
        );
    }

    // Show success state
    if (setupState === "success") {
        return (
            <OnboardingSuccess
                onContinue={onComplete}
                userType={userType}
                organizationName={organizationName}
            />
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-lg space-y-6">
                <div className="text-center space-y-2">
                    <Badge variant="outline" className="text-primary">
                        Step 2 of 2
                    </Badge>
                    <h1 className="text-3xl font-bold text-foreground">
                        Organization Setup
                    </h1>
                    <p className="text-muted-foreground">
                        Join an existing organization or create your own
                    </p>
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
                            <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
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
                                {invites && invites.length > 0 ? (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-foreground">
                                            Pending Invitations
                                        </h3>
                                        {invites.map((invite) => {
                                            const mapKey = invite.id || `${invite.org_id}-${invite.invitee}`;
                                            const displayInfo = inviteDisplayData.get(mapKey) || {
                                                orgName: invite.org_id,
                                                groupName: invite.group_id || "",
                                                inviterEmail: invite.inviter
                                            };
                                            return (
                                                <Card key={invite.id} className="border-border">
                                                    <CardContent className="pt-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="space-y-1">
                                                                <h4 className="font-medium text-foreground">
                                                                    {displayInfo.orgName || "Organization"}
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
                                                                    disabled={isLoading}
                                                                >
                                                                    Decline
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleJoinOrg(invite)}
                                                                    disabled={isLoading}
                                                                >
                                                                    {isLoading ? "Joining..." : "Accept"}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground">
                                            No organization invitations found
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="create" className="space-y-4">
                                <TempOrgRequestForm
                                    user={{
                                        id: user?.id || "",
                                        full_name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || null,
                                        email: user?.primaryEmailAddress?.emailAddress || "",
                                        avatar_url: user?.imageUrl || null,
                                        signup_complete: false,
                                        created_at: new Date().toISOString(),
                                        updated_at: new Date().toISOString()
                                    }}
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
                            >
                                Skip for now
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                                You can set up an organization later in your settings
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
