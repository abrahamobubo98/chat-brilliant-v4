import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons/lib";
import Link from "next/link";

interface SidebarButtonProps {
    icon: LucideIcon | IconType;
    label: string;
    isActive: boolean;
    href?: string;
}

export const SidebarButton = ({ 
    icon: Icon, 
    label, 
    isActive,
    href
}: SidebarButtonProps) => {
    const button = (
            <div className="flex flex-col items-center justify-center gap-y-1 cursor-pointer group">
                <Button variant="transparent"
                 size="iconSm" 
                 className={cn(
                    "size-9 p-2 group-hover:bg-accent/20",
                    isActive && "bg-accent/20")}>
                    <Icon className="size-5 text-black group-hover:scale-110 transition-all" />
                </Button>
                <span className="text-11px text-black group-hover:text-accent">
                    {label}
                </span>
            </div>
    );

    if (href) {
        return (
            <Link href={href}>
                {button}
            </Link>
        );
    }

    return button;
}