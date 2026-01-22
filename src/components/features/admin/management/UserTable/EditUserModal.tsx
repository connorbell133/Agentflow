"use client";

import React, { useMemo, useState } from "react";
import { Profile, Group, GroupMap } from "@/lib/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserGroupSelector from "@/components/features/admin/selectors/GroupSelector/UserGroupSelector";

interface EditUserModalProps {
    user: Profile | null;
    open: boolean;
    onClose: () => void;
    onSaveProfile: (userId: string, profile: Partial<Profile>) => Promise<void> | void;
    groups: Group[];
    userGroups: GroupMap[];
    updateUserGroup: (userId: string, groupId: string) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, open, onClose, onSaveProfile, groups, userGroups, updateUserGroup }) => {
    const [fullName, setFullName] = useState<string>(user?.full_name || "");
    const [email, setEmail] = useState<string>(user?.email || "");
    const canSave = useMemo(() => fullName !== (user?.full_name || "") || email !== (user?.email || ""), [fullName, email, user]);

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-muted-foreground">Full name</label>
                            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">Email</label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-muted-foreground">Groups</label>
                        <div className="mt-2">
                            <UserGroupSelector
                                groups={groups}
                                groupsAssigned={userGroups}
                                updateGroups={updateUserGroup}
                                id={user.id}
                                type="user"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={async () => { await onSaveProfile(user.id, { full_name: fullName, email }); onClose(); }} disabled={!canSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditUserModal;


