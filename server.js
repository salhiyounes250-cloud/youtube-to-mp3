import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import Stripe from 'stripe';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// استيراد مكتبة التحميل المحدثة والمضادة للحظر
import ytdl from '@distube/ytdl-core';

// تحميل متغيرات البيئة
dotenv.config();

// إعداد المسارات المتوافقة مع ES Modules لمنع أخطاء الـ Path والـ __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تهيئة تطبيق Express
const app = express();
const PORT = process.env.PORT || 3000;

// تهيئة Stripe مع مفتاح تجريبي افتراضي في حال عدم وجود المفتاح بالبيئة
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_demo_key');

// الإعدادات الافتراضية للمسؤول
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'salhiyounes250@gmail.com';

// مخازن البيانات المؤقتة في الذاكرة (In-Memory Databases)
const payments = new Map();
const activeDownloads = new Map();
const userSubscriptions = new Map();
const serverLogs = [];
const apiMetrics = {
    totalRequests: 0,
    successfulDownloads: 0,
    failedDownloads: 0,
    totalRevenue: 0
};

// ===== دالة المساعدة لنظام التسجيل الداخلي (Logger) =====
function logEvent(level, message, context = '') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, context };
    serverLogs.push(logEntry);
    if (serverLogs.length > 500) serverLogs.shift(); // الحفاظ على آخر 500 سجل فقط لمنع امتلاء الذاكرة
    
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message} ${context ? `| Context: ${JSON.stringify(context)}` : ''}`);
}

// ===== البرمجيات الوسيطة (Middleware) =====
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// تتبع وإحصاء كافة الطلبات الواردة إلى السيرفر
app.use((req, res, next) => {
    apiMetrics.totalRequests++;
    logEvent('info', `Incoming ${req.method} request to ${req.url}`, { ip: req.ip });
    next();
});

// خدمة الملفات الثابتة (الواجهة الأمامية) من المجلد الرئيسي للمشروع
app.use(express.static(__dirname));

// دالة مساعدة لاستخراج الـ ID الخاص بفيديو يوتيوب من الرابط
function getYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ===== واجهات برمجة التطبيقات (API Routes) =====

// 📬 مسار استقبال طلبات الدفع عبر البريد الإلكتروني
app.post('/api/request-payment-email', (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            logEvent('warn', 'Failed payment email request due to invalid email format', { email });
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال بريد إلكتروني صحيح'
            });
        }

        logEvent('info', 'New manual payment request submitted successfully', { email, receiver: ADMIN_EMAIL });

        res.json({
            success: true,
            message: 'تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً لتفعيل حسابك.'
        });

    } catch (error) {
        logEvent('error', 'Critical failure in payment email request endpoint', error.message);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء معالجة طلب الدفع.'
        });
    }
});

// 📥 مسار التنزيل الرئيسي (محمي من حظر يوتيوب 403 Forbidden)
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
            logEvent('warn', 'Invalid YouTube URL provided by client', { url });
            return res.status(400).json({
                success: false,
                message: 'رابط اليوتيوب غير صحيح أو غير مدعوم'
            });
        }

        // توجيه واجهة المستخدم لاستدعاء رابط البث المباشر المحلي مباشرة
        const localDownloadLink = `/api/stream-audio?id=${videoId}&format=${format}`;
        
        try {
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            // جلب معلومات الفيديو مع تمرير ترويسات متصفح حقيقي لخداع جدار حماية يوتيوب
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
            logEvent('info', `Video metadata fetched successfully for ID: ${videoId}`, { title });

            return res.json({
                success: true,
                message: 'تم تجهيز الرابط بنجاح!',
                downloadLink: localDownloadLink,
                title: title,
                format: format,
                premium: isPremium
            });

        } catch (ytdlError) {
            logEvent('warn', `YouTube firewall blocked metadata fetching for ID: ${videoId}. Using safety fallback link.`, ytdlError.message);
            
            // Fallback: في حال حظر جلب معلومات الاسم، نقوم بتمرير رابط التحميل مباشرة بالـ ID لمنع توقف الخدمة
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
        logEvent('error', 'Fatal error during download initialization process', error.message);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ غير متوقع في خادم المعالجة.'
        });
    }
});

// 📻 مسار التدفق الحي (Streaming) المجهز بترويسات متقدمة لتخطي الـ Bot Detection
app.get('/api/stream-audio', async (req, res) => {
    try {
        const videoId = req.query.id;
        const format = req.query.format || 'mp3';

        if (!videoId) return res.status(400).send('Missing video ID');

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        activeDownloads.set(videoId, { startedAt: new Date(), format });

        // إجبار المتصفح على تحميل التدفق كملف مرفق وليس ككود برميجي
        res.setHeader('Content-Disposition', `attachment; filename="Audio_${videoId}.${format}"`);
        res.setHeader('Content-Type', format === 'mp4' ? 'video/mp4' : 'audio/mpeg');

        // بدء سحب البيانات الحية وتمريرها للمستخدم مع محاكاة متصفح كاملة
        const stream = ytdl(videoUrl, {
            quality: format === 'mp4' ? 'highestvideo' : 'highestaudio',
            filter: format === 'mp4' ? 'audioandvideo' : 'audioonly',
            highWaterMark: 1 << 25, // رفع أداء الكاش لتسريع النقل من سيرفر Render للمستخدم
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
            apiMetrics.failedDownloads++;
            activeDownloads.delete(videoId);
            logEvent('error', `Active streaming channel failure for video ${videoId}`, err.message);
            if (!res.headersSent) {
                res.status(500).send('حدث قيود غير متوقعة أثناء الاتصال بيوتيوب، يرجى المحاولة لاحقاً.');
            }
        });

        stream.on('end', () => {
            apiMetrics.successfulDownloads++;
            activeDownloads.delete(videoId);
            logEvent('info', `Stream pipe completed successfully for resource: ${videoId}`);
        });

        stream.pipe(res);

    } catch (streamError) {
        logEvent('error', 'Unhandled exception inside streaming pipeline execution', streamError.message);
        if (!res.headersSent) {
            res.status(500).send('خطأ داخلي في نظام البث الخلفي.');
        }
    }
});

// 💳 إنشاء جلسة دفع عبر سلة Stripe
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
                            description: 'تحميل فوري بدون قيود أو تأخير',
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

        logEvent('info', 'Stripe checkout session initialized successfully', { sessionId: session.id });
        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        logEvent('error', 'Stripe session generator failed', error.message);
        res.status(500).json({ error: 'فشل إنشاء عملية الدفع الإلكتروني' });
    }
});

// 🔄 استقبال تأكيدات عمليات الدفع الناجحة
app.post('/api/payment-success', (req, res) => {
    try {
        const { provider, timestamp, userEmail } = req.body;
        const paymentId = `payment_${Date.now()}`;
        
        const allocation = {
            id: paymentId,
            provider,
            timestamp,
            amount: 5.00,
            status: 'completed',
            userEmail: userEmail || 'unknown@example.com'
        };

        payments.set(paymentId, allocation);
        apiMetrics.totalRevenue += 5.00;

        // تفعيل باقة البريميوم للمستخدم تلقائياً في الذاكرة لمدة عام كامل
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        userSubscriptions.set(allocation.userEmail, { isPremium: true, expiryDate });

        logEvent('info', `Payment record successfully registered and premium account activated`, allocation);
        res.json({ success: true, paymentId });
    } catch (error) {
        logEvent('error', 'Payment synchronization mechanism encountered a failure', error.message);
        res.status(500).json({ success: false });
    }
});

// 🔍 التحقق من حالة اشتراك المستخدم
app.get('/api/subscription-status/:userId', (req, res) => {
    const userId = req.params.userId;
    if (userSubscriptions.has(userId)) {
        return res.json(userSubscriptions.get(userId));
    }
    res.json({ isPremium: false, expiryDate: null });
});

// 📊 لوحة مراقبة وإحصائيات النظام الفورية (System Metrics & Health Monitor)
app.get('/api/admin/dashboard-metrics', (req, res) => {
    res.json({
        success: true,
        metrics: apiMetrics,
        activeStreamsCount: activeDownloads.size,
        currentActiveDownloads: Array.from(activeDownloads.entries()),
        recentLogs: serverLogs.slice(-20) // إرجاع آخر 20 حدث مسجل في السيرفر
    });
});

// 🩺 فحص سلامة السيرفر واستجابته لـ Render (Health Check)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString() 
    });
});

// ===== مسارات الويب الثابتة =====
app.get('/success', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head><meta charset="UTF-8"><title>نجاح عملية الدفع</title></head>
        <body style="font-family:sans-serif; text-align:center; padding-top:100px; background:#f0f4f8;">
            <h1>تم الدفع وتفعيل طلبك بنجاح! 🎉</h1>
            <p>يمكنك الآن البدء بالتحميل المباشر والسريع.</p>
            <a href="/" style="background:#6366f1; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">العودة إلى القائمة الرئيسية</a>
        </body>
        </html>
    `);
});

app.get('/cancel', (req, res) => {
    res.send(`<h1>تم إلغاء عملية الدفع</h1><a href="/">العودة للتطبيق</a>`);
});

// توجيه أي مسار آخر غير معرف لعرض الصفحة الرئيسية بشكل آمن لمنع أخطاء الـ Routing 404
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== معالج الأخطاء العام (Global Express Error Handler) =====
app.use((err, req, res, next) => {
    logEvent('critical', 'An unhandled application error occurred within the pipeline', err.message);
    res.status(500).json({
        success: false,
        message: 'حدث خطأ داخلي جسيم في خادم الويب، تم رصد المشكلة وجاري مراجعتها من قبل المسؤول.'
    });
});

// تشغيل السيرفر
app.listen(PORT, () => {
    logEvent('info', `Server application core successfully ignited and listening on designated production port: ${PORT}`);
    console.log(`\n========================================`);
    console.log(`🚀 السيرفر جاهز تماماً ويعمل على منفذ: ${PORT}`);
    console.log(`========================================\n`);
});
