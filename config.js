// Configuration file for YouTube to MP3

const config = {
    // Admin Settings
    admin: {
        email: 'salhiyounes250@gmail.com',
        name: 'YouTube to MP3 Admin',
        paymentReceiver: 'salhiyounes250@gmail.com'
    },

    // Payment Settings
    payment: {
        amount: 5.00,
        currency: 'USD',
        frequency: 'yearly',
        description: 'YouTube to MP3 Premium - Annual Subscription',
        method: 'email'  // طريقة الدفع: البريد الإلكتروني فقط
    },

    // Premium Features
    premium: {
        downloadSpeed: 'instant',
        simultaneousDownloads: 5,
        noAds: true,
        prioritySupport: true,
        durationDays: 365
    },

    // Free Features
    free: {
        downloadSpeed: '10 seconds',
        simultaneousDownloads: 1,
        noAds: false,
        prioritySupport: false
    },

    // Server Settings
    server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development',
        domain: process.env.DOMAIN || 'http://localhost:3000'
    },

    // Stripe Settings
    stripe: {
        publicKey: process.env.STRIPE_PUBLIC_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        mode: process.env.STRIPE_MODE || 'test'
    }
};

module.exports = config;
