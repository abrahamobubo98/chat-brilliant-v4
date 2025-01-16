import { useMutation } from "convex/react";
import { useCallback, useState, useMemo } from "react";

import { api } from "../../../../convex/_generated/api";

type ResponseType = string | null;

type options = {
    onSuccess?: (data: ResponseType) => void;
    onError?: (error: Error) => void;
    onSettled?: () => void;
    throwError?: boolean;
};

export const useGenerateUploadUrl = (options?: options) => {
    const [ data, setData ] = useState<ResponseType>(null);
    const [ error, setError ] = useState<Error | null>(null);
    const [ status, setStatus ] = useState<"success" | "error" | "settled" | "pending" | null>(null);

    const isPending = useMemo(() => status === "pending", [status]);
    const isSuccess = useMemo(() => status === "success", [status]);
    const isError = useMemo(() => status === "error", [status]);
    const isSettled = useMemo(() => status === "settled", [status]);

    const mutation = useMutation(api.upload.generateUploadUrl);

    const mutate = useCallback(async (values: {}, options?: options) => {
        try{
            setData(null);
            setError(null);
            setStatus("pending");

            const response = await mutation();
            options?.onSuccess?.(response);
            return response;
        } catch(error) {
            setStatus("error");
            options?.onError?.(error as Error);
            if(options?.throwError) {
                throw error;
            }
        } finally {
            setStatus(null);
            setStatus("settled");
            options?.onSettled?.();
        }
    }, [mutation]);

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