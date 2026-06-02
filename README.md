# 🎬 YouTube to MP3 - تطبيق تحميل فيديوهات يوتيوب

تطبيق ويب حديث وآمن لتحميل فيديوهات يوتيوب بصيغة MP3 و MP4، مع نظام اشتراك متقدم يوفر سرعة تحميل فائقة.

![YouTube to MP3](https://img.shields.io/badge/YouTube-MP3%20Downloader-FF0000?style=flat-square&logo=youtube)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-16+-green?style=flat-square)

---

## ✨ المميزات الرئيسية

### 🎯 للمستخدم العام (مجاني)
- ✅ تحميل فيديوهات يوتيوب بصيغة MP3 و MP4
- ⏱️ بحث في 10 ثواني
- 📱 دعم جميع الأجهزة (موبايل، تابلت، ديسكتوب)
- 🔒 آمن وبدون إعلانات
- 🌐 يعمل بدون إنترنت (بعد تحميل الصفحة الأولى)

### 🌟 النسخة المتقدمة (Premium) - $5/سنة
- ⚡ **تحميل فوري** بدون تأخير
- 🎁 بدون إعلانات
- 📥 تحميل عدة فيديوهات معاً
- 🔄 أولوية عالية في المعالجة
- 💾 حفظ سجل التحميلات

### 🏆 تقنيات متقدمة
- 📲 **PWA** - تثبيت كتطبيق على الهاتف
- 🔄 **Service Worker** - يعمل بدون إنترنت
- 💳 **Stripe & PayPal** - نظام دفع آمن
- 🎨 **تصميم جميل** - ألوان مريحة للعين
- 📊 **Dashboard** - إدارة الاشتراكات والدفع

---

## 🚀 البدء السريع

### المتطلبات
- Node.js 16+ 
- npm أو yarn
- حساب Stripe (للدفع)

### التثبيت

1. **نسخ المشروع**
```bash
git clone <repository-url>
cd youtube-to-mp3
```

2. **تثبيت المتطلبات**
```bash
npm install
```

3. **إعداد متغيرات البيئة**
```bash
cp .env.example .env
```

ثم عدّل ملف `.env` وأضف مفاتيح Stripe:
```env
STRIPE_PUBLIC_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_key
```

4. **تشغيل الخادم**
```bash
# في بيئة التطوير (مع إعادة التشغيل التلقائي)
npm run dev

# في بيئة الإنتاج
npm start
```

5. **فتح الموقع**
```
http://localhost:3000
```

---

## 📁 هيكل المشروع

```
youtube-to-mp3/
├── index.html           # الصفحة الرئيسية
├── style.css            # التصاميم والألوان
├── script.js            # التفاعلات والوظائف
├── sw.js                # Service Worker (تخزين مؤقت)
├── manifest.json        # إعدادات PWA
├── server.js            # خادم Node.js
├── package.json         # المتطلبات
├── .env                 # متغيرات البيئة
└── README.md            # هذا الملف
```

---

## 🔌 API Endpoints

### تحميل الفيديو
```
POST /api/download
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "mp3" | "mp4",
  "isPremium": true | false
}

Response:
{
  "success": true,
  "message": "جاري معالجة التحميل...",
  "format": "mp3",
  "premium": false
}
```

### إنشاء جلسة دفع (Checkout)
```
POST /api/create-checkout-session
Content-Type: application/json

Response:
{
  "sessionId": "cs_test_...",
  "clientSecret": "...",
  "url": "https://checkout.stripe.com/..."
}
```

### التحقق من حالة الاشتراك
```
GET /api/subscription-status/:userId

Response:
{
  "isPremium": true | false,
  "expiryDate": "2024-12-31T23:59:59Z"
}
```

### سجل الدفع
```
GET /api/payment-history

Response:
{
  "success": true,
  "count": 5,
  "payments": [
    {
      "provider": "stripe",
      "timestamp": "2024-01-15T10:30:00Z",
      "amount": 5.00,
      "currency": "USD",
      "status": "completed"
    }
  ]
}
```

---

## 💳 إعداد نظام الدفع

### Stripe Setup

1. **إنشاء حساب على Stripe**
   - اذهب إلى [stripe.com](https://stripe.com)
   - أنشئ حسابك

2. **الحصول على المفاتيح**
   - Dashboard → API Keys
   - انسخ `Publishable Key` و `Secret Key`

3. **إعداد الـ Webhook**
   - Dashboard → Webhooks
   - أضف endpoint: `https://yourdomain.com/webhook`
   - اختر الأحداث:
     - `customer.subscription.created`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

4. **أضف المفاتيح إلى `.env`**
```env
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### PayPal Setup

1. **إنشاء حساب على PayPal**
   - اذهب إلى [paypal.com](https://paypal.com)
   - أنشئ حسابك

2. **الحصول على بيانات الدفع**
   - Account Settings → API
   - احفظ Client ID و Secret

---

## 🎨 التصميم والألوان

التطبيق يستخدم نظام ألوان حديث ومريح للعين:

```css
--primary-color: #6366f1       /* أزرق بنفسجي */
--secondary-color: #8b5cf6     /* بنفسجي */
--accent-color: #ec4899        /* وردي */
--light-bg: #f8fafc            /* أبيض فاتح */
--dark-bg: #1e293b             /* أسود مع لمسة زرقاء */
```

---

## 📱 PWA (تثبيت كتطبيق)

### على Android
1. افتح الموقع في متصفح Chrome
2. انقر على زر التثبيت (يظهر في الأعلى تلقائياً)
3. سيتم إضافة الأيقونة على الشاشة الرئيسية

### على iOS
1. افتح الموقع في Safari
2. انقر على مشاركة
3. اختر "إضافة إلى الشاشة الرئيسية"

### الميزات المتاحة
- ✅ يعمل بدون إنترنت
- ✅ تخزين مؤقت ذكي
- ✅ تحديثات تلقائية
- ✅ إشعارات الدفع

---

## 🔐 الأمان

- ✅ HTTPS فقط (في الإنتاج)
- ✅ تشفير البيانات الحساسة
- ✅ CORS محدّد
- ✅ التحقق من صحة المدخلات
- ✅ معالجة الأخطاء الآمنة

---

## 📊 نموذج الإيرادات

### نموذج Freemium
- **المجاني**: بحث في 10 ثواني، بدون دعم
- **المتقدم**: $5/سنة، بحث فوري، دعم الأولوية

### طرق الدفع
- Stripe (بطاقات ائتمان)
- PayPal
- Apple Pay
- Google Pay

---

## 📈 الإحصائيات

يتم جمع الإحصائيات التالية (بدون بيانات شخصية):
- عدد التحميلات يومياً
- الصيغ الأكثر استخداماً
- عدد المشتركين
- معدل التحويل

---

## 🐛 استكشاف الأخطاء

### المشكلة: "الخادم غير متاح"
```bash
# تأكد من تشغيل الخادم
npm start

# تحقق من المنفذ (Port)
# الخادم يعمل على http://localhost:3000
```

### المشكلة: خطأ في Stripe
```bash
# تحقق من المفاتيح في .env
# تأكد من استخدام مفاتيح Test Mode
```

### المشكلة: لا يعمل Service Worker
```bash
# امسح الـ Cache
# أعد تحميل الصفحة (Ctrl+Shift+R)
# تأكد من استخدام HTTPS (أو localhost)
```

---

## 🚀 النشر (Deployment)

### على Heroku

1. **إنشاء تطبيق**
```bash
heroku create youtube-to-mp3
```

2. **إضافة متغيرات البيئة**
```bash
heroku config:set STRIPE_SECRET_KEY=sk_test_...
heroku config:set NODE_ENV=production
```

3. **نشر التطبيق**
```bash
git push heroku main
```

### على Vercel

1. **تثبيت Vercel CLI**
```bash
npm i -g vercel
```

2. **النشر**
```bash
vercel
```

### على خادم خاص (VPS)

```bash
# 1. تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. نسخ المشروع
git clone <repo> /var/www/youtube-to-mp3
cd /var/www/youtube-to-mp3

# 3. تثبيت المتطلبات
npm install

# 4. إعداد PM2
npm install -g pm2
pm2 start server.js --name "youtube-to-mp3"
pm2 startup
pm2 save

# 5. إعداد Nginx
# ... تكوين reverse proxy
```

---

## 📝 التطويرات المستقبلية

- [ ] دعم تنزيلات متعددة
- [ ] سجل التنزيلات
- [ ] مشاركة الملفات
- [ ] دعم قنوات اليوتيوب
- [ ] تطبيق iOS و Android أصلي
- [ ] واجهة إدارة (Dashboard)
- [ ] تقرير الإحصائيات
- [ ] دعم لغات متعددة

---

## 📞 التواصل والدعم

- 📧 البريد: support@youtube-to-mp3.com
- 🐦 تويتر: @youtube2mp3
- 💬 الدعم: support.youtube-to-mp3.com

---

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT.
اطلع على ملف `LICENSE` للتفاصيل.

---

## ⚖️ التنويه القانوني

⚠️ **تحذير مهم:**
- استخدم هذا الموقع فقط للملفات التي تملك حقوق نشرها
- احترم حقوق الملكية الفكرية
- YouTube و Google هما علامات تجارية مسجلة

---

## 🙏 شكر وتقدير

- شكر لـ Stripe و PayPal على أنظمة الدفع
- شكر للمساهمين والمستخدمين

---

**صُنع بـ ❤️ من قبل فريق YouTube to MP3**

**آخر تحديث: يناير 2024**
