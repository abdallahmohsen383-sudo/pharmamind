
import CryptoJS from 'crypto-js';

const ACTIVATION_STATUS_KEY = 'pharmamind_activation_status';
const ACTIVATION_SUCCESS_TOKEN = 'ACTIVATED_PERMANENTLY_SECURE_TOKEN';

// هذا هو "الباسورد" الثابت الذي ستضربه في الدقائق. يمكنك تغييره لأي رقم تريده.
const MASTER_PASSWORD = 2025; 

export const ActivationService = {
  // الحصول على معرف الجهاز (للعرض فقط الآن)
  getDeviceId: (): string => {
    // لم نعد نحتاجه في المعادلة، لكن نبقيه كمعرف للجهاز
    let deviceId = localStorage.getItem('pharmamind_device_id');
    if (!deviceId) {
      deviceId = 'ID-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('pharmamind_device_id', deviceId);
    }
    return deviceId;
  },

  // التحقق هل البرنامج مفعل مسبقاً أم لا
  isActivated: (): boolean => {
    const status = localStorage.getItem(ACTIVATION_STATUS_KEY);
    // إذا كان التوكن موجود، فالبرنامج مفعل
    return status === ACTIVATION_SUCCESS_TOKEN;
  },

  // محاولة تفعيل البرنامج بالكود المدخل
  activate: (inputKey: string): boolean => {
    const numericInput = parseInt(inputKey.trim());
    if (isNaN(numericInput)) return false;

    const now = new Date();
    const currentMinutes = now.getMinutes();
    
    // المعادلة: الباسورد * الدقائق الحالية
    const expectedValue = MASTER_PASSWORD * currentMinutes;
    
    // المعادلة الاحتياطية: الباسورد * الدقائق السابقة (في حال تغيرت الدقيقة أثناء الكتابة)
    // نتعامل مع الدقيقة 0 بأن الدقيقة السابقة لها هي 59
    const prevMinutes = currentMinutes === 0 ? 59 : currentMinutes - 1;
    const expectedValuePrev = MASTER_PASSWORD * prevMinutes;

    // التحقق: هل المدخل يساوي القيمة الحالية أو السابقة؟
    if (numericInput === expectedValue || numericInput === expectedValuePrev) {
      // تفعيل دائم
      localStorage.setItem(ACTIVATION_STATUS_KEY, ACTIVATION_SUCCESS_TOKEN);
      return true;
    }
    
    return false;
  },

  // دالة مساعدة لك أنت (الآدمن) لمعرفة الكود الحالي
  getCurrentDebugCode: (): string => {
    const now = new Date();
    const minutes = now.getMinutes();
    const code = MASTER_PASSWORD * minutes;
    return `الدقيقة الآن: ${minutes}\nالباسورد: ${MASTER_PASSWORD}\nالكود المطلوب: ${code}`;
  }
};
