# 🔍 دليل استكشاف الأخطاء والإصلاح

## 🎯 المشاكل الشائعة والحلول

### 1️⃣ الخادم لا يعمل
```
❌ Error: Port 3000 already in use
```

**الحل:**
```bash
# إيجاد العملية التي تستخدم المنفذ
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# إيقاف العملية أو استخدام منفذ مختلف
PORT=3001 npm run dev
```

### 2️⃣ الصفحة تظهر فارغة
```
❌ White screen / 404 error
```

**التحقق:**
1. افتح Developer Tools (F12)
2. اذهب إلى Console tab
3. ابحث عن الأخطاء الحمراء

**الحلول:**
```bash
# امسح cache المتصفح
# Ctrl + Shift + Delete (Windows/Linux)
# Cmd + Shift + Delete (Mac)

# أعد تحميل مع تجاهل cache
# Ctrl + F5 (Windows/Linux)
# Cmd + Shift + R (Mac)

# تحقق من أن الملفات موجودة
ls -la  # Linux/Mac
dir     # Windows
```

### 3️⃣ الترجمات لا تظهر
```
❌ النص يبقى بنفس اللغة بعد النقر على زر اللغة
```

**التحقق:**
```javascript
// في Console اكتب:
console.log(localStorage.getItem('language'));
console.log(document.documentElement.dir);
console.log(document.documentElement.lang);
```

**الحلول:**
```javascript
// امسح localStorage
localStorage.clear();
location.reload();

// أو يدويًا
localStorage.removeItem('language');
```

### 4️⃣ أزرار الدفع لا تستجيب
```
❌ النقر على زر Stripe/PayPal لا يفعل شيء
```

**التحقق:**
```javascript
// في Console أثناء النقر:
function initiatePayment(provider) {
    console.log('Payment initiated for:', provider);
}
```

**الحلول:**
```bash
# تأكد من:
1. وجود الدالة initiatePayment
2. عدم وجود أخطاء في console
3. أن Modal مفتوح

# امسح Cache
localStorage.clear();
sessionStorage.clear();
```

### 5️⃣ الخدمة Service Worker لا تعمل
```
❌ التطبيق لا يعمل بدون إنترنت
```

**التحقق:**
```javascript
// في Console اكتب:
navigator.serviceWorker.getRegistrations()
    .then(regs => console.log('SWs:', regs));
```

**الحلول:**
```javascript
// أعد تسجيل Service Worker
navigator.serviceWorker.getRegistrations()
    .then(registrations => {
        registrations.forEach(r => r.unregister());
    })
    .then(() => location.reload());
```

### 6️⃣ قاعدة البيانات/localStorage ممتلئة
```
❌ Error: QuotaExceededError
```

**الحل:**
```javascript
// امسح localStorage
localStorage.clear();

// أو امسح sessionStorage
sessionStorage.clear();

// تحقق من الاستخدام
console.log(localStorage.length);
```

### 7️⃣ مشكلة CORS
```
❌ Access to XMLHttpRequest blocked by CORS policy
```

**الحل:**
يجب أن يكون الخادم مُهيأ بـ CORS:
```javascript
// في server.js
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
```

### 8️⃣ مشاكل Stripe
```
❌ Stripe not responding
```

**التحقق:**
```javascript
// في Console
console.log(window.Stripe);
```

**الحلول:**
```bash
# تحقق من مفاتيح API
echo "STRIPE_PUBLIC_KEY=$STRIPE_PUBLIC_KEY"
echo "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY"

# استخدم بطاقات اختبار Stripe
# 4242 4242 4242 4242 (نجاح)
# 4000 0000 0000 0002 (فشل)
```

---

## 🛠️ أدوات التشخيص

### 1. استخدام جدول بيانات المتصفح
```javascript
// في Console
console.table(localStorage);
console.table(sessionStorage);
```

### 2. تتبع الطلبات
```javascript
// في Network tab (F12 → Network)
// ابحث عن طلبات POST إلى:
// /api/download
// /api/payment-success
// /api/subscription-status
```

### 3. مراقبة الأداء
```javascript
// في Performance tab
// انقر على Record وقم بعملية
// ثم انقر على Stop
```

### 4. اختبار من صفحة الاختبار
```
اذهب إلى: http://localhost:3000/test.html
```

---

## 📋 قائمة المراجعة قبل النشر

### الفئة: الوظيفة
- [ ] الصفحة الرئيسية تحمل بسرعة
- [ ] زر التحميل يعمل
- [ ] أزرار الدفع تستجيب
- [ ] اللغات تبديل صحيح
- [ ] الاشتراك يعمل

### الفئة: الأمان
- [ ] لا توجد مفاتيح API في الكود
- [ ] استخدام HTTPS في الإنتاج
- [ ] معالجة جميع الأخطاء
- [ ] تصريح CORS صحيح

### الفئة: الأداء
- [ ] وقت التحميل < 2 ثانية
- [ ] CSS مضغوط
- [ ] صور محسّنة
- [ ] Cache فععّال

### الفئة: الاستقبال
- [ ] البيانات الحساسة محفوظة بأمان
- [ ] رسائل الخطأ واضحة
- [ ] الواجهة سهلة الاستخدام
- [ ] يعمل على الهاتف

---

## 🔧 أوامر مفيدة

```bash
# تثبيت الاعتماديات
npm install

# تطوير مع إعادة تحميل
npm run dev

# إنتاج
npm start

# اختبار
npm test

# تنظيف
npm run clean

# تصحيح الأخطاء
npm run lint

# بدء مع تصحيح
npm run dev -- --inspect
```

---

## 📞 الدعم

إذا استمرت المشكلة:
1. تحقق من console للأخطاء
2. جرّب في متصفح مختلف
3. امسح cache وأعد التحميل
4. راسل: salhiyounes250@gmail.com

---

آخر تحديث: 2024
