"use client";

import React, { useState } from "react";
import { Profile, Organization } from "@/lib/supabase/types";
import GroupTable from "@/components/features/admin/management/GroupTable/GroupTable";
import { useAdminData } from "@/contexts/AdminDataContext";
import { SkeletonTable } from "@/components/shared/cards/SkeletonCard";
import { createLogger } from "@/lib/infrastructure/logger";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const logger = createLogger("Groups.tsx");

interface GroupsProps {
    org_id: string;
    user: Profile;
    org: Organization;
}

export default function Groups({
    org_id,
    user,
    org
}: GroupsProps) {
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDescription, setNewGroupDescription] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [nameError, setNameError] = useState<string>("");

    // Use centralized admin data
    const {
        users,
        groups,
        models,
        userGroups,
        modelGroups,
        isLoading,
        updateUserGroup,
        updateModelGroup,
        addGroup,
        deleteGroup,
        refreshGroups
    } = useAdminData();

    // Don't fetch data if org_id is empty
    if (!org_id) {
        return <div className="p-4 text-center text-gray-500">Organization setup required</div>;
    }


    const handleAddClick = () => {
        setIsAddingGroup(true);
        setNewGroupName("");
        setNewGroupDescription("");
        setSelectedUsers([]);
        setSelectedModels([]);
        setNameError("");
    };

    const handleCloseDialog = () => {
        setIsAddingGroup(false);
        setNewGroupName("");
        setNewGroupDescription("");
        setSelectedUsers([]);
        setSelectedModels([]);
        setNameError("");
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;

        // Check for duplicate group name
        const trimmedName = newGroupName.trim();
        const duplicateGroup = groups.find(g => g.role.toLowerCase() === trimmedName.toLowerCase());
        if (duplicateGroup) {
            setNameError("A group with this name already exists");
            return;
        }

        setNameError("");
        setIsCreating(true);
        try {
            // Create group using context method
            const response = await addGroup(trimmedName, newGroupDescription);
            if (response && response[0]) {
                // Add users and models to group
                await Promise.all([
                    ...selectedModels.map((model_id) => updateModelGroup(model_id, response[0].id)),
                    ...selectedUsers.map((userId) => updateUserGroup(userId, response[0].id))
                ]);
                logger.info(`Group ${trimmedName} created with users and models`);

                // Close dialog (no need to refresh - addGroup already does it)
                handleCloseDialog();
            }
        } catch (error) {
            logger.error("Failed to add group:", error);

            // Check if it's a unique constraint violation
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('unique') || errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
                setNameError("A group with this name already exists");
            } else {
                setNameError("Failed to create group. Please try again.");
            }
        } finally {
            setIsCreating(false);
        }
    };

    const handleAddGroup = async (
        name: string,
        description: string,
        userIds: string[],
        model_ids: string[]
    ) => {
        try {
            // Create group using context method
            const response = await addGroup(name, description);
            if (response && response[0]) {
                // Add users and models to group
                await Promise.all([
                    ...model_ids.map((model_id) => updateModelGroup(model_id, response[0].id)),
                    ...userIds.map((userId) => updateUserGroup(userId, response[0].id))
                ]);
                logger.info(`Group ${name} created with users and models`);
            }
        } catch (error) {
            logger.error("Failed to add group:", error);
        }
    };

    // Show loading while data is being fetched
    if (isLoading && groups.length === 0) {
        return <SkeletonTable rows={6} cols={4} />;
    }

    // Show empty state when no groups exist
    if (!groups || groups.length === 0) {
        return (
            <>
                {/* Header with title and add button */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-foreground">Groups</h1>
                    <Button
                        onClick={handleAddClick}
                        size="sm"
                        className="h-10 w-10 rounded-full p-0 bg-primary hover:bg-primary/90"
                        data-testid="group-add-button"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-8 text-center text-muted-foreground">
                    <div className="mb-4">
                        <svg className="mx-auto h-12 w-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No groups found</h3>
                    <p className="mt-2 text-sm">
                        Create your first group to organize users and assign models. Groups help manage permissions and access control.
                    </p>
                </div>

                {/* Add group dialog */}
                {isAddingGroup && (
                    <Dialog open={isAddingGroup} onOpenChange={handleCloseDialog}>
                        <DialogContent className="max-w-md" data-testid="create-group-dialog">
                            <DialogHeader>
                                <DialogTitle>Create New Group</DialogTitle>
                                <DialogDescription>
                                    Add a new group to organize users and assign models.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="group-name">Group Name</Label>
                                    <Input
                                        id="group-name"
                                        type="text"
                                        value={newGroupName}
                                        onChange={(e) => {
                                            setNewGroupName(e.target.value);
                                            // Clear error when user types
                                            if (nameError) setNameError("");
                                        }}
                                        placeholder="Enter group name"
                                        className="mt-1"
                                        data-testid="group-name-input"
                                    />
                                    {nameError && (
                                        <p className="mt-1 text-sm text-destructive" data-testid="group-name-error">
                                            {nameError}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="group-description">Description</Label>
                                    <Textarea
                                        id="group-description"
                                        value={newGroupDescription}
                                        onChange={(e) => setNewGroupDescription(e.target.value)}
                                        placeholder="Enter group description"
                                        className="mt-1"
                                        data-testid="group-description-input"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={handleCloseDialog} data-testid="create-group-cancel-button">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateGroup}
                                    disabled={!newGroupName.trim() || isCreating}
                                    data-testid="create-group-button"
                                >
                                    {isCreating ? "Creating..." : "Create Group"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </>
        );
    }

    return (
        <>
            {/* Header with title and add button */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-foreground">Groups</h1>
                <Button
                    onClick={handleAddClick}
                    size="sm"
                    className="h-10 w-10 rounded-full p-0 bg-primary hover:bg-primary/90"
                    data-testid="group-add-button"
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            <GroupTable
                users={users.data}
                groups={groups}
                userGroups={userGroups}
                models={models}
                modelGroups={modelGroups}
                handleUpdateUser={updateUserGroup}
                deleteGroup={deleteGroup}
                handleUpdateModel={updateModelGroup}
                handleAddGroup={handleAddGroup}
                refreshGroups={refreshGroups}
                orgId={org_id}
            />

            {/* Add group dialog */}
            {isAddingGroup && (
                <Dialog open={isAddingGroup} onOpenChange={handleCloseDialog}>
                    <DialogContent className="max-w-md" data-testid="create-group-dialog">
                        <DialogHeader>
                            <DialogTitle>Create New Group</DialogTitle>
                            <DialogDescription>
                                Add a new group to organize users and assign models.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="group-name">Group Name</Label>
                                <Input
                                    id="group-name"
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => {
                                        setNewGroupName(e.target.value);
                                        // Clear error when user types
                                        if (nameError) setNameError("");
                                    }}
                                    placeholder="Enter group name"
                                    className="mt-1"
                                    data-testid="group-name-input"
                                />
                                {nameError && (
                                    <p className="mt-1 text-sm text-destructive" data-testid="group-name-error">
                                        {nameError}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="group-description">Description</Label>
                                <Textarea
                                    id="group-description"
                                    value={newGroupDescription}
                                    onChange={(e) => setNewGroupDescription(e.target.value)}
                                    placeholder="Enter group description"
                                    className="mt-1"
                                    data-testid="group-description-input"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleCloseDialog} data-testid="create-group-cancel-button">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateGroup}
                                disabled={!newGroupName.trim() || isCreating}
                                data-testid="create-group-button"
                            >
                                {isCreating ? "Creating..." : "Create Group"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
