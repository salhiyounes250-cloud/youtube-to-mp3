// التحقق من دعم PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('Service Worker registration failed:', err);
    });
}

// إدارة اللغات
let currentLanguage = localStorage.getItem('language') || 'ar';

// المتغيرات الأساسية واختيار العناصر من الـ DOM
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

// تحديث حالة الاشتراك عند تحميل الصفحة
updatePremiumStatus();

// إضافة مستمعي الأحداث (Event Listeners)
if (downloadBtn) downloadBtn.addEventListener('click', handleDownload);
if (pasteBtn) pasteBtn.addEventListener('click', pasteFromClipboard);
if (upgradeBtn) upgradeBtn.addEventListener('click', openPaymentModal);
if (closeModal) closeModal.addEventListener('click', closePaymentModal);

// إعادة تهيئة زر الدفع عبر البريد الإلكتروني لمنع التكرار
const emailPayBtn = document.getElementById('emailPayBtn');
if (emailPayBtn) {
    const newBtn = emailPayBtn.cloneNode(true);
    emailPayBtn.replaceWith(newBtn);
    document.getElementById('emailPayBtn').addEventListener('click', () => initiatePayment('email'));
}

// تثبيت تطبيق الـ PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.classList.remove('hidden');
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        }
    });
}

// دالة لصق الرابط من الحافظة (Clipboard)
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (urlInput) {
            urlInput.value = text;
            urlInput.focus();
        }
    } catch (err) {
        alert(currentLanguage === 'ar' ? 'فضلاً أسمح للموقع بالوصول إلى الحافظة' : 'Please allow clipboard access');
    }
}

// التحقق من صحة رابط اليوتيوب باستخدام Regex
function isValidYoutubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;
    return youtubeRegex.test(url);
}

// معالجة التحميل الحقيقي والآمن والكامل
async function handleDownload() {
    if (!urlInput) return;
    const url = urlInput.value.trim();

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

    const formatRadio = document.querySelector('input[name="format"]:checked');
    const format = formatRadio ? formatRadio.value : 'mp3';

    // عرض مؤشر التحميل والعداد التنازلي للمستخدم
    showLoadingSpinner(format);

    try {
        // محاكاة تأخير الـ 10 ثواني لأصحاب الخطة المجانية فقط
        if (!isPremium) {
            await simulateDelay(10);
        }

        // إرسال الطلب إلى السيرفر الخلفي في Render
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
            throw new Error('Server response error');
        }

        const data = await response.json();
        
        if (data.success && data.downloadLink) {
            // تحميل حقيقي ونظيف وآمن للملف الصوتي أو الفيديو ببياناته الكاملة
            const link = document.createElement('a');
            link.href = data.downloadLink;
            link.setAttribute('download', data.title ? `${data.title}.${format}` : `Download_${Date.now()}.${format}`);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showSuccessMessage(format);
        } else {
            const msg = data.message || (currentLanguage === 'ar' ? 'حدث خطأ أثناء معالجة الملف بالسيرفر' : 'Error processing file on server');
            showError(msg);
        }

    } catch (error) {
        console.error('Download Fail:', error);
        hideLoadingSpinner();
        
        // رسالة تنبيهية ذكية بدلاً من توليد ملفات فارغة
        const alertMsg = currentLanguage === 'ar' 
            ? 'تنبيه: خادم الاستضافة المجاني يستيقظ الآن (يستغرق ذلك حوالي 30 ثانية). يرجى النقر على زر التحميل مرة أخرى لتنزيل ملفك كاملاً.' 
            : 'Notice: The free server instance is currently waking up (takes up to 30s). Please click download again to fetch your full file.';
        alert(alertMsg);
    }
}

// عرض مؤشر التحميل مع عداد تنازلي ذكي للمستخدم المجاني
function showLoadingSpinner(format) {
    if (!loadingSpinner) return;
    loadingSpinner.style.display = 'block';
    
    const countdownText = document.getElementById('countdownText');
    const loadingTextEl = document.getElementById('loadingText');
    
    if (isPremium) {
        if (loadingTextEl) loadingTextEl.textContent = currentLanguage === 'ar' ? 'جاري تحضير الملف المتقدم...' : 'Preparing premium file...';
        if (countdownText) countdownText.textContent = '';
    } else {
        let remaining = 10;
        if (loadingTextEl) loadingTextEl.textContent = currentLanguage === 'ar' ? 'جاري فحص الرابط...' : 'Checking video link...';
        
        const waitingText = currentLanguage === 'ar' ? 'الرجاء الانتظار:' : 'Please wait:';
        const secondsText = currentLanguage === 'ar' ? 'ثانية' : 'seconds';
        if (countdownText) countdownText.textContent = `${waitingText} ${remaining} ${secondsText}`;
        
        const interval = setInterval(() => {
            remaining--;
            if (remaining >= 0) {
                if (countdownText) countdownText.textContent = `${waitingText} ${remaining} ${secondsText}`;
            } else {
                clearInterval(interval);
            }
        }, 1000);
    }
}

