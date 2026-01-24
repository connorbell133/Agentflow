'use client';

import React, { useState } from 'react';
import { Model } from '@/lib/supabase/types';
import ModelCard from '@/components/features/admin/management/ModelCard';
import EditModelForm from '@/components/features/admin/management/AddModel/EditModel';
import { useAdminData } from '@/contexts/AdminDataContext';
import { SkeletonCard } from '@/components/shared/cards/SkeletonCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteModel } from '@/actions/chat/models';
import { exportModelAsYAML } from '@/actions/chat/model-configs';
import { createLogger } from '@/lib/infrastructure/logger';
import ImportModelModal from '@/components/features/admin/modals/ImportModelModal';
import { Upload } from 'lucide-react';

const logger = createLogger('Models.tsx');

interface ModelsProps {
  org_id: string;
}

export default function Models({ org_id }: ModelsProps) {
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deletingModel, setDeletingModel] = useState<Model | null>(null);
  const [confirmModelName, setConfirmModelName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Use centralized admin data
  const { models, groups, modelGroups, isLoading, addModel, refreshModels } = useAdminData();

  // Don't fetch data if org_id is empty
  if (!org_id) {
    return <div className="p-4 text-center text-gray-500">Organization setup required</div>;
  }

  const handleAddClick = () => {
    setIsAddingModel(true);
  };

  const handleCloseAddModel = (model?: Model | null) => {
    setIsAddingModel(false);
  };

  const handleModelAdded = async (model: Model) => {
    await addModel(model);
    setIsAddingModel(false);
  };

  const handleEditModel = (model: Model) => {
    console.log('Edit model clicked:', model.nice_name, model);
    setEditingModel(model);
  };

  const handleCloseEditModel = (model?: Model | null) => {
    setEditingModel(null);
  };

  const handleDeleteClick = (model: Model) => {
    setDeletingModel(model);
    setConfirmModelName('');
  };

  const handleDeleteConfirm = async () => {
    if (
      !deletingModel ||
      confirmModelName !== (deletingModel.nice_name || deletingModel.model_id)
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteModel(deletingModel.id, org_id);
      await refreshModels(); // Refresh the models list
      setDeletingModel(null);
      setConfirmModelName('');
    } catch (error) {
      logger.error('Error deleting model:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingModel(null);
    setConfirmModelName('');
  };

  const handleExportModel = async (model: Model) => {
    try {
      const result = await exportModelAsYAML(model.id, {
        includeApiKey: false,
        maskApiKey: true,
      });

      if (result.success && result.yaml && result.filename) {
        // Create blob and download
        const blob = new Blob([result.yaml], { type: 'application/x-yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        logger.info('Model exported successfully', {
          model_id: model.id,
          filename: result.filename,
        });
      } else {
        logger.error('Export failed', { error: result.error });
        alert(`Export failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error exporting model:', error);
      alert('An error occurred while exporting the model');
    }
  };

  const handleImportSuccess = async (model: Model) => {
    logger.info('Model imported successfully', {
      model_id: model.id,
      name: model.nice_name || model.model_id,
    });
    await refreshModels();
  };

  // Helper function to get groups for a specific model
  const getModelGroups = (model_id: string): string[] => {
    if (!modelGroups) return [];
    return modelGroups
      .filter(mapping => mapping.model_id === model_id)
      .map(mapping => {
        const group = groups.find(g => g.id === mapping.group_id);
        return group?.role || '';
      })
      .filter(role => role !== '');
  };

  return (
    <>
      {/* Header with title and action buttons */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">AI Connections</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            size="sm"
            variant="outline"
            className="h-10"
            data-testid="model-import-button"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button
            onClick={handleAddClick}
            size="sm"
            className="hover:bg-primary/90 h-10 w-10 rounded-full bg-primary p-0"
            data-testid="model-add-button"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Models grid */}
      {isLoading && models.length === 0 ? (
        <div
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          data-testid="models-loading-grid"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          data-testid="models-grid"
        >
          {models.map(model => (
            <ModelCard
              key={model.id}
              id={model.id}
              name={model.nice_name || model.model_id || 'Unnamed Model'}
              description={model.description || 'No description available'}
              modelType={(() => {
                const endpoint = (model as any)?.endpoint as string | undefined;
                if (endpoint && endpoint.length > 40) {
                  return endpoint.substring(0, 40) + '...';
                }
                return endpoint || 'No endpoint configured';
              })()}
              tags={getModelGroups(model.id)}
              status="online"
              onClick={() => console.log(`Selected model: ${model.nice_name}`)}
              onEdit={() => handleEditModel(model)}
              onDelete={() => handleDeleteClick(model)}
              onExport={() => handleExportModel(model)}
            />
          ))}
        </div>
      )}

      {/* Add model modal */}
      {isAddingModel && (
        <EditModelForm
          setActiveModel={handleCloseAddModel}
          org_id={org_id}
          model={{
            id: '',
            model_id: '',
            schema: '',
            description: '',
            nice_name: '',
            org_id: org_id,
            endpoint: '',
            method: 'POST',
            response_path: '',
            created_at: new Date().toISOString(),
            headers: {},
            body_config: {},
            message_format_config: {
              mapping: {
                role: { source: 'role', target: 'role', transform: 'none' },
                content: { source: 'content', target: 'content', transform: 'none' },
              },
            },
            suggestion_prompts: null,
            endpoint_type: 'webhook',
            stream_config: null,
            template_id: null,
            template_mode: 'none',
            template_modified_fields: {},
          }}
          isCreating={true}
          onModelAdded={handleModelAdded}
        />
      )}

      {/* Edit model modal */}
      {editingModel && (
        <>
          {console.log('Rendering edit modal for:', editingModel.nice_name)}
          <EditModelForm
            setActiveModel={handleCloseEditModel}
            org_id={org_id}
            model={editingModel}
            isCreating={false}
          />
        </>
      )}

      {/* Import modal */}
      <ImportModelModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        org_id={org_id}
        onImportSuccess={handleImportSuccess}
      />

      {/* Delete confirmation modal */}
      {deletingModel && (
        <Dialog open={true} onOpenChange={handleDeleteCancel}>
          <DialogContent className="max-w-sm" data-testid="delete-model-dialog">
            <DialogHeader>
              <DialogTitle>Confirm Delete AI Connection</DialogTitle>
              <DialogDescription>
                To delete {deletingModel.nice_name || deletingModel.model_id}, please type the AI
                connection name to confirm. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="confirm-model-name">AI Connection Name</Label>
                <Input
                  id="confirm-model-name"
                  type="text"
                  value={confirmModelName}
                  onChange={e => setConfirmModelName(e.target.value)}
                  placeholder="Enter AI connection name"
                  className="mt-1"
                  data-testid="delete-model-confirm-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                data-testid="delete-model-cancel-button"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={
                  confirmModelName !== (deletingModel.nice_name || deletingModel.model_id) ||
                  isDeleting
                }
                data-testid="delete-model-confirm-button"
              >
                {isDeleting ? 'Deleting...' : 'Delete AI Connection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
