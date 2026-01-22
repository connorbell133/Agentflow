"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createOrg } from "@/actions/organization/organizations";
import { addUserToOrg } from "@/actions/auth/users";

interface CreateOrgFormProps {
  userId: string;
  onSuccess?: (org_id: string, orgName: string) => void;
  onCancel?: () => void;
  showCancel?: boolean;
  className?: string;
}

export function CreateOrgForm({
  userId,
  onSuccess,
  onCancel,
  showCancel = true,
  className = ""
}: CreateOrgFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!orgName.trim()) {
      newErrors.orgName = "Organization name is required";
    } else if (orgName.trim().length < 2) {
      newErrors.orgName = "Organization name must be at least 2 characters";
    } else if (orgName.trim().length > 50) {
      newErrors.orgName = "Organization name must be less than 50 characters";
    }

    if (orgDescription.trim() && orgDescription.trim().length > 200) {
      newErrors.orgDescription = "Description must be less than 200 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!userId) {
      setErrors({ general: "User authentication required" });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createOrg(orgName.trim(), userId);

      if (result && result.length > 0) {
        const neworg_id = (result[0] as any).id;

        // Add user to the org they just created
        await addUserToOrg(neworg_id, userId);

        // Call success callback
        onSuccess?.(neworg_id, orgName.trim());
      } else {
        setErrors({ general: "Failed to create organization. Please try again." });
      }
    } catch (error) {
      console.error("Organization creation error:", error);
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === "orgName") {
      setOrgName(value);
    } else if (field === "orgDescription") {
      setOrgDescription(value);
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-2xl">Organization Details</CardTitle>
        <CardDescription>
          Provide some basic information about your organization. You can always update these details later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateOrg} className="space-y-6">
          {errors.general && (
            <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {errors.general}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="orgName" className="text-base font-medium">
                Organization Name *
              </Label>
              <Input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => handleInputChange("orgName", e.target.value)}
                placeholder="e.g. Acme Corporation"
                className={`text-base h-12 ${errors.orgName ? "border-destructive" : ""}`}
              />
              {errors.orgName && (
                <p className="text-sm text-destructive">{errors.orgName}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Choose a name that represents your team or company
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="orgDescription" className="text-base font-medium">
                Description (Optional)
              </Label>
              <Input
                id="orgDescription"
                type="text"
                value={orgDescription}
                onChange={(e) => handleInputChange("orgDescription", e.target.value)}
                placeholder="e.g. A leading technology company focused on AI solutions"
                className={`text-base h-12 ${errors.orgDescription ? "border-destructive" : ""}`}
              />
              {errors.orgDescription && (
                <p className="text-sm text-destructive">{errors.orgDescription}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Help others understand what your organization does
              </p>
            </div>
          </div>

          <Separator />

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h3 className="font-medium text-foreground">What happens next?</h3>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span>{`You'll become the organization administrator`}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span>You can invite team members to collaborate</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span>Configure AI models and permissions for your team</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            {showCancel && onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className={showCancel ? "flex-1" : "w-full"}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                "Create Organization"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