// إخفاء مؤشر التحميل
function hideLoadingSpinner() {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
}

// عرض رسالة النجاح المنبثقة وتنظيف الإدخال
function showSuccessMessage(format) {
    hideLoadingSpinner();
    if (!successMessage) return;
    successMessage.style.display = 'block';
    
    let successText = '';
    if (format === 'premium') {
        successText = currentLanguage === 'ar' ? 'تم تفعيل النسخة المتقدمة بنجاح! 🎉' : 'Premium activated successfully! 🎉';
    } else {
        const formatName = format === 'mp3' ? (currentLanguage === 'ar' ? 'الملف الصوتي' : 'Audio File') : (currentLanguage === 'ar' ? 'ملف الفيديو' : 'Video File');
        successText = currentLanguage === 'ar' ? `تم تحميل ${formatName} بنجاح! 🎉` : `${formatName} downloaded successfully! 🎉`;
    }
    
    const successTextEl = document.getElementById('successText');
    if (successTextEl) successTextEl.textContent = successText;
    if (urlInput) urlInput.value = '';
    
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 4000);
}

// دالة عرض رسائل الخطأ المترجمة
function showError(message) {
    hideLoadingSpinner();
    const errors = {
        'ar': { 'empty': 'الرجاء إدخال رابط فيديو', 'invalid': 'الرجاء إدخال رابط يوتيوب صحيح' },
        'en': { 'empty': 'Please enter a video link', 'invalid': 'Please enter a valid YouTube URL' }
    };
    
    let translatedMessage = message;
    if (message === 'الرجاء إدخال رابط فيديو' || message === 'Please enter a video link') {
        translatedMessage = errors[currentLanguage].empty;
    } else if (message === 'الرجاء إدخال رابط يوتيوب صحيح' || message === 'Please enter a valid YouTube URL') {
        translatedMessage = errors[currentLanguage].invalid;
    }
    alert(translatedMessage);
}

// دالة تأخير الوقت (Promise-based)
function simulateDelay(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// تحديث حالة العرض البصري للخطة المفعلة (مجاني / متقدم)
function updatePremiumStatus() {
    const badge = document.querySelector('.badge-text');
    const speedText = document.querySelector('#speedStatus strong');
    
    if (isPremium) {
        if (badge) badge.textContent = currentLanguage === 'ar' ? '🌟 متقدم' : '🌟 Premium';
        if (premiumBadge) premiumBadge.classList.add('premium');
        if (speedText) speedText.textContent = currentLanguage === 'ar' ? 'فوري (بدون تأخير)' : 'Instant (No Delay)';
        if (upgradeBtn) upgradeBtn.style.display = 'none';
    } else {
        if (badge) badge.textContent = currentLanguage === 'ar' ? 'مجاني' : 'Free';
        if (premiumBadge) premiumBadge.classList.remove('premium');
        if (speedText) speedText.textContent = currentLanguage === 'ar' ? '10 ثواني' : '10 seconds';
        if (upgradeBtn) upgradeBtn.style.display = 'inline-block';
    }
}

// وظائف التحكم في نافذة الدفع المنبثقة (Modal)
function openPaymentModal() { if (paymentModal) paymentModal.classList.add('show'); }
function closePaymentModal() { if (paymentModal) paymentModal.classList.remove('show'); }

window.addEventListener('click', (event) => {
    if (event.target === paymentModal) closePaymentModal();
});

function initiatePayment(provider) {
    if (provider === 'email') {
        initiateEmailPayment();
    } else {
        closePaymentModal();
    }
}

// بدء عملية الدفع وإرسال الإيميل للسيرفر
async function initiateEmailPayment() {
    const emailInput = document.getElementById('userEmailInput');
    const userEmail = emailInput ? emailInput.value.trim() : '';

    if (!userEmail || !userEmail.includes('@')) {
        const errorMsg = currentLanguage === 'ar' ? 'الرجاء إدخال بريد إلكتروني صحيح!' : 'Please enter a valid email address!';
        alert(errorMsg);
        return;
    }

    closePaymentModal();

    try {
        const response = await fetch('/api/request-payment-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
        });

        const data = await response.json();

        if (data.success) {
            showSuccessMessage('premium');
            const successTextEl = document.getElementById('successText');
            if (successTextEl) successTextEl.textContent = data.message;
            
            localStorage.setItem('paymentPending', 'true');
            localStorage.setItem('userEmail', userEmail);
            localStorage.setItem('paymentRequestTime', new Date().toISOString());
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error sending payment request:', error);
        alert(currentLanguage === 'ar' ? 'حدث خطأ أثناء إرسال الطلب للسيرفر.' : 'Error sending request to server.');
    }
}

// التعامل مع نجاح عملية الدفع الفعلية وتخزينها محلياً
function handlePaymentSuccess(provider) {
    localStorage.setItem('isPremium', 'true');
    localStorage.setItem('premiumExpiry', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());
    localStorage.setItem('paymentProvider', provider);
    
    isPremium = true;
    updatePremiumStatus();
    showSuccessMessage('premium');
    
    if (navigator.onLine) {
        const userEmail = localStorage.getItem('userEmail') || 'unknown@example.com';
        fetch('/api/payment-success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: provider, timestamp: new Date().toISOString(), userEmail: userEmail })
        })
        .then(res => res.json())
        .then(data => console.log('✅ Payment notification sent:', data))
        .catch(err => console.log('Failed to notify server:', err));
    }
}

