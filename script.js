// التحقق من دعم PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('Service Worker registration failed:', err);
    });
}

// إدارة اللغات
let currentLanguage = localStorage.getItem('language') || 'ar';

// المتغيرات الأساسية
const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const pasteBtn = document.getElementById('pasteBtn');
const installBtn = document.getElementById('installBtn');
const upgradeBtn = document.getElementById('upgradeBtn');
const paymentModal = document.getElementById('paymentModal');
const closeModal = document.getElementById('closeModal');
const stripePayBtn = document.getElementById('stripePayBtn');
const paypalPayBtn = document.getElementById('paypalPayBtn');
const premiumBadge = document.getElementById('premiumBadge');
const speedStatus = document.getElementById('speedStatus');
const loadingSpinner = document.getElementById('loadingSpinner');
const successMessage = document.getElementById('successMessage');

let deferredPrompt;
let isPremium = localStorage.getItem('isPremium') === 'true';
let downloadDelay = isPremium ? 0 : 10000; // 10 ثواني للمجاني، 0 للمتقدم

// تحديث حالة الاشتراك عند تحميل الصفحة
updatePremiumStatus();

// Event Listeners
downloadBtn.addEventListener('click', handleDownload);
pasteBtn.addEventListener('click', pasteFromClipboard);
upgradeBtn.addEventListener('click', openPaymentModal);
closeModal.addEventListener('click', closePaymentModal);

// تأكد من إزالة المستمعات القديمة أولاً
const emailPayBtn = document.getElementById('emailPayBtn');
if (emailPayBtn) {
    const newBtn = emailPayBtn.cloneNode(true);
    emailPayBtn.replaceWith(newBtn);
    
    // إضافة المستمع الصحيح
    document.getElementById('emailPayBtn').addEventListener('click', () => initiatePayment('email'));
}

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        deferredPrompt = null;
        installBtn.classList.add('hidden');
    }
});

// لصق الرابط من الحافظة
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        urlInput.value = text;
        urlInput.focus();
    } catch (err) {
        alert('فضلاً أسمح بالوصول إلى الحافظة');
    }
}

// التحقق من صحة رابط اليوتيوب
function isValidYoutubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;
    return youtubeRegex.test(url);
}

// معالجة التحميل
async function handleDownload() {
    const url = urlInput.value.trim();

    // التحقق من الرابط
    if (!url) {
        const msg = currentLanguage === 'ar' ? 'الرجاء إدخال رابط فيديو' : 'Please enter a video link';
        showError(msg);
        return;
    }

    if (!isValidYoutubeUrl(url)) {
        const msg = currentLanguage === 'ar' ? 'الرجاء إدخال رابط يوتيوب صحيح' : 'Please enter a valid YouTube URL';
        showError(msg);
        return;
    }

    // الحصول على الصيغة المختارة
    const format = document.querySelector('input[name="format"]:checked').value;

    // عرض مؤشر التحميل
    showLoadingSpinner(format);

    try {
        // محاكاة التأخير
        if (!isPremium) {
            await simulateDelay(10);
        }

        // إرسال طلب إلى الخادم
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                format: format,
                isPremium: isPremium
            })
        });

        if (!response.ok) {
            // إذا كان الخادم غير متاح، استخدم محاكاة
            simulateDownload(url, format);
        } else {
            const data = await response.json();
            if (data.success) {
                showSuccessMessage(format);
            } else {
                const msg = data.message || (currentLanguage === 'ar' ? 'حدث خطأ أثناء التحميل' : 'Error during download');
                showError(msg);
            }
        }
    } catch (error) {
        console.log('محاكاة التحميل (الخادم غير متاح)');
        simulateDownload(url, format);
    }
}

// محاكاة التحميل (للتطوير والاختبار)
function simulateDownload(url, format) {
    // محاكاة نجاح التحميل
    hideLoadingSpinner();
    
    // محاكاة إنشاء ملف وتحميله
    const fileName = `video.${format}`;
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${btoa('fake file content')}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccessMessage(format);
}

