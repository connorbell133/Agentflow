"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Profile } from "@/lib/supabase/types";
import { createTempOrgRequest, getUserPendingRequest, cancelTempOrgRequest, getUserApprovedRequest, markRequestAsUsed } from "@/actions/organization/temp-org-requests";
import { getUserOrgStatus } from "@/actions/organization/user-org-status";
import { createOrg } from "@/actions/organization/organizations";
import { addUserToOrg } from "@/actions/auth/users";
import { tempOrgRequestSchema } from "@/lib/validation/schemas";
import { useFormValidation } from "@/hooks/use-form-validation";

interface TempOrgRequestFormProps {
    user: Profile;
}

type RequestState = "form" | "pending" | "submitted" | "error" | "approved" | "hasOrg" | "creating" | "success";

export function TempOrgRequestForm({ user }: TempOrgRequestFormProps) {
    const router = useRouter();
    const [requestState, setRequestState] = useState<RequestState>("form");
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingPending, setIsCheckingPending] = useState(true);
    const [orgName, setOrgName] = useState("");
    const [requestReason, setRequestReason] = useState("");
    const [additionalInfo, setAdditionalInfo] = useState("");
    const [generalError, setGeneralError] = useState<string>("");
    const [pendingRequest, setPendingRequest] = useState<any>(null);
    const [approvedRequest, setApprovedRequest] = useState<any>(null);
    const [userOrgStatus, setUserOrgStatus] = useState<any>(null);

    const { validate, errors, isValidating, clearFieldError } = useFormValidation(tempOrgRequestSchema);

    const createOrganization = async (request: any) => {
        if (!user?.id) return;

        setIsLoading(true);
        setRequestState("creating");

        try {
            // Create the organization
            const orgName = request.org_name || request.orgName;
            if (!orgName) {
                setGeneralError("Organization name is missing. Please contact support.");
                setRequestState("error");
                setIsLoading(false);
                return;
            }
            const result = await createOrg(orgName, user.id);
            console.log(result);
            if (result && result.length > 0) {
                // Execute critical setup tasks in parallel to speed up the process
                await Promise.all([
                    addUserToOrg((result[0] as any).id, user.id),
                    markRequestAsUsed(request.id)
                ]);

                // Mark as success - user will click to navigate
                setRequestState("success");
                setIsLoading(false);
            } else {
                setGeneralError("Failed to create organization. Please try again.");
                setRequestState("error");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Organization creation error:", error);
            setGeneralError("An unexpected error occurred. Please try again.");
            setRequestState("error");
            setIsLoading(false);
        }
    };

    const checkUserStatus = useCallback(async () => {
        if (!user?.id) return;

        setIsCheckingPending(true);
        try {
            // First check if user already has an organization
            const orgStatus = await getUserOrgStatus(user.id);
            if (orgStatus.success && orgStatus.data && orgStatus.data.hasOrganization) {
                setUserOrgStatus(orgStatus.data);
                setRequestState("hasOrg");
                return;
            }

            // Check for approved request
            const approvedResult = await getUserApprovedRequest(user.id);
            if (approvedResult.success && approvedResult.data) {
                setApprovedRequest(approvedResult.data);
                setRequestState("approved");
                return;
            }

            // Check for pending request
            const pendingResult = await getUserPendingRequest(user.id);
            if (pendingResult.success && pendingResult.data) {
                setPendingRequest(pendingResult.data);
                setRequestState("pending");
                return;
            }

            // No requests, show form
            setRequestState("form");
        } catch (error) {
            console.error("Error checking user status:", error);
        } finally {
            setIsCheckingPending(false);
        }
    }, [user?.id]);

    // Check user org status and requests on component mount
    useEffect(() => {
        checkUserStatus();
    }, [checkUserStatus]);


    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();

        const validation = await validate({
            orgName: orgName,
            reason: requestReason,
            additionalInfo: additionalInfo || undefined
        });

        if (!validation.success) return;

        if (!user?.id) {
            setGeneralError("User authentication required");
            return;
        }

        setIsLoading(true);

        try {
            const result = await createTempOrgRequest({
                orgName: orgName.trim(),
                requestDesc: validation.data!.reason,
                requesterId: user.id,
            });

            if (result.success) {
                setPendingRequest(result.data);
                setRequestState("submitted");
            } else {
                setGeneralError(result.error || "Failed to submit request");
                setRequestState("error");
            }
        } catch (error) {
            console.error("Organization request error:", error);
            setGeneralError("An unexpected error occurred. Please try again.");
            setRequestState("error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelRequest = async () => {
        if (!pendingRequest?.id || !user?.id) return;

        setIsLoading(true);
        try {
            const result = await cancelTempOrgRequest(pendingRequest.id, user.id);

            if (result.success) {
                setPendingRequest(null);
                setRequestState("form");
                setOrgName("");
                setRequestReason("");
                setAdditionalInfo("");
                setGeneralError("");
            } else {
                setGeneralError(result.error || "Failed to cancel request");
            }
        } catch (error) {
            console.error("Cancel request error:", error);
            setGeneralError("Failed to cancel request");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        if (field === "orgName") {
            setOrgName(value);
            clearFieldError("orgName");
        } else if (field === "requestReason") {
            setRequestReason(value);
            clearFieldError("reason");
        } else if (field === "additionalInfo") {
            setAdditionalInfo(value);
            clearFieldError("additionalInfo");
        }

        if (generalError) {
            setGeneralError("");
        }
    };

    const handleTryAgain = () => {
        setRequestState("form");
        setGeneralError("");
    };

    const handleGoToChat = () => {
        router.push("/");
    };

    // Loading initial check
    if (isCheckingPending) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Checking organization status...</p>
                </div>
            </div>
        );
    }

    // User already has an organization
    if (requestState === "hasOrg" && userOrgStatus) {
        return (
            <Card className="shadow-lg">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full flex items-center justify-center mx-auto">
                            <svg
                                className="w-8 h-8 text-green-600 dark:text-green-400"
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
                            <Badge variant="outline" className="text-green-600">
                                Organization Member
                            </Badge>
                            <h3 className="text-xl font-bold text-foreground">
                                You&apos;re Already Part of an Organization
                            </h3>
                            <p className="text-muted-foreground">
                                You can only belong to one organization at a time.
                                {userOrgStatus.isOwner ? " You own an organization." : " You&apos;re a member of an organization."}
                            </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="text-sm text-blue-700 dark:text-blue-200">
                                <p className="font-medium mb-1">Your Organizations:</p>
                                {userOrgStatus.organizations.map((org: any, index: number) => (
                                    <div key={index} className="flex justify-between items-center">
                                        <span>{org.orgName}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {org.isOwner === user.id ? "Owner" : "Member"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button onClick={() => router.push("/admin")} className="w-full">
                            Go to Admin Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Creating organization state
    if (requestState === "creating") {
        return (
            <Card className="shadow-lg">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-foreground">
                                Creating Your Organization
                            </h3>
                            <p className="text-muted-foreground">
                                Please wait while we set up &quot;{approvedRequest?.org_name || approvedRequest?.orgName || 'your organization'}&quot; for you...
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Success state - organization created, redirecting
    if (requestState === "success") {
        return (
            <Card className="shadow-lg">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full flex items-center justify-center mx-auto">
                            <svg
                                className="w-8 h-8 text-green-600 dark:text-green-400"
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
                            <Badge variant="outline" className="text-green-600">
                                Success
                            </Badge>
                            <h3 className="text-xl font-bold text-foreground">
                                Organization Created!
                            </h3>
                            <p className="text-muted-foreground">
                                &quot;{approvedRequest?.org_name || approvedRequest?.orgName || 'Your organization'}&quot; has been created successfully.
                            </p>
                        </div>

                        <div className="pt-4">
                            <a href="/admin" className="block">
                                <Button type="button" className="w-full">
                                    Go to Admin Dashboard
                                </Button>
                            </a>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Approved request state
    if (requestState === "approved" && approvedRequest) {
        return (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-green-600">
                            Request Approved
                        </Badge>
                        <span>Ready to Create Organization</span>
                    </CardTitle>
                    <CardDescription>
                        Great news! Your organization request has been approved. You can now create your organization.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-start space-x-3">
                            <svg
                                className="w-5 h-5 text-green-600 mt-0.5"
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
                            <div>
                                <h4 className="font-medium text-green-900 dark:text-green-100">
                                    Organization: &quot;{approvedRequest.org_name || approvedRequest.orgName || 'N/A'}&quot;
                                </h4>
                                <p className="text-sm text-green-700 dark:text-green-200">
                                    Approved on {new Date(approvedRequest.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-medium text-foreground mb-2">What happens when you create?</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                            <p>• You&apos;ll become the organization administrator</p>
                            <p>• You can invite team members to collaborate</p>
                            <p>• Configure AI models and permissions for your team</p>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <Button onClick={handleGoToChat} variant="outline" className="flex-1">
                            Go to Chat
                        </Button>
                        <Button
                            onClick={() => createOrganization(approvedRequest)}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Creating...
                                </>
                            ) : (
                                "Create My Organization"
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Success/Submitted State (for request submissions)
    if (requestState === "submitted") {
        return (
            <Card className="shadow-lg relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={checkUserStatus}
                    disabled={isCheckingPending}
                    title="Check Status"
                    aria-label="Check Status"
                    data-testid="org-request-check-status"
                >
                    <svg
                        className={`w-4 h-4 ${isCheckingPending ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </Button>
                <CardContent className="pt-6">
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
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>

                        <div className="space-y-2">
                            <Badge variant="outline" className="text-primary">
                                Request Submitted
                            </Badge>
                            <h3 className="text-xl font-bold text-foreground" data-testid="org-request-submitted-message">
                                Organization Request Sent!
                            </h3>
                            <p className="text-muted-foreground">
                                Your request for &quot;{orgName}&quot; has been submitted for review.
                                We&apos;ll notify you once it&apos;s been processed.
                            </p>
                        </div>

                        <div className="bg-muted/50 p-4 rounded-lg">
                            <h4 className="font-medium text-foreground mb-2">What happens next?</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                                <p>• Our team will review your organization request</p>
                                <p>• You&apos;ll receive an email notification with the decision</p>
                                <p>• If approved, you&apos;ll be able to create and manage your organization</p>
                            </div>
                        </div>

                        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                            <Button onClick={handleGoToChat} className="flex-1">
                                Continue to Chat
                            </Button>
                            <Button onClick={handleTryAgain} variant="outline" className="flex-1">
                                Submit Another Request
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Pending Request State
    if (requestState === "pending" && pendingRequest) {
        return (
            <Card className="shadow-lg relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={checkUserStatus}
                    disabled={isCheckingPending}
                    title="Check Status"
                    aria-label="Check Status"
                    data-testid="org-request-check-status"
                >
                    <svg
                        className={`w-4 h-4 ${isCheckingPending ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </Button>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-yellow-600">
                            Pending Review
                        </Badge>
                        <span>Organization Request</span>
                    </CardTitle>
                    <CardDescription>
                        You have a pending organization request that&apos;s being reviewed by our team.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <div>
                            <span className="font-medium text-foreground">Organization Name: </span>
                            <span className="text-muted-foreground">{pendingRequest.org_name || pendingRequest.orgName || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="font-medium text-foreground">Submitted: </span>
                            <span className="text-muted-foreground">
                                {new Date(pendingRequest.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <div>
                            <span className="font-medium text-foreground">Reason: </span>
                            <span className="text-muted-foreground">{pendingRequest.request_desc || pendingRequest.requestDesc || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start space-x-3">
                            <svg
                                className="w-5 h-5 text-blue-600 mt-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <div>
                                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                                    Request Under Review
                                </h4>
                                <p className="text-sm text-blue-700 dark:text-blue-200">
                                    Our team typically reviews organization requests within 2-3 business days.
                                    You&apos;ll receive an email notification once a decision is made.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                        <Button onClick={handleGoToChat} variant="outline" className="flex-1">
                            Go to Chat
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleCancelRequest}
                            disabled={isLoading}
                            className="flex-1 text-destructive hover:text-destructive"
                        >
                            {isLoading ? "Canceling..." : "Cancel Request"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error State
    if (requestState === "error") {
        return (
            <Card className="shadow-lg">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center mx-auto">
                            <svg
                                className="w-8 h-8 text-destructive"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-foreground">
                                Request Failed
                            </h3>
                            <p className="text-muted-foreground">
                                {generalError || "Failed to submit organization request"}
                            </p>
                        </div>

                        <div className="flex space-x-3">
                            <Button onClick={handleGoToChat} className="flex-1">
                                Go to Chat
                            </Button>
                            <Button onClick={handleTryAgain} variant="outline">
                                Try Again
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Form State
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">Request Organization Access</CardTitle>
                <CardDescription>
                    Tell us about the organization you&apos;d like to create. We&apos;ll review your request and get back to you soon.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                    {generalError && (
                        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                            {generalError}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="orgName" className="text-sm font-medium">
                            Organization Name *
                        </Label>
                        <Input
                            id="orgName"
                            type="text"
                            value={orgName}
                            onChange={(e) => handleInputChange("orgName", e.target.value)}
                            placeholder="e.g. Acme Corporation"
                            className={errors.orgName ? "border-destructive" : ""}
                            maxLength={50}
                            pattern="[a-zA-Z0-9\s\-]+"
                            title="Only letters, numbers, spaces, and hyphens allowed"
                            data-testid="org-request-name-input"
                        />
                        {errors.orgName && (
                            <p className="text-sm text-destructive">{errors.orgName}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="requestReason" className="text-sm font-medium">
                            Why do you need this organization? *
                        </Label>
                        <textarea
                            id="requestReason"
                            value={requestReason}
                            onChange={(e) => handleInputChange("requestReason", e.target.value)}
                            placeholder="Describe your use case, team size, and how you plan to use the organization..."
                            rows={4}
                            className={`w-full px-3 py-2 text-sm rounded-md border bg-background ${errors.reason ? "border-destructive" : "border-input"
                                } focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent`}
                            maxLength={500}
                            data-testid="org-request-reason-input"
                        />
                        {errors.reason && (
                            <p className="text-sm text-destructive">{errors.reason}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {requestReason.length}/500 characters
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="additionalInfo" className="text-sm font-medium">
                            Additional Information (Optional)
                        </Label>
                        <textarea
                            id="additionalInfo"
                            value={additionalInfo}
                            onChange={(e) => handleInputChange("additionalInfo", e.target.value)}
                            placeholder="Any additional details that might help with your request..."
                            rows={3}
                            className={`w-full px-3 py-2 text-sm rounded-md border bg-background ${errors.additionalInfo ? "border-destructive" : "border-input"
                                } focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent`}
                            maxLength={1000}
                            data-testid="org-request-additional-input"
                        />
                        {errors.additionalInfo && (
                            <p className="text-sm text-destructive">{errors.additionalInfo}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {additionalInfo.length}/1000 characters
                        </p>
                    </div>

                    <Separator />

                    <div className="bg-muted/50 p-3 rounded-lg">
                        <h4 className="font-medium text-foreground text-sm mb-2">Review Process</h4>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>• Requests are typically reviewed within 2-3 business days</p>
                            <p>• You&apos;ll receive an email notification with the decision</p>
                            <p>• Additional information may be requested if needed</p>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleGoToChat}
                            className="flex-1"
                        >
                            Go to Chat
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || isValidating}
                            className="flex-1"
                            data-testid="org-request-submit-button"
                        >
                            {isLoading || isValidating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Submitting...
                                </>
                            ) : (
                                "Submit Request"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

