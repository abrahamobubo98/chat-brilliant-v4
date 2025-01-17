import { format } from "date-fns";

interface ConversationHeroProps {
    name: string;
    image: string;
}

export const ConversationHero = ({name, image}: ConversationHeroProps) => {
    return (
        <div className="mt-[88px] mx-5 mb-4">
            <p className="text-2xl font-bold">
                # {name}
            </p>
            <p className="font-normal text-slate-800 mb-4">
                This is a conversation with <strong>{name}</strong>
            </p>
        </div>
    );
};