/* eslint-disable no-console */
const isDev = import.meta.env.DEV;
export const logger = {
    log: (...args: unknown[]): void => {
        if (isDev)
            console.log(...args);
    },
    error: (...args: unknown[]): void => {
        if (isDev)
            console.error(...args);
    },
    warn: (...args: unknown[]): void => {
        if (isDev)
            console.warn(...args);
    },
    info: (...args: unknown[]): void => {
        if (isDev)
            console.info(...args);
    },
    debug: (...args: unknown[]): void => {
        if (isDev)
            console.debug(...args);
    },
};
