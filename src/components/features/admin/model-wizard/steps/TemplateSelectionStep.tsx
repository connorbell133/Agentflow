/**
 * Template Selection Step (Step 0)
 *
 * Initial step in the wizard that allows users to:
 * 1. Select a template (system or org presets)
 * 2. Start from scratch (no template mode)
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Search, Sparkles, Code2, Zap, FileCode } from 'lucide-react';
import type { StepProps } from '@/types/ui/wizard.types';
import type { ModelConfigPreset } from '@/types/event-mapping';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils/shared/cn';

interface TemplateSelectionStepProps {
  state: any;
  updateState: (updates: any) => void;
  templates: ModelConfigPreset[];
  onTemplateSelect: (templateId: string | null) => void;
  isLoadingTemplates?: boolean;
}

const categoryIcons = {
  openai: Sparkles,
  anthropic: Zap,
  langchain: Code2,
  custom: FileCode,
};

const categoryColors = {
  openai: 'bg-emerald-500',
  anthropic: 'bg-amber-500',
  langchain: 'bg-blue-500',
  custom: 'bg-purple-500',
};

export default function TemplateSelectionStep({
  state,
  updateState,
  templates,
  onTemplateSelect,
  isLoadingTemplates,
}: TemplateSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ModelConfigPreset | null>(null);

  // Derive selected template from wizard state to maintain consistency across step navigation
  const selectedTemplate = useMemo(() => {
    if (state.selectedTemplateId) {
      return templates.find(t => t.id === state.selectedTemplateId) || null;
    }
    return null;
  }, [state.selectedTemplateId, templates]);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const filtered = templates.filter(
      template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, ModelConfigPreset[]> = {
      openai: [],
      anthropic: [],
      langchain: [],
      custom: [],
    };

    filtered.forEach(template => {
      if (groups[template.category]) {
        groups[template.category].push(template);
      }
    });

    return groups;
  }, [templates, searchQuery]);

  const handleSelectTemplate = useCallback(
    (template: ModelConfigPreset) => {
      // Don't re-apply defaults if this template is already selected
      // This prevents overwriting user's modifications when clicking the same template
      if (state.selectedTemplateId === template.id) {
        return;
      }

      onTemplateSelect(template.id);
      updateState({ templateMode: 'preset', selectedTemplateId: template.id });
    },
    [state.selectedTemplateId, onTemplateSelect, updateState]
  );

  const handleStartFromScratch = useCallback(() => {
    onTemplateSelect(null);
    updateState({ templateMode: 'custom', selectedTemplateId: null });
  }, [onTemplateSelect, updateState]);

  const handlePreview = (template: ModelConfigPreset) => {
    setPreviewTemplate(template);
    setShowPreviewDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Choose Your Starting Point</h2>
        <p className="text-muted-foreground">
          Select a template to get started quickly, or build from scratch for full control
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Template Grid */}
      <div className="max-h-[500px] space-y-6 overflow-y-auto pr-2">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
          if (categoryTemplates.length === 0) return null;

          const Icon = categoryIcons[category as keyof typeof categoryIcons];

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <h3 className="font-semibold capitalize">{category}</h3>
                <span className="text-xs text-muted-foreground">({categoryTemplates.length})</span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {categoryTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    onSelect={() => handleSelectTemplate(template)}
                    onPreview={() => handlePreview(template)}
                    categoryColor={categoryColors[category as keyof typeof categoryColors]}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* No Results */}
        {Object.values(groupedTemplates).every(group => group.length === 0) && (
          <div className="py-12 text-center text-muted-foreground">
            <Search className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p>No templates found matching &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      {/* Start from Scratch */}
      <button
        type="button"
        onClick={handleStartFromScratch}
        className="group w-full rounded-lg border-2 border-dashed border-border p-6 text-left transition-colors hover:border-primary hover:bg-accent"
      >
        <div className="flex items-start gap-4">
          <div className="group-hover:bg-primary/10 rounded-lg bg-muted p-3 transition-colors">
            <FileCode className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 font-semibold">Start from Scratch</h3>
            <p className="text-sm text-muted-foreground">
              Build your configuration manually without template guidance. Best for custom endpoints
              or advanced users.
            </p>
          </div>
        </div>
      </button>

      {/* Current Selection Display */}
      <div className="pt-4 text-center">
        {selectedTemplate ? (
          <div className="bg-primary/5 rounded-lg border border-primary p-4">
            <p className="mb-1 text-sm text-muted-foreground">Selected Template</p>
            <p className="font-semibold">{selectedTemplate.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &quot;Next&quot; below to continue with this template
            </p>
          </div>
        ) : state.templateMode === 'custom' ? (
          <div className="rounded-lg border border-border bg-muted p-4">
            <p className="font-semibold">Building from Scratch</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &quot;Next&quot; below to continue without a template
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a template or start from scratch to continue
          </p>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle>{previewTemplate.name}</DialogTitle>
                <DialogDescription>{previewTemplate.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 font-semibold">Pre-configured Fields</h4>
                  <div className="space-y-2">
                    {previewTemplate.field_metadata &&
                    Object.keys(previewTemplate.field_metadata).length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(previewTemplate.field_metadata).map(
                          ([fieldPath, metadata]: [string, any]) => (
                            <div
                              key={fieldPath}
                              className="flex items-center justify-between rounded bg-muted p-2 text-sm"
                            >
                              <span className="font-mono text-xs">{fieldPath}</span>
                              <span
                                className={cn(
                                  'rounded px-2 py-0.5 text-xs font-medium',
                                  metadata.state === 'FIXED' && 'bg-gray-200 text-gray-700',
                                  metadata.state === 'EDITABLE' && 'bg-green-100 text-green-700',
                                  metadata.state === 'PLACEHOLDER' && 'bg-blue-100 text-blue-700'
                                )}
                              >
                                {metadata.state}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        This template has basic event mappings configured.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">What You&apos;ll Need to Provide</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {previewTemplate.field_metadata &&
                    Object.values(previewTemplate.field_metadata).some(
                      (m: any) => m.state === 'PLACEHOLDER'
                    ) ? (
                      Object.entries(previewTemplate.field_metadata)
                        .filter(([, metadata]: [string, any]) => metadata.state === 'PLACEHOLDER')
                        .map(([fieldPath, metadata]: [string, any]) => (
                          <li key={fieldPath}>
                            <strong>{fieldPath}</strong>: {metadata.helpText || 'Required'}
                          </li>
                        ))
                    ) : (
                      <li>API endpoint URL</li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreviewDialog(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      handleSelectTemplate(previewTemplate);
                      setShowPreviewDialog(false);
                    }}
                    className="flex-1"
                  >
                    Use This Template
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========================================
   Template Card Component
   ======================================== */

interface TemplateCardProps {
  template: ModelConfigPreset;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  categoryColor: string;
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onPreview,
  categoryColor,
}: TemplateCardProps) {
  return (
    <div
      className={cn(
        'relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md',
        isSelected ? 'bg-primary/5 border-primary' : 'hover:border-primary/50 border-border'
      )}
      onClick={onSelect}
    >
      {/* System/Org Badge */}
      <div className="absolute right-2 top-2">
        <span
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium',
            template.is_system
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
          )}
        >
          {template.is_system ? 'System' : 'Org'}
        </span>
      </div>

      {/* Category Indicator */}
      <div className={cn('absolute left-0 top-4 h-12 w-1 rounded-r', categoryColor)} />

      {/* Content */}
      <div className="pl-3">
        <h4 className="mb-1 pr-16 font-semibold">{template.name}</h4>
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
          {template.description || 'No description provided'}
        </p>

        {/* Preview Button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onPreview();
          }}
          className="text-xs text-primary hover:underline"
        >
          Preview fields →
        </button>
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
