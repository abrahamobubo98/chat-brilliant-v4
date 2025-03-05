import { 
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { toast } from "sonner";
import { useNewJoinCode } from "@/features/workspaces/api/use-new-join-code";
import { useConfirm } from "@/hooks/use-confirm";

interface InviteModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    name: string;
    joinCode: string;
};  

export const InviteModal = ({ 
    open, 
    setOpen, 
    name, 
    joinCode 
}: InviteModalProps) => {
    const workspaceId = useWorkspaceId();
    const [ConfirmDialog, confirm] = useConfirm(
        "Are you sure??",
        "This would deactivate the current invite code"
    );

    const handleNewJoinCode = async () => {
        const ok = await confirm();
        if (!ok) return;

        mutate({ workspaceId }, {
            onSuccess: () => {
                toast.success("New join code generated");
            },
            onError: (error) => {
                console.error(error);
                toast.error("Failed to generate new invite code");
            },
        });
    }

    const { mutate, isPending } = useNewJoinCode();

    const handleCopy = () => {
        const inviteLink = `${window.location.origin}/join/${workspaceId}`;

        navigator.clipboard
            .writeText(inviteLink)
            .then(() => {
                toast.success("Link copied to clipboard");
            })
            
    };
    
    return (
        <>
        <ConfirmDialog />
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite People to {name}!!</DialogTitle>
                    <DialogDescription>
                        Use the code below to invite people to {name}:
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-y-4 items-center justify-center p-y-10">
                    <p className="text-4xl font-bold tracking-widest uppercase">
                        {joinCode}
                    </p>
                    <Button
                    onClick={handleCopy}
                    variant="ghost"
                    size="sm">
                        <CopyIcon className="size-4 ml-2" />
                        Copy Link
                    </Button>
                </div>
                <div className="flex items-center justify-between w-full">
                    <Button disabled={isPending} onClick={handleNewJoinCode} variant="outline">
                        New Invite Code
                        <RefreshCcwIcon className="size-4 ml-2" />
                    </Button>
                    <DialogClose asChild>
                        <Button>Close</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
};