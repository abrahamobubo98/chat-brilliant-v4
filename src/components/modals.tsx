"use client";

import { CreateWorkspacesModal } from "@/features/workspaces/components/create-workspaces-modal";
import { useEffect, useState } from "react";
import { CreateChannelModal } from "@/features/channels/components/create-channel-modal";

export const Modals = () => {

    const [ mounted, setMounted ] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <>
            <CreateChannelModal />
            <CreateWorkspacesModal />
        </>
    );
};