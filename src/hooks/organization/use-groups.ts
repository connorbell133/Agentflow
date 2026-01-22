import { useState, useEffect, useCallback } from 'react';
import { Group } from "@/lib/supabase/types"
import { addGroup, deleteGroup, getGroups } from '@/actions/organization/group';

export const useGroups = (org_id: string) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getGroups(org_id);
            setGroups(Array.isArray(data) ? data : []);
        } finally {
            setIsLoading(false);
        }
    }, [org_id]);

    useEffect(() => {
        if (org_id) {
            fetchGroups();
        }
    }, [org_id, fetchGroups]);

    const refreshGroups = () => {
        fetchGroups();
    };

    return { groups, isLoading, addGroup, refreshGroups, deleteGroup };
};
