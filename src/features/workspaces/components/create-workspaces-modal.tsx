"use client";
import { toast } from "sonner";
import { 
    Dialog,
    DialogContent, 
    DialogHeader, 
    DialogTitle
} from "@/components/ui/dialog";
import { useCreateWorkspaceModal } from "../store/use-create-workspace-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateWorkspace } from "../api/use-create-workspace";
import { useState } from "react";
import { useRouter } from "next/navigation";

export const CreateWorkspacesModal = () => {
    const router = useRouter();
    const [ name, setName ] = useState("");
    const [ open, setOpen ] = useCreateWorkspaceModal();
    

    const { mutate, isPending  } = useCreateWorkspace();

    const handleClose = () => {
        setOpen(false);
        setName("");
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleClose();
        mutate({name},{
            onSuccess(id){
                toast.success("Brilliant Group created successfully!!");
                router.push(`/workspace/${id}`);
            },
        })
         
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a Brilliant Group!!</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isPending} 
                    required
                    autoFocus
                    minLength={3}
                    placeholder="Brilliant Group Name e.g 'Work', 'Personal', etc."
                    />
                    <div className="flex justify-end">
                        <Button disabled={isPending} type="submit">
                            Create
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};