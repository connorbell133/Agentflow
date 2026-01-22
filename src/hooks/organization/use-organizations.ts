import { fetchOrg, requestOrgAdmin, isOpenRequest, createOrg, updateOrg, removeUserFromOrg } from "@/actions/organization/organizations";
import { useState, useEffect } from 'react';
import { Organization, Profile } from "@/lib/supabase/types"

export const useOrgs = (user: Profile | null | undefined) => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        setIsLoading(true);
        fetchOrg(user.id).then((data) => {
            setOrg(data.data || null);
            setIsLoading(false);
        });
    }, [user]);

    return { org, isLoading, requestOrgAdmin, isOpenRequest, createOrg, updateOrg, removeUserFromOrg };
};
