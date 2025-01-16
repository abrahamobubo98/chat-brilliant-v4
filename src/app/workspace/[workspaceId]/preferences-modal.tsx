import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter
} from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "lucide-react";
import { useUpdateWorkspace } from "@/features/workspaces/api/use-update-workspace";
import { useRemoveWorkspace } from "@/features/workspaces/api/use-remove-workspace";
import { Input } from "@/components/ui/input";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/use-confirm";

interface PreferencesModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    initialValue: string;
}

export const PreferencesModal = ({ 
    open,
    setOpen,
    initialValue
}: PreferencesModalProps) => {
    const router = useRouter();
    const workspaceId = useWorkspaceId();
    const [ConfirmDialog, confirm] = useConfirm(
        "Are you sure you want to delete this Group?",
        "This action cannot be undone."
    );

    const [value, setValue] = useState(initialValue);
    const [editOpen, setEditOpen] = useState(false);

    const { mutate: updateWorkspace, isPending: isUpdatingWorkspace } = useUpdateWorkspace();
    const { mutate: removeWorkspace, isPending: isRemovingWorkspace } = useRemoveWorkspace();

    const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        updateWorkspace({ 
            id: workspaceId, 
            name: value 
        }, {
            onSuccess: () => {
                setEditOpen(false);
                toast.success("GroupName name updated successfully!!");
            },
            onError: () => {
                toast.error("Failed to update GroupName name!!");
            }
        });
        
    };

    const handleRemove = async () => {
        const ok = await confirm();

        if (!ok) return;

        removeWorkspace({ 
            id: workspaceId 
        }, {
            onSuccess: () => {
                toast.success("Group deleted successfully!!");
                router.replace("/");
            },
            onError: () => {
                toast.error("Failed to delete Group!!");
            }
        });
    };

    return (
        <>
        <ConfirmDialog />
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 bg-gray-50 overflow-hidden">
                <DialogHeader className="p-4 border-b bg-white">
                    <DialogTitle>
                        {value}
                    </DialogTitle>
                </DialogHeader>
                <div className="px-4 pb-4 flex flex-col gap-y-2">
                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                        <DialogTrigger asChild>
                            <div className="px-5 py-4 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold">
                                        Workspace Name
                                    </p>
                                    <p className="text-sm text-[#1264a3] hover:underline font-semibold">
                                        Edit
                                    </p>
                                </div>
                                <p className="text-sm">
                                    {value}
                                </p>
                            </div>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    Rename this Workspace
                                </DialogTitle>
                            </DialogHeader>
                            <form className="space-y-4" onSubmit={handleEdit}>
                                <Input
                                value={value}
                                disabled={isUpdatingWorkspace}
                                onChange={(e) => setValue(e.target.value)}
                                required
                                autoFocus
                                minLength={3}
                                maxLength={80}
                                placeholder="Brilliant Group Name e.g 'Work', 'Personal', etc."
                                />
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" disabled={isUpdatingWorkspace}>
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button disabled={isUpdatingWorkspace}>
                                        Save
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Button
                    disabled={isRemovingWorkspace}
                    onClick={() => {handleRemove()}}
                    className="flex items-center gap-x-2 px-5 py-4 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 text-rose-600">
                        <TrashIcon className="size-4"/>
                        <p className="text-sm font-semibold">
                            Delete Workspace
                        </p>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
};