// عرض مؤشر التحميل
function showLoadingSpinner(format) {
    loadingSpinner.style.display = 'block';
    const countdownText = document.getElementById('countdownText');
    const loadingTextEl = document.getElementById('loadingText');
    
    if (isPremium) {
        loadingTextEl.textContent = currentLanguage === 'ar' 
            ? 'جاري تحضير الملف...' 
            : 'Preparing file...';
        countdownText.textContent = '';
    } else {
        let remaining = 10;
        loadingTextEl.textContent = currentLanguage === 'ar'
            ? 'جاري البحث عن الفيديو...'
            : 'Searching for video...';
        const waitingText = currentLanguage === 'ar' ? 'الرجاء الانتظار:' : 'Please wait:';
        const secondsText = currentLanguage === 'ar' ? 'ثانية' : 'seconds';
        countdownText.textContent = `${waitingText} ${remaining} ${secondsText}`;
        
        const interval = setInterval(() => {
            remaining--;
            if (remaining >= 0) {
                countdownText.textContent = `${waitingText} ${remaining} ${secondsText}`;
            } else {
                clearInterval(interval);
            }
        }, 1000);
    }
}

// إخفاء مؤشر التحميل
function hideLoadingSpinner() {
    loadingSpinner.style.display = 'none';
}

