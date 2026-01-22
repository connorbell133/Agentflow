import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { message_format_config, CustomField, FieldMapping } from "@/types/message-format";
import { createSampleTransformedMessage, validatemessage_format_config } from "@/utils/formatters/message";

interface MessageFormatMapperProps {
  config: message_format_config;
  onChange: (config: message_format_config) => void;
  className?: string;
}

const MessageFormatMapper: React.FC<MessageFormatMapperProps> = ({
  config,
  onChange,
  className = ""
}) => {
  // Available source fields from our internal message structure
  const sourceFields = ['role', 'content', 'created_at', 'id', 'literal'];

  // Transform options
  const transformOptions = ['none', 'timestamp'];

  // Validation
  const validation = useMemo(() => {
    return validatemessage_format_config(config as message_format_config);
  }, [config]);

  // Sample preview
  const sampleMessage = useMemo(() => {
    return createSampleTransformedMessage({
      content: "Hello, how are you?",
      role: "user",
      created_at: new Date().toISOString()
    }, config);
  }, [config]);

  const handleMappingChange = (fieldName: string, updates: Partial<FieldMapping>) => {
    const newMapping = { ...config.mapping };
    newMapping[fieldName] = { ...newMapping[fieldName], ...updates };
    onChange({ ...config, mapping: newMapping });
  };

  const addMapping = () => {
    const fieldName = `field_${Object.keys(config.mapping).length + 1}`;
    const newMapping = { ...config.mapping };
    newMapping[fieldName] = {
      source: 'content',
      target: '',
      transform: 'none'
    };
    onChange({ ...config, mapping: newMapping });
  };

  const removeMapping = (fieldName: string) => {
    const newMapping = { ...config.mapping };
    delete newMapping[fieldName];
    onChange({ ...config, mapping: newMapping });
  };

  const addCustomField = () => {
    const customFields = config.customFields || [];
    const newField: CustomField = {
      name: `custom_field_${customFields.length + 1}`,
      value: '',
      type: 'string'
    };
    onChange({
      ...config,
      customFields: [...customFields, newField]
    });
  };

  const updateCustomField = (index: number, updates: Partial<CustomField>) => {
    const customFields = [...(config.customFields || [])];
    customFields[index] = { ...customFields[index], ...updates };
    onChange({ ...config, customFields });
  };

  const removeCustomField = (index: number) => {
    const customFields = [...(config.customFields || [])];
    customFields.splice(index, 1);
    onChange({ ...config, customFields });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Message Format Mapping</CardTitle>
            <CardDescription>Configure how internal messages are formatted for this model</CardDescription>
          </div>
          {!validation.valid && (
            <Badge variant="destructive">Invalid Configuration</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Field Mappings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Field Mappings</Label>
            <Button type="button" variant="outline" size="sm" onClick={addMapping}>
              Add Mapping
            </Button>
          </div>

          {Object.entries(config.mapping).map(([fieldName, mapping], index) => (
            <div key={`mapping-${index}`} className="grid grid-cols-12 gap-3 items-end p-4 border rounded-lg">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Field Name</Label>
                <Input
                  value={fieldName}
                  onChange={(e) => {
                    const newMapping = { ...config.mapping };
                    const oldMapping = newMapping[fieldName];
                    delete newMapping[fieldName];
                    newMapping[e.target.value] = oldMapping;
                    onChange({ ...config, mapping: newMapping });
                  }}
                  placeholder="Field name"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Source</Label>
                <Select value={mapping.source} onValueChange={(value) =>
                  handleMappingChange(fieldName, { source: value as any })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceFields.map(field => (
                      <SelectItem key={field} value={field}>{field}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3">
                <Label className="text-xs text-muted-foreground">Target Path</Label>
                <Input
                  value={mapping.target}
                  onChange={(e) => handleMappingChange(fieldName, { target: e.target.value })}
                  placeholder="e.g. role, message.content"
                />
              </div>

              {mapping.source === 'literal' && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Literal Value</Label>
                  <Input
                    value={mapping.literalValue || ''}
                    onChange={(e) => handleMappingChange(fieldName, { literalValue: e.target.value })}
                    placeholder="Static value"
                  />
                </div>
              )}

              <div className={`${mapping.source === 'literal' ? 'col-span-2' : 'col-span-4'}`}>
                <Label className="text-xs text-muted-foreground">Transform</Label>
                <Select value={mapping.transform || 'none'} onValueChange={(value) =>
                  handleMappingChange(fieldName, { transform: value as any })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transformOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMapping(fieldName)}
                >
                  ×
                </Button>
              </div>

              {/* Role Mapping Section - Only show for role fields */}
              {mapping.source === 'role' && (
                <div className="col-span-12 mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Role Mapping Rules</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newRoleMapping = [...(mapping.roleMapping || []), { from: '', to: '' }];
                        handleMappingChange(fieldName, { roleMapping: newRoleMapping });
                      }}
                    >
                      Add Rule
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(mapping.roleMapping || []).map((roleMap, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1 text-xs text-muted-foreground text-center">If</div>
                        <div className="col-span-4">
                          <Select value={roleMap.from} onValueChange={(value) => {
                            const newRoleMapping = [...(mapping.roleMapping || [])];
                            newRoleMapping[idx] = { ...roleMap, from: value };
                            handleMappingChange(fieldName, { roleMapping: newRoleMapping });
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Source role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="assistant">assistant</SelectItem>
                              <SelectItem value="system">system</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 text-xs text-muted-foreground text-center">→</div>
                        <div className="col-span-4">
                          <Input
                            value={roleMap.to}
                            onChange={(e) => {
                              const newRoleMapping = [...(mapping.roleMapping || [])];
                              newRoleMapping[idx] = { ...roleMap, to: e.target.value };
                              handleMappingChange(fieldName, { roleMapping: newRoleMapping });
                            }}
                            placeholder="Target role (e.g., agent, bot, ai)"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newRoleMapping = [...(mapping.roleMapping || [])];
                              newRoleMapping.splice(idx, 1);
                              handleMappingChange(fieldName, { roleMapping: newRoleMapping });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!mapping.roleMapping || mapping.roleMapping.length === 0) && (
                      <div className="text-xs text-muted-foreground italic text-center py-2">
                        No role mapping rules. Roles will pass through unchanged.
                        <br />
                        <strong>Example:</strong> Map assistant → agent or user → human
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Custom Fields */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Custom Fields</Label>
            <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
              Add Custom Field
            </Button>
          </div>

          {(config.customFields || []).map((field, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 border rounded-lg">
              <div className="col-span-3">
                <Label className="text-xs text-muted-foreground">Field Path</Label>
                <Input
                  value={field.name}
                  onChange={(e) => updateCustomField(index, { name: e.target.value })}
                  placeholder="e.g. metadata.source"
                />
              </div>

              <div className="col-span-4">
                <Label className="text-xs text-muted-foreground">Value</Label>
                <Input
                  value={typeof field.value === 'string' ? field.value : JSON.stringify(field.value)}
                  onChange={(e) => {
                    let value: any = e.target.value;
                    if (field.type === 'object' || field.type === 'array') {
                      try {
                        value = JSON.parse(e.target.value);
                      } catch {
                        // Keep as string if invalid JSON
                      }
                    }
                    updateCustomField(index, { value });
                  }}
                  placeholder="Field value"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={field.type} onValueChange={(value) =>
                  updateCustomField(index, { type: value as any })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCustomField(index)}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Validation Errors */}
        {!validation.valid && (
          <div className="space-y-2">
            <Label className="text-base font-medium text-destructive">Configuration Errors</Label>
            <ul className="text-sm text-destructive space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Sample Output Preview</Label>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm font-mono overflow-x-auto">
              {JSON.stringify(sampleMessage, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageFormatMapper;