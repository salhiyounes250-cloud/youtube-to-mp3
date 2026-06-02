import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import Stripe from 'stripe';
import path from 'path';
import { fileURLToPath } from 'url';
import * as config from './config.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_demo_key');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(__dirname));

// Store for payments (في تطبيق حقيقي، استخدم قاعدة بيانات)
const payments = new Map();
const ADMIN_EMAIL = config.admin.paymentReceiver;

// ===== API Routes =====

// 1. Download endpoint
app.post('/api/download', async (req, res) => {
    try {
        const { url, format, isPremium } = req.body;

        // التحقق من البيانات
        if (!url || !format) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال رابط وصيغة صحيحة'
            });
        }

        // محاكاة معالجة التحميل
        const downloadTime = isPremium ? 100 : 10000; // 100ms للمتقدم، 10 ثواني للمجاني

        setTimeout(() => {
            console.log(`Download initiated: ${url} - Format: ${format} - Premium: ${isPremium}`);
        }, downloadTime);

        res.json({
            success: true,
            message: 'جاري معالجة التحميل...',
            format: format,
            premium: isPremium
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في معالجة التحميل'
        });
    }
});

// 2. Create Stripe Payment Session
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'YouTube to MP3 - اشتراك سنوي',
                            description: 'تحميل فوري بدون تأخير + مميزات إضافية',
                            images: ['data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%236366f1" width="192" height="192"/><path fill="white" d="M144 64c0-3.528-2.86-6.4-6.4-6.4h-89.2c-3.528 0-6.4 2.872-6.4 6.4v64c0 3.528 2.872 6.4 6.4 6.4h89.2c3.54 0 6.4-2.872 6.4-6.4V64zm-57.6 48l-19.2-12.8v25.6l19.2-12.8z"/></svg>'],
                        },
                        unit_amount: 500, // $5.00
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            subscription_data: {
                items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'YouTube to MP3 Premium',
                            },
                            recurring: {
                                interval: 'year',
                                interval_count: 1,
                            },
                            unit_amount: 500, // $5.00 per year
                        },
                        quantity: 1,
                    },
                ],
            },
            success_url: `${process.env.DOMAIN || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.DOMAIN || 'http://localhost:3000'}/cancel`,
        });

        res.json({
            sessionId: session.id,
            clientSecret: session.client_secret,
            url: session.url
        });
    } catch (error) {
        console.error('Checkout session error:', error);
        res.status(500).json({
            error: 'فشل إنشاء جلسة الدفع'
        });
    }
});

// 3. Payment Success Webhook
app.post('/api/payment-success', (req, res) => {
    try {
        const { provider, timestamp, userEmail } = req.body;
        
        const paymentId = `payment_${Date.now()}`;
        const paymentData = {
            id: paymentId,
            provider,
            timestamp,
            amount: 5.00,
            currency: 'USD',
            status: 'completed',
            adminEmail: ADMIN_EMAIL,
            userEmail: userEmail || 'unknown@example.com'
        };

        payments.set(paymentId, paymentData);

        console.log(`✅ Payment received via ${provider} at ${timestamp}`);
        console.log(`💰 Amount: $${paymentData.amount} → ${ADMIN_EMAIL}`);
        console.log(`👤 User: ${paymentData.userEmail}`);

        // في تطبيق حقيقي، قم بـ:
        // 1. إرسال بريد إلكتروني للمشرف
        // 2. تحديث قاعدة البيانات
        // 3. إرسال بريد تأكيد للمستخدم

        res.json({
            success: true,
            message: 'Payment received successfully',
            paymentId,
            adminEmail: ADMIN_EMAIL,
            amount: '$5.00'
        });
    } catch (error) {
        console.error('Payment success error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing payment'
        });
    }
});

// 4. Check Subscription Status
app.get('/api/subscription-status/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        // في تطبيق حقيقي، اطلب من قاعدة البيانات
        const isPremium = localStorage?.getItem('isPremium') === 'true';

        res.json({
            isPremium,
            expiryDate: localStorage?.getItem('premiumExpiry') || null
        });
    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({
            isPremium: false
        });
    }
});

// 5. Get Payment History
app.get('/api/payment-history', (req, res) => {
    try {
        const history = Array.from(payments.values());
        
        res.json({
            success: true,
            count: history.length,
            payments: history
        });
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب سجل الدفع'
        });
    }
});

// 6. Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ===== Webhook Handler for Stripe =====
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || 'whsec_demo'
        );
    } catch (err) {
        console.error('Webhook error:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // معالجة الأحداث المختلفة
    switch (event.type) {
        case 'customer.subscription.created':
            console.log('New subscription created:', event.data.object);
            // تحديث قاعدة البيانات
            break;

        case 'customer.subscription.deleted':
            console.log('Subscription cancelled:', event.data.object);
            // تحديث قاعدة البيانات
            break;

        case 'invoice.payment_succeeded':
            console.log('Payment succeeded:', event.data.object);
            // تحديث قاعدة البيانات
            break;

        case 'invoice.payment_failed':
            console.log('Payment failed:', event.data.object);
            // إرسال بريد إلكتروني للمستخدم
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

// ===== Static Routes =====
app.get('/success', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>نجح الدفع</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
                }
                .container {
                    text-align: center;
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.1);
                }
                .checkmark {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px;
                    background: #10b981;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 50px;
                }
                h1 {
                    color: #1e293b;
                    margin-bottom: 10px;
                }
                p {
                    color: #64748b;
                    margin-bottom: 20px;
                }
                a {
                    display: inline-block;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    padding: 12px 30px;
                    border-radius: 10px;
                    text-decoration: none;
                    transition: all 0.3s ease;
                }
                a:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="checkmark">✓</div>
                <h1>تم الدفع بنجاح! 🎉</h1>
                <p>شكراً لاشتراكك في النسخة المتقدمة من YouTube to MP3</p>
                <p>ستتمكن الآن من تحميل الفيديوهات بسرعة فائقة!</p>
                <a href="/">العودة إلى التطبيق</a>
            </div>
        </body>
        </html>
    `);
});

app.get('/cancel', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تم إلغاء الدفع</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
                }
                .container {
                    text-align: center;
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.1);
                }
                .x {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px;
                    background: #ef4444;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 50px;
                }
                h1 {
                    color: #1e293b;
                    margin-bottom: 10px;
                }
                p {
                    color: #64748b;
                    margin-bottom: 20px;
                }
                a {
                    display: inline-block;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    padding: 12px 30px;
                    border-radius: 10px;
                    text-decoration: none;
                    transition: all 0.3s ease;
                }
                a:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="x">✕</div>
                <h1>تم إلغاء الدفع</h1>
                <p>لم يتم إتمام عملية الدفع</p>
                <p>يمكنك محاولة الدفع مرة أخرى أو الاستمرار بالنسخة المجانية</p>
                <a href="/">العودة إلى التطبيق</a>
            </div>
        </body>
        </html>
    `);
});

// Serve landing.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

// Serve index.html for /app path
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n✅ 🚀 Server running at ${config.server.domain}`);
    console.log(`📧 Payment Email: ${ADMIN_EMAIL}`);
    console.log(`💰 Payment Amount: $${config.payment.amount}/${config.payment.frequency}`);
    console.log(`⏱️  Environment: ${config.server.environment}\n`);
    
    if (process.env.STRIPE_SECRET_KEY) {
        console.log('✓ Stripe integration enabled');
    } else {
        console.log('⚠️  Stripe not configured (using demo mode)');
    }
});

// Error Handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
