"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { validateYAMLConfig, importModelFromYAML } from "@/actions/chat/model-configs";
import { Model } from "@/lib/supabase/types";

interface ImportModelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org_id: string;
  onImportSuccess?: (model: Model) => void;
}

export default function ImportModelModal({
  open,
  onOpenChange,
  org_id,
  onImportSuccess
}: ImportModelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [yamlContent, setYamlContent] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    errors?: { field: string; message: string }[];
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    error?: string;
    warning?: string;
  } | null>(null);
  const [replaceIfExists, setReplaceIfExists] = useState(false);
  const [importApiKey, setImportApiKey] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationResult(null);
      setImportResult(null);

      // Read file content
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setYamlContent(content);
      };
      reader.readAsText(selectedFile);
    }
  }, []);

  const handleValidate = useCallback(async () => {
    if (!yamlContent) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await validateYAMLConfig(yamlContent);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        success: false,
        errors: [
          {
            field: "unknown",
            message: error instanceof Error ? error.message : "Validation failed"
          }
        ]
      });
    } finally {
      setIsValidating(false);
    }
  }, [yamlContent]);

  const handleReset = useCallback(() => {
    setFile(null);
    setYamlContent("");
    setValidationResult(null);
    setImportResult(null);
    setReplaceIfExists(false);
    setImportApiKey(false);
  }, []);

  const handleImport = useCallback(async () => {
    if (!yamlContent || !validationResult?.success) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importModelFromYAML(yamlContent, org_id, {
        replaceIfExists,
        importApiKey
      });

      setImportResult(result);

      if (result.success && result.model && onImportSuccess) {
        onImportSuccess(result.model);
        // Close modal after short delay to show success message
        setTimeout(() => {
          onOpenChange(false);
          handleReset();
        }, 1500);
      }
    } catch (error) {
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : "Import failed"
      });
    } finally {
      setIsImporting(false);
    }
  }, [yamlContent, org_id, replaceIfExists, importApiKey, validationResult, onImportSuccess, onOpenChange, handleReset]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.yaml') || droppedFile.name.endsWith('.yml')) {
      const event = {
        target: { files: [droppedFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(event);
    }
  }, [handleFileChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import AI Connection Configuration</DialogTitle>
          <DialogDescription>
            Upload a YAML configuration file to import an AI connection. The configuration will be validated before import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          <div
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".yaml,.yml"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">Drop YAML file here or click to upload</p>
                <p className="text-sm text-gray-500">Supports .yaml and .yml files</p>
              </>
            )}
          </div>

          {/* Options */}
          {file && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="replace-exists"
                  checked={replaceIfExists}
                  onCheckedChange={(checked) => setReplaceIfExists(checked as boolean)}
                  data-testid="import-replace-if-exists-checkbox"
                />
                <Label htmlFor="replace-exists" className="cursor-pointer" data-testid="import-replace-if-exists-label">
                  Replace if AI connection with same name exists
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="import-key"
                  checked={importApiKey}
                  onCheckedChange={(checked) => setImportApiKey(checked as boolean)}
                  data-testid="import-api-key-checkbox"
                />
                <Label htmlFor="import-key" className="cursor-pointer" data-testid="import-api-key-label">
                  Import API key (if present in config)
                </Label>
              </div>
            </div>
          )}

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-4 rounded-lg border ${validationResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
              <div className="flex items-start gap-3">
                {validationResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${validationResult.success
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-red-900 dark:text-red-100'
                    }`}>
                    {validationResult.success ? 'Configuration is valid' : 'Validation errors found'}
                  </p>
                  {validationResult.errors && validationResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-red-800 dark:text-red-200">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>
                          <span className="font-medium">{error.field}:</span> {error.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className={`p-4 rounded-lg border ${importResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${importResult.success
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-red-900 dark:text-red-100'
                    }`}>
                    {importResult.success ? 'AI connection imported successfully!' : 'Import failed'}
                  </p>
                  {importResult.error && (
                    <p className="mt-1 text-sm text-red-800 dark:text-red-200">{importResult.error}</p>
                  )}
                  {importResult.warning && (
                    <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">{importResult.warning}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); handleReset(); }}>
            Cancel
          </Button>

          {file && !validationResult && (
            <Button onClick={handleValidate} disabled={isValidating} data-testid="import-validate-button">
              {isValidating ? "Validating..." : "Validate"}
            </Button>
          )}

          {validationResult?.success && !importResult?.success && (
            <Button onClick={handleImport} disabled={isImporting} data-testid="import-submit-button">
              {isImporting ? "Importing..." : "Import AI Connection"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
