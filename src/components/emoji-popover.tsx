import { useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from "@/components/ui/popover";

import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip";

interface EmojiData {
    native: string;
    id: string;
    [key: string]: unknown;
}

interface EmojiPopoverProps {
    children: React.ReactNode;
    hint?: string;
    onEmojiSelect: (emoji: EmojiData) => void;
};

export const EmojiPopover = ({ 
    children, 
    hint="Emoji", 
    onEmojiSelect }: EmojiPopoverProps) => {

    const [popoverOpen, setPopoverOpen] = useState(false);
    const [tooltipOpen, setTooltipOpen] = useState(false);

    // const onSelect = (emoji: any) => {
    //     onEmojiSelect(emoji.native);
    //     setPopoverOpen(false);

    //     setTimeout(() => {
    //         setTooltipOpen(false);
    //     }, 500);
    // };

    return (
        <TooltipProvider>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <Tooltip
                open={tooltipOpen}
                onOpenChange={setTooltipOpen}
                delayDuration={50}
                >
                    <PopoverTrigger asChild>
                        <TooltipTrigger asChild>
                            {children}
                        </TooltipTrigger>
                    </PopoverTrigger>
                    <TooltipContent className="bg-white text-black border border-white/5">
                        <p className="font-medium text-xs">{hint}</p>
                    </TooltipContent>
                </Tooltip>
                <PopoverContent className="p-0 w-full border-none shadow-none">
                    <Picker
                    data={data}
                    onEmojiSelect = {onEmojiSelect}
                    />
                </PopoverContent>
            </Popover>
        </TooltipProvider>
        );
    };