import { useState, useEffect, useCallback } from 'react';
import { Model } from "@/lib/supabase/types"
import { addModel, getOrgModels, updateModel } from '@/actions/chat/models';
import { getModelsForUser } from '@/actions/chat/models-optimized';
import { createLogger } from '@/lib/infrastructure/logger';

const logger = createLogger('use-models');

export const useModels = (userId: string) => {
    const [models, setModels] = useState<Model[]>([]);
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchModels = useCallback(async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // Use optimized single query instead of 3 separate queries
            const modelsData = await getModelsForUser(userId);

            setModels(modelsData as Model[]);
            setSelectedModel(modelsData[0] || null);
        } catch (err) {
            logger.error('Error fetching models:', err);
            setError('Failed to fetch models.');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        fetchModels();
    }, [userId, fetchModels]);

    const refreshModels = () => {
        fetchModels();
    }

    return {
        models,
        selectedModel,
        setSelectedModel,
        isLoading,
        error,
        refreshModels
    };
};

export const useAdminModels = (org_id: string) => {
    const [models, setModels] = useState<Model[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchModels = useCallback(async () => {
        if (!org_id) {
            setModels([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await getOrgModels(org_id);
            if (data) {
                setModels(data as Model[]);
            } else {
                setModels([]);
            }
        } catch (error) {
            logger.error("Error fetching models:", error);
            setModels([]);
        } finally {
            setIsLoading(false);
        }
    }, [org_id]);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    const handleAddModel = async (model: Model) => {
        try {
            const data = await addModel(model);
            fetchModels();
        } catch (error) {
            logger.error("Error adding model:", error);
        }
    }

    const handleUpdateModel = async (model: Model) => {
        try {
            const data = await updateModel(model);

            fetchModels();
        } catch (error) {
            logger.error('Error updating model:', error);
        }
    }

    const getModelById = (id: string) => {
        return models.find((model) => model.id === id);
    }

    return {
        models, fetchModels, handleAddModel, handleUpdateModel, getModelById, isLoading
    };
};
