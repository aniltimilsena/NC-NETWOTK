import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
const getErrorMessage = (error: unknown) => {
    if (typeof error === "object" && error !== null && "message" in error && typeof (error as {
        message: unknown;
    }).message === "string") {
        return (error as {
            message: string;
        }).message;
    }
    return "Request failed";
};
export const callSecureFunction = async <TRequest, TResponse>(name: string, payload: TRequest): Promise<{
    data: TResponse | null;
    error: string | null;
}> => {
    try {
        const fn = httpsCallable<TRequest, TResponse>(functions, name);
        const result = await fn(payload);
        return { data: result.data, error: null };
    }
    catch (error: unknown) {
        return { data: null, error: getErrorMessage(error) };
    }
};
