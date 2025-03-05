import { useMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { useCallback, useState, useMemo } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

type RequestType = { 
    body: string, 
    id: Id<"messages">,
};

type ResponseType = Id<"messages">  | null;

type options = {
    onSuccess?: (data: ResponseType) => void;
    onError?: (error: Error) => void;
    onSettled?: () => void;
    throwError?: boolean;
};

export const useUpdateMessage = (hookOptions?: options) => {
    const [ data, setData ] = useState<ResponseType | null>(null);
    const [ error, setError ] = useState<Error | null>(null);
    const [ status, setStatus ] = useState<"success" | "error" | "settled" | "pending" | null>(null);

    const isPending = useMemo(() => status === "pending", [status]);
    const isSuccess = useMemo(() => status === "success", [status]);
    const isError = useMemo(() => status === "error", [status]);
    const isSettled = useMemo(() => status === "settled", [status]);

    const mutation = useMutation(api.messages.update);

    const mutate = useCallback(async (values: RequestType, options?: options) => {
        try{
            setData(null);
            setError(null);
            setStatus("pending");

            const response = await mutation(values);
            setData(response);
            setStatus("success");
            (options ?? hookOptions)?.onSuccess?.(response);
            return response;
        } catch(error) {
            setStatus("error");
            setError(error as Error);
            (options ?? hookOptions)?.onError?.(error as Error);
            if((options ?? hookOptions)?.throwError) {
                throw error;
            }
        } finally {
            setStatus("settled");
            (options ?? hookOptions)?.onSettled?.();
        }
    }, [mutation, hookOptions]);

    return { 
        mutate,
        data,
        error,
        isPending,
        isSuccess,
        isError,
        isSettled
     };
};