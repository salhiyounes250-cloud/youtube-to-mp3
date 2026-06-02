#!/bin/bash

# YouTube to MP3 Downloader - دليل التشغيل السريع

echo "🎵 YouTube to MP3 - دليل البدء السريع"
echo "======================================"
echo ""

# التحقق من Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت"
    echo "اذهب إلى: https://nodejs.org/ وقم بالتثبيت"
    exit 1
fi

echo "✅ Node.js مثبت"
echo ""

# التحقق من npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm غير مثبت"
    exit 1
fi

echo "✅ npm مثبت"
echo ""

# تثبيت الاعتماديات
echo "📦 تثبيت الاعتماديات..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ فشل تثبيت الاعتماديات"
    exit 1
fi

echo "✅ تم تثبيت الاعتماديات"
echo ""

# إنشاء ملف .env
if [ ! -f .env ]; then
    echo "⚙️ إنشاء ملف .env..."
    cat > .env << EOF
# Server Configuration
PORT=3000
NODE_ENV=development
DOMAIN=http://localhost:3000

# Stripe Configuration (optional - demo mode if empty)
STRIPE_PUBLIC_KEY=pk_test_demo
STRIPE_SECRET_KEY=sk_test_demo

# Admin Email
ADMIN_EMAIL=salhiyounes250@gmail.com
EOF
    echo "✅ تم إنشاء .env"
else
    echo "✅ ملف .env موجود"
fi

echo ""
echo "🚀 جاهز للتشغيل!"
echo ""
echo "الخيارات:"
echo "1️⃣  npm run dev      - تطوير (مع إعادة تحميل تلقائية)"
echo "2️⃣  npm start        - الإنتاج"
echo ""
echo "بعد التشغيل، اذهب إلى:"
echo "🏠 الصفحة الرئيسية: http://localhost:3000"
echo "📱 التطبيق: http://localhost:3000/app"
echo "🧪 الاختبار: http://localhost:3000/test.html"
echo ""
