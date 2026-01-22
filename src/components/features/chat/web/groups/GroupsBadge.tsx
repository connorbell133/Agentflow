"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, LogOut } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserGroupsAcrossOrgs, removeUserFromGroup } from "@/actions/organization/group";

interface GroupsBadgeProps {
    open?: boolean;
}

export default function GroupsBadge({ open = true }: GroupsBadgeProps) {
    const { userId } = useAuth();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [confirmName, setConfirmName] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchGroups = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await getUserGroupsAcrossOrgs(userId);
            setGroups(data);
        } catch (error) {
            console.error("Failed to fetch groups:", error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const handleLeaveClick = (group: any) => {
        setSelectedGroup(group);
        setConfirmName("");
        setIsDialogOpen(true);
    };

    const handleConfirmLeave = async () => {
        if (!selectedGroup || !userId) return;
        if (confirmName !== selectedGroup.groupName) return;

        try {
            await removeUserFromGroup(selectedGroup.groupId, userId, selectedGroup.org_id);
            setIsDialogOpen(false);
            fetchGroups();
        } catch (error) {
            console.error("Failed to leave group:", error);
        }
    };

    if (!userId) return null;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className={`flex items-center justify-start w-full relative h-9 ${open ? 'px-4' : 'px-4'} hover:bg-accent rounded-lg transition-all`}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 flex-shrink-0" />
                            <div className={`overflow-hidden transition-all duration-200 ${open ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                                <p className="text-sm font-semibold whitespace-nowrap">Groups</p>
                            </div>
                        </div>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                    <div className="p-2 border-b">
                        <p className="text-sm font-medium">Your Groups</p>
                    </div>
                    {loading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : groups.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                No groups found
                            </p>
                        </div>
                    ) : (
                        <div className="max-h-[300px] overflow-y-auto">
                            {groups.map((group) => (
                                <div key={`${group.groupId}-${group.org_id}`} className="p-3 border-b last:border-b-0 flex justify-between items-center">
                                    <div className="space-y-1">
                                        <p className="font-medium text-sm">{group.groupName}</p>
                                        <p className="text-xs text-muted-foreground">{group.orgName}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleLeaveClick(group)}
                                        title="Leave Group"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Leave Group</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to leave <strong>{selectedGroup?.groupName}</strong> in <strong>{selectedGroup?.orgName}</strong>?
                            <br />
                            Type <strong>{selectedGroup?.groupName}</strong> to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder="Type group name"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmLeave}
                            disabled={confirmName !== selectedGroup?.groupName}
                        >
                            Leave Group
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

