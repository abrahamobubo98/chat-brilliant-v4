import { Button } from "@/components/ui/button"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Info, SearchIcon } from "lucide-react"

export const Toolbar = () => {
    const workspaceId = useWorkspaceId()
    const { data } = useGetWorkspace({ id: workspaceId })

    return (
        <nav className="bg-[rgb(0,204,153)] flex items-center justify-between h-10 p-1.5">
            <div className="flex-1" />
            <div className="min-w-[280px] max-[642px] grow-[2] shrink">
                <Button size="sm" className="bg-accent/25 hover:bg-accent/25 w-full justify-start h-7 px-2">
                    <SearchIcon className="size-4 text-black mr-2" />
                    <span className="text-black">Search {data?.name} </span>
                </Button>
            </div>
            <div className="ml-auto flex-1 flex items-center justify-end">
                <Button variant="transparent" size="iconSm">
                    <Info className="size-4 text-black" />
                </Button>
            </div>
        </nav>
    );
};