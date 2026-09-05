export const getAllowedOrigins = (): string[] => {
    const defaultProdOrigins = ['https://nc-netwotk.vercel.app'];
    const customOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    const origins = Array.from(new Set([...defaultProdOrigins, ...customOrigins]));

    if (process.env.NODE_ENV !== 'production') {
        const devOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5000',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5000',
        ];
        devOrigins.forEach((orig) => {
            if (!origins.includes(orig)) {
                origins.push(orig);
            }
        });
    }
    return origins;
};
