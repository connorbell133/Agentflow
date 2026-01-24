import React, { useState } from 'react';
import { ModelMap, Model, Group } from '@/lib/supabase/types';
import { createLogger } from '@/lib/infrastructure/logger';
import GenericTable from '@/components/common/tables/BaseTable';
import ModelGroupSelector from '@/components/features/admin/selectors/GroupSelector/modelGroupSelector';
import EditModelForm from '../AddModel/EditModel';
const logger = createLogger('ModelGroupSelector.tsx');

interface GroupTableProps {
  models: Model[];
  groups: Group[];
  modelGroups: ModelMap[];
  updateModelGroup: (id: string, group: string) => void;
  handleAddModel: (model: Model) => void;
}

const ModelTable: React.FC<GroupTableProps> = ({
  models,
  groups,
  modelGroups,
  updateModelGroup,
}: GroupTableProps) => {
  const [activeModel, setActiveModel] = useState<Model | null>(null);

  const handleEditClick = (model: Model) => {
    logger.info(`Edit button clicked for group: ${model.id}`);
    setActiveModel(model);
  };
  const renderRow = (model: Model) => (
    <tr key={model.model_id}>
      <td className="px-6 py-4">{model.nice_name}</td>
      <td className="px-6 py-4">{model.description}</td>
      <td className="px-6 py-4">
        {(() => {
          const endpoint = (model as any)?.endpoint as string | undefined;
          if (endpoint && endpoint.length > 50) {
            return endpoint.substring(0, 50) + '...';
          }
          return endpoint || '';
        })()}
      </td>
      <td className="px-6 py-4">{(model as any)?.method || 'POST'}</td>
      <td className="px-6 py-4">{model.response_path}</td>
      <td className="px-6 py-4">
        <ModelGroupSelector
          groups={groups}
          groupsAssigned={modelGroups}
          updateGroups={updateModelGroup}
          id={model.id}
          type="model"
        />
      </td>
      <td className="px-6 py-4">
        <button
          onClick={() => handleEditClick(model)}
          className="hover:bg-primary/90 rounded bg-primary px-4 py-2 text-primary-foreground"
        >
          Edit
        </button>
      </td>
    </tr>
  );
  return (
    <>
      <GenericTable
        data={models}
        headers={['Name', 'Description', 'Endpoint', 'Method', 'Response Path', 'Group', 'Actions']}
        renderRow={renderRow}
        getId={model => model.id}
      />
      {/* Conditionally render the popup if `activeGroup` is set */}
      {activeModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-4xl sm:mx-6 lg:mx-8">
            <EditModelForm
              model={activeModel}
              setActiveModel={setActiveModel}
              org_id={activeModel.org_id}
              isCreating={false}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ModelTable;