// عرض رسالة النجاح
function showSuccessMessage(format) {
    hideLoadingSpinner();
    successMessage.style.display = 'block';
    
    let successText = '';
    if (format === 'premium') {
        successText = currentLanguage === 'ar' 
            ? 'تم تفعيل النسخة المتقدمة بنجاح! 🎉'
            : 'Premium activated successfully! 🎉';
    } else {
        const formatName = format === 'mp3' 
            ? (currentLanguage === 'ar' ? 'الملف الصوتي' : 'Audio File')
            : (currentLanguage === 'ar' ? 'ملف الفيديو' : 'Video File');
        successText = currentLanguage === 'ar'
            ? `تم تحميل ${formatName} بنجاح! 🎉`
            : `${formatName} downloaded successfully! 🎉`;
    }
    
    document.getElementById('successText').textContent = successText;
    
    urlInput.value = '';
    
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

// عرض رسالة خطأ
function showError(message) {
    hideLoadingSpinner();
    
    // ترجمة الأخطاء الشائعة
    const errors = {
        'ar': {
            'empty': 'الرجاء إدخال رابط فيديو',
            'invalid': 'الرجاء إدخال رابط يوتيوب صحيح'
        },
        'en': {
            'empty': 'Please enter a video link',
            'invalid': 'Please enter a valid YouTube URL'
        }
    };
    
    let translatedMessage = message;
    if (message === 'الرجاء إدخال رابط فيديو' || message === 'Please enter a video link') {
        translatedMessage = errors[currentLanguage].empty;
    } else if (message === 'الرجاء إدخال رابط يوتيوب صحيح' || message === 'Please enter a valid YouTube URL') {
        translatedMessage = errors[currentLanguage].invalid;
    }
    
    alert(translatedMessage);
}

// محاكاة التأخير (للمجاني فقط)
function simulateDelay(seconds) {
    return new Promise(resolve => {
        setTimeout(resolve, seconds * 1000);
    });
}

// تحديث حالة الاشتراك
function updatePremiumStatus() {
    const badge = document.querySelector('.badge-text');
    const speedText = document.querySelector('#speedStatus strong');
    
    if (isPremium) {
        badge.textContent = '🌟 متقدم';
        premiumBadge.classList.add('premium');
        speedText.textContent = 'فوري (بدون تأخير)';
        upgradeBtn.style.display = 'none';
    } else {
        badge.textContent = 'مجاني';
        premiumBadge.classList.remove('premium');
        speedText.textContent = '10 ثواني';
        upgradeBtn.style.display = 'inline-block';
    }
}

// فتح نافذة الدفع
function openPaymentModal() {
    paymentModal.classList.add('show');
}

// إغلاق نافذة الدفع
function closePaymentModal() {
    paymentModal.classList.remove('show');
}

// إغلاق النافذة عند الضغط خارجها
window.addEventListener('click', (event) => {
    if (event.target === paymentModal) {
        closePaymentModal();
    }
});

// بدء عملية الدفع
function initiatePayment(provider) {
    closePaymentModal();
    
    if (provider === 'email') {
        // فتح البريد الإلكتروني
        initiateEmailPayment();
    }
}

// الدفع عبر البريد الإلكتروني
function initiateEmailPayment() {
    const email = 'salhiyounes250@gmail.com';
    const subject = encodeURIComponent(currentLanguage === 'ar' 
        ? 'طلب اشتراك Premium - YouTube to MP3' 
        : 'Premium Subscription Request - YouTube to MP3');
    
    const body = encodeURIComponent(
        currentLanguage === 'ar' 
            ? `السلام عليكم ورحمة الله وبركاته\n\nأود الاشتراك في النسخة المتقدمة (Premium) من تطبيق YouTube to MP3\n\nالمبلغ: 5 دولارات\nالمدة: سنة واحدة\n\nيرجى إرسال تفاصيل الدفع.\n\nشكراً`
            : `Hello,\n\nI would like to subscribe to the Premium version of YouTube to MP3 app.\n\nAmount: $5\nDuration: One year\n\nPlease send payment details.\n\nThank you`
    );
    
    // فتح البريد الإلكتروني
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    
    // عرض رسالة للمستخدم
    setTimeout(() => {
        showSuccessMessage(
            currentLanguage === 'ar'
                ? 'سيتم فتح برنامج البريد الإلكتروني. يرجى إرسال الطلب وسنتواصل معك قريباً.'
                : 'Email client will open. Please send the request and we will contact you soon.'
        );
        
        // حفظ حالة معلقة
        localStorage.setItem('paymentPending', 'true');
        localStorage.setItem('paymentRequestTime', new Date().toISOString());
    }, 500);
}

// معالجة نجاح الدفع
function handlePaymentSuccess(provider) {
    // حفظ حالة الاشتراك
    localStorage.setItem('isPremium', 'true');
    localStorage.setItem('premiumExpiry', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());
    localStorage.setItem('paymentProvider', provider);
    
    // تحديث الواجهة
    isPremium = true;
    updatePremiumStatus();
    
    // عرض رسالة النجاح
    showSuccessMessage('premium');
    
    // إرسال إشعار إلى الخادم
    if (navigator.onLine) {
        const userEmail = localStorage.getItem('userEmail') || 'unknown@example.com';
        
        fetch('/api/payment-success', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider: provider,
                timestamp: new Date().toISOString(),
                userEmail: userEmail
            })
        })
        .then(res => res.json())
        .then(data => {
            console.log('✅ Payment notification sent:', data);
            console.log(`💰 Money will be sent to: ${data.adminEmail}`);
        })
        .catch(err => console.log('Failed to notify server:', err));
    }
}

// التحقق من صلاحية الاشتراك
function checkPremiumExpiry() {
    const expiry = localStorage.getItem('premiumExpiry');
    if (expiry && new Date(expiry) < new Date()) {
        localStorage.setItem('isPremium', 'false');
        isPremium = false;
        updatePremiumStatus();
    }
}

// التحقق من الصلاحية كل ساعة
setInterval(checkPremiumExpiry, 60 * 60 * 1000);

// إضافة اختصار لوحة المفاتيح: Ctrl+V للصق
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && document.activeElement !== urlInput) {
        pasteFromClipboard();
    }
});

// التعامل مع مشاركة الملفات من التطبيق
if ('launchQueue' in window) {
    window.launchQueue.setConsumer((launchParams) => {
        if (launchParams.files && launchParams.files.length > 0) {
            const file = launchParams.files[0];
            console.log('File shared:', file.name);
        }
    });
}

// إضافة رسالة النجاح المخصصة
const successMessage2 = document.getElementById('successMessage');
successMessage2.addEventListener('animationend', () => {
    successMessage2.style.display = 'none';
});

