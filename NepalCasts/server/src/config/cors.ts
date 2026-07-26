export const getAllowedOrigins = (): string[] => {
    const defaultProdOrigins = ['https://nc-netwotk.vercel.app'];
    const customOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    const origins = Array.from(new Set([...defaultProdOrigins, ...customOrigins]));

    if (process.env.NODE_ENV !== 'production') {
        if (!origins.includes('http://localhost:5173')) {
            origins.push('http://localhost:5173');
        }
        if (!origins.includes('http://127.0.0.1:5173')) {
            origins.push('http://127.0.0.1:5173');
        }
    }
    return origins;
};
