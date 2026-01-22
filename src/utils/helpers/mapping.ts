import { useState, useEffect } from "react";
import { GroupMap, ModelMap } from "@/lib/supabase/types"

import { createLogger } from "@/lib/infrastructure/logger";
import { getAllModelGroups, getModelsDetails, getUserGroups } from "@/actions/chat/models";
import { addModelToGroup, addUserToGroup, getAllUserGroups, getGroup, getGroups, getModelGroups, removeModelFromGroup, removeUserFromGroup } from "@/actions/organization/group";
import { getUserProfile } from "@/actions/auth/users";

const logger = createLogger("mappingUtils.ts");

export const useAdminMapping = (org_id: string) => {

    const [modelGroups, setModelGroups] = useState<ModelMap[]>([]);
    const [userGroups, setUserGroups] = useState<GroupMap[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        logger.info("useAdminMapping hook initialized");

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [modelGroupsResult, userGroupsResult] = await Promise.all([
                    getAllModelGroups(org_id),
                    getAllUserGroups(org_id)
                ]);

                const initialModelGroups: ModelMap[] = Array.isArray(modelGroupsResult)
                    ? modelGroupsResult
                    : (modelGroupsResult as any)?.data ?? [];
                const initialUserGroups: GroupMap[] = Array.isArray(userGroupsResult)
                    ? userGroupsResult
                    : (userGroupsResult as any)?.data ?? [];

                logger.info("Fetched Model Groups", { count: initialModelGroups.length });
                setModelGroups(initialModelGroups);

                logger.info("Fetched User Groups", { count: initialUserGroups.length });
                setUserGroups(initialUserGroups);

            } catch (error) {
                logger.info("Error fetching mapping data", { error });
                setModelGroups([]);
                setUserGroups([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [org_id]);

    const updateUserGroup = async (id: string, group: string) => {
        try {
            logger.info("Updating User Group", { userId: id, groupId: group });

            const userExists = await getUserProfile(id);

            if (!userExists) {
                logger.info("User not found or error during fetch");
                return;
            }

            const userGroups = await getUserGroups(id);
            logger.info("Existing User Groups", { userId: id, groups: userGroups });
            const groupExists = userGroups.some(userGroup => userGroup.group_id === group);

            if (groupExists) {
                logger.info("Removing User from Group", { userId: id, groupId: group });
                await removeUserFromGroup(group, id, org_id);
            } else {
                logger.info("Adding User to Group", { userId: id, groupId: group });
                await addUserToGroup(group, id, org_id);

                logger.info("Added User to Group", { userId: id, groupId: group });
            }

            refreshGroups();
        } catch (error) {
            logger.info("Error updating User Group", { error });
        }
    };

    const handleUpdateModel = async (id: string, group: string) => {
        try {
            logger.info("Updating Model Group", { model_id: id, groupId: group });

            const modelExists = await getModelsDetails([id]);

            if (!modelExists) {
                logger.info("Model not found or error during fetch");
                return;
            }

            const groupExists = await getModelGroups(id, org_id);

            const groupList: string[] = groupExists.map(group => group.group_id);
            logger.info("Existing Model Groups", { model_id: id, groups: groupList });

            if (groupList.includes(group)) {
                logger.info("Removing Model from Group", { model_id: id, groupId: group });
                await removeModelFromGroup(id, group, org_id);
            } else {
                logger.info("Adding Model to Group", { model_id: id, groupId: group });
                await addModelToGroup(id, group, org_id);
            }

            refreshGroups();
        } catch (error) {
            logger.info("Error updating Model Group", { error });
        }
    };

    const refreshGroups = async () => {
        try {
            logger.info("Refreshing Group Data");

            const modelData = await getAllModelGroups(org_id);

            if (!modelData) {
                logger.info("Error fetching Model Groups");
                setModelGroups([]);
            } else {
                const normalizedModelGroups: ModelMap[] = Array.isArray(modelData)
                    ? modelData as ModelMap[]
                    : (modelData as any)?.data ?? [];
                setModelGroups(normalizedModelGroups);
                logger.info("Refreshed Model Groups", { count: normalizedModelGroups.length });
            }

            const userData = await getAllUserGroups(org_id);

            if (!userData) {
                logger.info("Error fetching User Groups");
                setUserGroups([]);
            } else {
                const normalizedUserGroups: GroupMap[] = Array.isArray(userData)
                    ? userData as GroupMap[]
                    : (userData as any)?.data ?? [];
                setUserGroups(normalizedUserGroups);
                logger.info("Refreshed User Groups", { count: normalizedUserGroups.length });
            }
        } catch (error) {
            logger.info("Error refreshing Groups", { error });
        }
    };

    return { modelGroups, userGroups, updateUserGroup, handleUpdateModel, isLoading };
};
