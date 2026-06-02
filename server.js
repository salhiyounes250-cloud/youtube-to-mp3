import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import Stripe from 'stripe';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

// استيراد مكتبة التحميل المحدثة والمضادة للحظر
import ytdl from '@distube/ytdl-core';

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

// Store for payments
const payments = new Map();

const ADMIN_EMAIL = config?.admin?.paymentReceiver || 'salhiyounes250@gmail.com';

// دالة مساعدة لاستخراج الـ ID الخاص بفيديو يوتيوب من الرابط
function getYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ===== API Routes =====

// 📬 مسار استقبال طلبات الدفع عبر البريد الإلكتروني
app.post('/api/request-payment-email', (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال بريد إلكتروني صحيح'
            });
        }

        console.log(`\n========================================`);
        console.log(`📩 طلب دفع يدوي جديد!`);
        console.log(`👤 إيميل العميل: ${email}`);
        console.log(`💰 الإيميل المستلم (الأدمن): ${ADMIN_EMAIL}`);
        console.log(`⏱️ التوقيت: ${new Date().toLocaleString()}`);
        console.log(`========================================\n`);

        res.json({
            success: true,
            message: 'تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً لتفعيل حسابك.'
        });

    } catch (error) {
        console.error('Payment request error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء معالجة طلبك.'
        });
    }
});

// 1. Download endpoint (معدل بالكامل لتفادي حظر 403 الخاص بالروبوتات)
app.post('/api/download', async (req, res) => {
    try {
        const { url, format, isPremium } = req.body;

        if (!url || !format) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال رابط وصيغة صحيحة'
            });
        }

        const videoId = getYouTubeId(url);
        if (!videoId) {
            return res.status(400).json({
                success: false,
                message: 'رابط اليوتيوب غير صحيح أو غير مدعوم'
            });
        }

        // نقوم فوراً بتوجيه المستخدم لرابط البث المباشر الداخلي الخاص بالسيرفر
        // هذا يحميك من حظر الـ APIs الخارجية ويعالج البيانات عبر ترويسات آمنة
        const localDownloadLink = `/api/stream-audio?id=${videoId}&format=${format}`;
        
        try {
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            // محاولة جلب معلومات الفيديو مع تمرير ترويسات متصفح كاملة لخداع الحماية
            const info = await ytdl.getInfo(videoUrl, {
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache'
                    }
                }
            });
            
            const title = info.videoDetails.title.replace(/[^\w\s\u0600-\u06FF]/gi, '');

            return res.json({
                success: true,
                message: 'تم تجهيز الرابط بنجاح!',
                downloadLink: localDownloadLink,
                title: title,
                format: format,
                premium: isPremium
            });

        } catch (ytdlError) {
            console.log('فشل جلب اسم الفيديو بسبب جدار الحماية، تفعيل خطة التخطي بالاسم الافتراضي...');
            
            // Fallback: إذا رفض يوتيوب إعطاء بيانات الاسم، نرسل الرابط بالمعرف الرقمي لكي لا يتعطل التحميل لدى العميل
            return res.json({
                success: true,
                message: 'تم تجهيز الملف للتحميل بنجاح (رابط احتياطي آمن)',
                downloadLink: localDownloadLink,
                title: `Audio_${videoId}`,
                format: format,
                premium: isPremium
            });
        }

    } catch (error) {
        console.error('Download Core Error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء معالجة طلبك بالخادم.'
        });
    }
});

// مسار البث المباشر (Stream) المزود بـ Request Options متقدمة لمحاكاة جهاز حقيقي وتخطي حظر الـ Bot
app.get('/api/stream-audio', async (req, res) => {
    try {
        const videoId = req.query.id;
        const format = req.query.format || 'mp3';

        if (!videoId) return res.status(400).send('Missing video ID');

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // إجبار المتصفح على تحميل الملف مباشرة بدلاً من تشغيله كصفحة كود
        res.setHeader('Content-Disposition', `attachment; filename="Audio_${videoId}.${format}"`);
        res.setHeader('Content-Type', format === 'mp4' ? 'video/mp4' : 'audio/mpeg');

        // إطلاق تيار البيانات مع الترويسات الذكية المضادة لـ 403 Forbidden
        const stream = ytdl(videoUrl, {
            quality: format === 'mp4' ? 'highestvideo' : 'highestaudio',
            filter: format === 'mp4' ? 'audioandvideo' : 'audioonly',
            highWaterMark: 1 << 25, // رفع حجم الكاش الداخلي لضمان سرعة نقل الصوت دون تقطيع في Render
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Origin': 'https://www.youtube.com',
                    'Referer': 'https://www.youtube.com/',
                    'Sec-Fetch-Mode': 'navigate'
                }
            }
        });

        stream.on('error', (err) => {
            console.error('خطأ أثناء بث حزم البيانات الحية:', err.message);
            if (!res.headersSent) {
                res.status(500).send('تعذر بث الملف حالياً بسبب قيود الحظر المحدثة من يوتيوب.');
            }
        });

        stream.pipe(res);

    } catch (streamError) {
        console.error('Fatal Stream Route Error:', streamError);
        if (!res.headersSent) {
            res.status(500).send('خطأ غير متوقع في الخادم الخلفي.');
        }
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
                        },
                        unit_amount: 500, // $5.00
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.DOMAIN || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.DOMAIN || 'http://localhost:3000'}/cancel`,
        });

        res.json({
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Checkout session error:', error);
        res.status(500).json({ error: 'فشل إنشاء جلسة الدفع' });
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

        console.log(`✅ Payment received via ${provider}`);
        res.json({
            success: true,
            message: 'Payment received successfully',
            paymentId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error processing payment' });
    }
});

// 4. Check Subscription Status
app.get('/api/subscription-status/:userId', (req, res) => {
    res.json({ isPremium: false, expiryDate: null });
});

// 5. Get Payment History
app.get('/api/payment-history', (req, res) => {
    res.json({ success: true, payments: Array.from(payments.values()) });
});

// 6. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ===== Webhook Handler for Stripe =====
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    res.json({ received: true });
});

// ===== Static Routes =====
app.get('/success', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head><meta charset="UTF-8"><title>نجح الدفع</title></head>
        <body style="font-family:Arial;text-align:center;padding-top:100px;background:#f0f4f8;">
            <h1>تم الدفع بنجاح! 🎉</h1>
            <p>ستتمكن الآن من تحميل الفيديوهات بسرعة فائقة!</p>
            <a href="/" style="background:#6366f1;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">العودة للتطبيق</a>
        </body>
        </html>
    `);
});

app.get('/cancel', (req, res) => {
    res.send(`<h1>تم إلغاء الدفع</h1><a href="/">العودة للتطبيق</a>`);
});

// تشغيل السيرفر والاستماع للطلبات
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 السيرفر يعمل بكفاءة على منفذ: ${PORT}`);
    console.log(`🌍 الرابط المحلي: http://localhost:${PORT}`);
    console.log(`========================================\n`);
});
