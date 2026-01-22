import React from "react";
import { Model } from "@/lib/supabase/types";
import EditModelWizard from "./EditModelWizard";

interface EditModelFormProps {
  setActiveModel: (model: Model | null) => void;
  org_id: string;
  model: Model;
  isCreating?: boolean;
  onModelAdded?: (model: Model) => void;
}

const EditModelForm: React.FC<EditModelFormProps> = (props) => {
  return <EditModelWizard {...props} />;
};

export default EditModelForm;