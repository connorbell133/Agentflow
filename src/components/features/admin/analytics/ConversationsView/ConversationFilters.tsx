"use client";

import React, { useState } from "react";
import { Profile, Model } from "@/lib/supabase/types";
import { ConversationFilters } from "@/actions/chat/conversations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ConversationFiltersProps {
  users: Profile[];
  models: Model[];
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
}

export function ConversationFiltersComponent({
  users,
  models,
  filters,
  onFiltersChange
}: ConversationFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ConversationFilters>(filters);

  const handleUserChange = (userId: string) => {
    const newFilters = { ...localFilters, userId: userId === "all" ? undefined : userId };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleModelChange = (model_id: string) => {
    const newFilters = { ...localFilters, model_id: model_id === "all" ? undefined : model_id };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    const newFilters = { ...localFilters, startDate: date };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    const newFilters = { ...localFilters, endDate: date };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const newFilters = {};
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = Object.keys(localFilters).some(key => localFilters[key as keyof ConversationFilters] !== undefined);

  return (
    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-card rounded-lg border">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium mb-2">User</label>
        <Select value={localFilters.userId || "all"} onValueChange={handleUserChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium mb-2">Model</label>
        <Select value={localFilters.model_id || "all"} onValueChange={handleModelChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All models" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.nice_name || model.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium mb-2">Start Date</label>
        <Input
          type="date"
          value={localFilters.startDate ? localFilters.startDate.toISOString().split('T')[0] : ''}
          onChange={handleStartDateChange}
          className="w-full"
        />
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium mb-2">End Date</label>
        <Input
          type="date"
          value={localFilters.endDate ? localFilters.endDate.toISOString().split('T')[0] : ''}
          onChange={handleEndDateChange}
          className="w-full"
        />
      </div>

      {hasActiveFilters && (
        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="mt-6"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}