// التحقق من صلاحية الاشتراك السنوي بشكل دوري تلقائي
function checkPremiumExpiry() {
    const expiry = localStorage.getItem('premiumExpiry');
    if (expiry && new Date(expiry) < new Date()) {
        localStorage.setItem('isPremium', 'false');
        isPremium = false;
        updatePremiumStatus();
    }
}
setInterval(checkPremiumExpiry, 60 * 60 * 1000);

// دعم اختصار لوحة المفاتيح المتقدم للصق الروابط (Ctrl + V)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && document.activeElement !== urlInput) {
        pasteFromClipboard();
    }
});

// التعامل مع مشاركة الملفات من خارج التطبيق في الهواتف الذكية
if ('launchQueue' in window) {
    window.launchQueue.setConsumer((launchParams) => {
        if (launchParams.files && launchParams.files.length > 0) {
            console.log('File shared:', launchParams.files[0].name);
        }
    });
}

if (successMessage) {
    successMessage.addEventListener('animationend', () => {
        successMessage.style.display = 'none';
    });
}

// ===== تفعيل نظام تبديل اللغات الذكي والترجمات الفورية =====
window.addEventListener('DOMContentLoaded', () => {
    applyLanguage(currentLanguage);
    updateLanguageButton();
});

function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    localStorage.setItem('language', currentLanguage);
    applyLanguage(currentLanguage);
    updateLanguageButton();
}

function applyLanguage(lang) {
    const htmlElement = document.getElementById('htmlElement');
    if (htmlElement) {
        htmlElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        htmlElement.setAttribute('lang', lang);
    }

    if (urlInput && urlInput.dataset) {
        urlInput.placeholder = lang === 'ar' ? urlInput.dataset.arPlaceholder : urlInput.dataset.enPlaceholder;
    }

    document.querySelectorAll('[data-ar][data-en]').forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
        const text = lang === 'ar' ? el.dataset.ar : el.dataset.en;
        if (el.children.length === 0) {
            el.textContent = text;
        } else {
            for (let node of el.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    node.textContent = text;
                    break;
                }
            }
        }
    });

    document.querySelectorAll('[data-ar-text][data-en-text]').forEach(el => {
        const text = lang === 'ar' ? el.dataset.arText : el.dataset.enText;
        const buttonText = el.querySelector('.button-text');
        if (buttonText) {
            buttonText.textContent = text;
        } else {
            el.textContent = text;
        }
    });

    document.title = lang === 'ar' ? 'YouTube to MP3 - حمل فيديوهات يوتيوب' : 'YouTube to MP3 - Download YouTube Videos';
    updatePremiumStatus();
}

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
