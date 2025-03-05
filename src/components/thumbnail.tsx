import { 
    Dialog, 
    DialogContent,
    DialogTitle,
    DialogTrigger 
} from "@/components/ui/dialog";
import Image from "next/image";

interface ThumbnailProps {
    url: string | null | undefined;
}

export const Thumbnail = ({url}: ThumbnailProps) => {
    if (!url) return null;

    return (
        <Dialog>
            <DialogTrigger>
                <div className="relative overflow-hidden max-w-[360px] border rounded-lg my-2 cursor-zoom-in">
                    <Image 
                        src={url} 
                        alt="Message Image" 
                        className="rounded-md object-cover"
                        width={360}
                        height={240}
                        style={{ width: '100%', height: 'auto' }}
                    />
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-[800px] border-none bg-transparent p-0 shadow-none">
                <DialogTitle className="sr-only">Image</DialogTitle>
                <Image 
                    src={url} 
                    alt="Message Image" 
                    className="rounded-md object-cover"
                    width={800}
                    height={600}
                    style={{ width: '100%', height: 'auto' }}
                />
            </DialogContent>
        </Dialog>
    );
};