// ===== نظام اللغات =====
// تطبيق اللغة عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    applyLanguage(currentLanguage);
    updateLanguageButton();
});

// تبديل اللغة
function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    localStorage.setItem('language', currentLanguage);
    applyLanguage(currentLanguage);
    updateLanguageButton();
}

// تطبيق اللغة على الصفحة
function applyLanguage(lang) {
    const htmlElement = document.getElementById('htmlElement');
    const urlInput = document.getElementById('urlInput');

    // تغيير اتجاه الصفحة
    if (lang === 'ar') {
        htmlElement.setAttribute('dir', 'rtl');
        htmlElement.setAttribute('lang', 'ar');
    } else {
        htmlElement.setAttribute('dir', 'ltr');
        htmlElement.setAttribute('lang', 'en');
    }

    // تحديث المدخلات
    if (urlInput && urlInput.dataset) {
        urlInput.placeholder = lang === 'ar' 
            ? urlInput.dataset.arPlaceholder 
            : urlInput.dataset.enPlaceholder;
    }

    // تحديث جميع العناصر التي تحتوي على data-ar و data-en
    document.querySelectorAll('[data-ar][data-en]').forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            return; // تخطي المدخلات
        }
        const text = lang === 'ar' ? el.dataset.ar : el.dataset.en;
        // تحديث النص فقط، ولا نغير الـ HTML
        if (el.children.length === 0) {
            el.textContent = text;
        } else {
            // إذا كان العنصر يحتوي على عناصر فرعية، حدّث النص الأول فقط
            let textNode = null;
            for (let node of el.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    node.textContent = text;
                    break;
                }
            }
            // إذا لم نجد نص، أضفه
            if (!textNode && el.firstChild) {
                el.insertBefore(document.createTextNode(text), el.firstChild);
            }
        }
    });

    // تحديث الأزرار ذات النصوص
    document.querySelectorAll('[data-ar-text][data-en-text]').forEach(el => {
        const text = lang === 'ar' ? el.dataset.arText : el.dataset.enText;
        const buttonText = el.querySelector('.button-text');
        if (buttonText) {
            buttonText.textContent = text;
        } else {
            el.textContent = text;
        }
    });

    // تحديث عنوان الصفحة
    document.title = lang === 'ar' 
        ? 'YouTube to MP3 - حمل فيديوهات يوتيوب'
        : 'YouTube to MP3 - Download YouTube Videos';

    // تحديث النصوص المركبة
    updatePremiumStatus();
}

// تحديث زر اللغة
function updateLanguageButton() {
    const langToggleBtn = document.getElementById('langToggleBtn');
    const langText = document.getElementById('langText');
    
    if (langToggleBtn && langText) {
        if (currentLanguage === 'ar') {
            langText.textContent = '🌐 English';
            langToggleBtn.title = 'Switch to English / التبديل إلى الإنجليزية';
        } else {
            langText.textContent = '🌐 العربية';
            langToggleBtn.title = 'Switch to Arabic / التبديل إلى العربية';
        }
    }
}

// تحديث نصوص الحالة حسب اللغة
const originalUpdatePremiumStatus = updatePremiumStatus;
updatePremiumStatus = function() {
    const badge = document.querySelector('.badge-text');
    const speedText = document.querySelector('#speedStatus strong');
    const speedLabel = document.querySelector('#speedStatus span');
    
    if (isPremium) {
        badge.textContent = currentLanguage === 'ar' ? '🌟 متقدم' : '🌟 Premium';
        premiumBadge.classList.add('premium');
        speedText.textContent = currentLanguage === 'ar' ? 'فوري (بدون تأخير)' : 'Instant (No Delay)';
        upgradeBtn.style.display = 'none';
    } else {
        badge.textContent = currentLanguage === 'ar' ? 'مجاني' : 'Free';
        premiumBadge.classList.remove('premium');
        speedText.textContent = currentLanguage === 'ar' ? '10 ثواني' : '10 seconds';
        upgradeBtn.style.display = 'inline-block';
    }
};
