# دليل الصور والأصوات

## 🎵 الأصوات المدمجة

تم دمج 4 ملفات صوتية في اللعبة:

### 1. **click.mp3** 🔊
- **الاستخدام**: عند الضغط على الأزرار
- **المواقع**:
  - اختيار أفاتار
  - إنشاء/دخول غرفة
  - اختيار هدف الليل
  - تأكيد الإجراءات

### 2. **whisper.mp3** 🤫
- **الاستخدام**: عندما تبدأ مرحلة المافيا الليلية
- **الوصف**: يشغل صوت همسة للمافيا فقط

### 3. **death.mp3** 💀
- **الاستخدام**: عندما يموت لاعب
- **المواقع**:
  - قتل المافيا
  - خطأ القناص

### 4. **timer.mp3** ⏰
- **الاستخدام**: عند انتهاء المؤقت
- **المدة**: تشغل تنبيه صوتي نهاية الوقت

---

## 🎨 الصور المدمجة

تم دمج صورتين للشخصيات:

### 1. **player-1.png** 👦
- حجم مقترح: 240x240px
- الاستخدام: للاعب الأول والفردي

### 2. **player-2.png** 👧
- حجم مقترح: 240x240px
- الاستخدام: للاعب الثاني والزوجي

### كيفية الاستخدام:
```javascript
// في public/client.js تم إضافة:
const PLAYER_IMAGES = {
    '1': '/images/player-1.png',
    '2': '/images/player-2.png',
};

// الصور تُعرض تلقائياً في لوحة المؤتمر
```

---

## 🔧 كيفية تحسين الصور والأصوات

### تحسين الصور:
1. اختر صور بنفس الحجم (240x240px)
2. استخدم PNG أو JPG بجودة عالية
3. أضفها في `public/images/`

### تحسين الأصوات:
1. استخدم صيغ MP3 عالية الجودة
2. ضع مستوى صوت معتدل (0.5)
3. أضفها في `public/sounds/`

---

## 🎯 تخطيط الصور والأصوات المستقبلية

للحصول على تجربة أفضل، يمكنك إضافة:

### صور إضافية:
```
public/images/
├── player-1.png      ✅ موجودة
├── player-2.png      ✅ موجودة
├── background.png    (خيار)
├── role-icon-1.png   (خيار)
└── ...
```

### أصوات إضافية:
```
public/sounds/
├── click.mp3         ✅ موجودة
├── whisper.mp3       ✅ موجودة
├── death.mp3         ✅ موجودة
├── timer.mp3         ✅ موجودة
├── background.mp3    (خيار موسيقى خلفية)
└── ...
```

---

## 📝 الكود الذي تم إضافته

### نظام الأصوات:
```javascript
const Sounds = {
    click: new Audio('/sounds/click.mp3'),
    death: new Audio('/sounds/death.mp3'),
    timer: new Audio('/sounds/timer.mp3'),
    whisper: new Audio('/sounds/whisper.mp3'),
};

function playSound(soundName) {
    if (Sounds[soundName]) {
        const sound = Sounds[soundName].cloneNode();
        sound.volume = 0.5;
        sound.play().catch(e => console.log('Sound play failed:', e));
    }
}
```

### نظام الصور:
```javascript
const PLAYER_IMAGES = {
    '1': '/images/player-1.png',
    '2': '/images/player-2.png',
};

function getPlayerImage(index) {
    const key = String((index % 2) + 1);
    return PLAYER_IMAGES[key] || '😎';
}
```

---

## ⚙️ إعدادات الصوت

- **المستوى الحالي**: 0.5 (50%)
- **يمكنك تغييره** بتعديل: `sound.volume = 0.5;`
  - `0.0` = صامت
  - `0.5` = متوسط ✓
  - `1.0` = أقصى

---

## 🧪 اختبار الأصوات

لاختبار الأصوات في المتصفح:
1. افتح **Console** (F12)
2. اكتب الأوامر التالية:
```javascript
playSound('click');   // اختبر الضغط
playSound('whisper'); // اختبر الهمسة
playSound('death');   // اختبر الموت
playSound('timer');   // اختبر المؤقت
```

---

## 📍 المسارات الصحيحة

```
✅ /images/player-1.png
✅ /images/player-2.png
✅ /sounds/click.mp3
✅ /sounds/whisper.mp3
✅ /sounds/death.mp3
✅ /sounds/timer.mp3
```

---

## 🐛 حل المشاكل

### الصور لا تظهر:
```
✓ تحقق من المسار: public/images/player-1.png
✓ تأكد من اسم الملف (حالة الأحرف)
✓ استخدم PNG أو JPG فقط
```

### الأصوات لا تشغل:
```
✓ تحقق من المسار: public/sounds/click.mp3
✓ تأكد من صيغة MP3
✓ افتح Console لرؤية الأخطاء
✓ السماح للمتصفح تشغيل الأصوات
```

---

## 📊 هيكل المشروع النهائي

```
📦 public/
├── 📂 images/
│   ├── player-1.png  ✅
│   └── player-2.png  ✅
├── 📂 sounds/
│   ├── click.mp3     ✅
│   ├── death.mp3     ✅
│   ├── timer.mp3     ✅
│   └── whisper.mp3   ✅
├── index.html        ✅
├── client.js         ✅ (محدث)
└── style.css         ✅
```

---

**جاهز للعب مع الصور والأصوات! 🎉**
