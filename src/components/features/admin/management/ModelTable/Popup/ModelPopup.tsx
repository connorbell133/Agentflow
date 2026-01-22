"use client";

import React, { useEffect, useState } from "react";
import { Model, Group, GroupMap, ModelMap } from "@/lib/supabase/types"
import { createLogger } from "@/lib/infrastructure/logger";
import { v4 as uuidv4 } from "uuid";
const logger = createLogger("GroupTable.tsx");

interface ModelSettingsPopupProps {
  model: Model;
  groups: Group[];
  activeModel: Model | null;
  setActiveModel: (group: Model | null) => void;
  deleteModel: (id: string) => void;
  refreshModels: () => void;
  groupMap: GroupMap[];
  modelMap: ModelMap[];
}

const ModelSettingsPopup: React.FC<ModelSettingsPopupProps> = ({
  model,
  groups,
  activeModel,
  setActiveModel,
  deleteModel,
  refreshModels,
  groupMap,
  modelMap,
}) => {
  // Local state to hold the API key
  const [apiKey, setApiKey] = useState<string>("");

  // Re-initialize the API key whenever the popup opens
  useEffect(() => {
    if (activeModel) {
      setApiKey(uuidv4());
    }
  }, [activeModel]);

  // If no group is active, don't render the popup at all
  if (!activeModel) return null;

  // Handler for refreshing the API key
  const handleRefreshApiKey = () => {
    setApiKey(uuidv4());
  };

  return (
    <div className="relative bg-white rounded-lg shadow-2xl p-0 overflow-hidden h-[85vh] flex flex-col animate-fadeIn">
      {/* ——— Header with gradient ————————————————————————— */}
      <div className="relative p-6 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 text-white">
        {/* Title & Group ID */}
        <h3 className="text-2xl font-semibold">{model.nice_name}</h3>
        <p className="text-sm opacity-80">Model ID: {model.id}</p>

        {/* Close button */}
        <button
          onClick={() => setActiveModel(null)}
          className="absolute top-4 right-4 text-white hover:text-gray-100 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 "
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* ——— Content Scroll Area —————————————————————————— */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
        {/* Group Info */}
        <div className="rounded-md bg-white p-4 shadow-sm">
          <h4 className="font-medium text-gray-800">Description</h4>
          <p className="text-sm text-gray-600 mt-1">{model.description}</p>
        </div>

        <div className="rounded-md bg-white p-4 shadow-sm">
          <h4 className="font-medium text-gray-800">Organization</h4>
          <p className="text-sm text-gray-600 mt-1">{model.org_id}</p>
        </div>

        {/* Users */}
        <div className="rounded-md bg-white p-4 shadow-sm">
          <h4 className="font-medium text-gray-800 mb-2">Groups</h4>
          {groupMap
            .filter((gm) => gm.group_id === model.id)
            .map((gm) => {
              const user = groups.find((u) => u.id === gm.group_id);
              if (!user) return null;
              return (
                <p key={gm.id} className="text-sm text-gray-700">
                  {user.role}
                </p>
              );
            })}
        </div>
      </div>

      {/* ——— Footer Buttons ———————————————————————————— */}
      <div className="p-4 bg-white border-t border-gray-200 flex justify-end space-x-2">
        <button
          onClick={() => setActiveModel(null)}
          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
        >
          Close
        </button>
        <button
          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
          onClick={() => {
            deleteModel(model.id);
            setActiveModel(null);
            refreshModels();
          }}
        >
          Delete Group
        </button>
      </div>
    </div>
  );
};

export default ModelSettingsPopup;
