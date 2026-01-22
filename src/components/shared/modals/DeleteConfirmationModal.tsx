
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteOrgConfirmationModalProps {
  isOpen: boolean;
  selectedOrg: { id: string; name: string } | null;
  confirmOrgName: string;
  onConfirmNameChange: (name: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteOrgConfirmationModal: React.FC<DeleteOrgConfirmationModalProps> = ({
  isOpen,
  selectedOrg,
  confirmOrgName,
  onConfirmNameChange,
  onClose,
  onConfirm,
}) => {
  if (!selectedOrg) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm Leave Organization</DialogTitle>
          <DialogDescription>
            To leave {selectedOrg.name}, please type the organization name to confirm.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="confirm-org-name">Organization Name</Label>
            <Input
              id="confirm-org-name"
              type="text"
              value={confirmOrgName}
              onChange={(e) => onConfirmNameChange(e.target.value)}
              placeholder="Enter organization name"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={confirmOrgName !== selectedOrg.name}
          >
            Leave Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteOrgConfirmationModal;