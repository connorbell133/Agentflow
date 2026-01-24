/**
 * Edit Preset As Custom Component
 *
 * Allows users to load a preset as a template and edit it,
 * creating a customized version while keeping the original preset as reference.
 */

import React from 'react';
import { Button } from '@/components/ui/button';

interface EditPresetAsCustomProps {
  presetName: string;
  presetDescription?: string;
  onEdit: () => void;
  disabled?: boolean;
  className?: string;
}

export const EditPresetAsCustom: React.FC<EditPresetAsCustomProps> = ({
  presetName,
  presetDescription,
  onEdit,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${className}`}>
      <h4 className="mb-2 text-sm font-medium">💡 Want to customize?</h4>

      <p className="mb-3 text-sm text-muted-foreground">
        Load &quot;{presetName}&quot; as a starting point and modify it to fit your needs.
        {presetDescription && ` ${presetDescription}`}
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onEdit}
        disabled={disabled}
        className="w-full"
      >
        <span className="mr-2">✏️</span>
        Edit This Preset as Custom
      </Button>

      <p className="mt-2 text-xs text-muted-foreground">
        Creates a copy you can modify while keeping the original preset as reference
      </p>
    </div>
  );
};

interface SaveAsPresetPromptProps {
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
  baseName?: string;
}

export const SaveAsPresetPrompt: React.FC<SaveAsPresetPromptProps> = ({
  onSave,
  onCancel,
  baseName = '',
}) => {
  const [name, setName] = React.useState(baseName ? `${baseName} (Custom)` : '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this preset');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preset');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-medium">Save as Organization Preset</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="preset-name" className="mb-2 block text-sm font-medium">
              Preset Name
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Custom Preset"
              className="w-full rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <p className="text-muted-foreground">
              This will create a new organization preset that your team can use.
              {baseName && ` It will be based on "${baseName}".`}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : 'Save Preset'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
