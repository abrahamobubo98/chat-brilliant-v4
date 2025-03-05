import { useMutation } from "convex/react";
import { useCallback, useState, useMemo } from "react";

import { api } from "../../../../convex/_generated/api";

type ResponseType = string | null;

type Options = {
    onSuccess?: (data: ResponseType) => void;
    onError?: (error: Error) => void;
    onSettled?: () => void;
    throwError?: boolean;
};

export const useGenerateUploadUrl = (initialOptions?: Options) => {
    const [ data, setData ] = useState<ResponseType>(null);
    const [ error, setError ] = useState<Error | null>(null);
    const [ status, setStatus ] = useState<"success" | "error" | "settled" | "pending" | null>(null);

    const isPending = useMemo(() => status === "pending", [status]);
    const isSuccess = useMemo(() => status === "success", [status]);
    const isError = useMemo(() => status === "error", [status]);
    const isSettled = useMemo(() => status === "settled", [status]);

    const mutation = useMutation(api.upload.generateUploadUrl);

    const mutate = useCallback(async (values?: Record<string, never>, options?: Options) => {
        try{
            setData(null);
            setError(null);
            setStatus("pending");

            const response = await mutation();
            setData(response);
            setStatus("success");
            
            // Use either the call-time options or the initialOptions
            (options || initialOptions)?.onSuccess?.(response);
            return response;
        } catch(error) {
            setStatus("error");
            setError(error as Error);
            (options || initialOptions)?.onError?.(error as Error);
            if((options || initialOptions)?.throwError) {
                throw error;
            }
        } finally {
            setStatus("settled");
            (options || initialOptions)?.onSettled?.();
        }
    }, [mutation, initialOptions]);

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