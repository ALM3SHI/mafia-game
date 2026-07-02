# 🎭 QUICK IMPLEMENTATION GUIDE
## How to Use the New Effects & Features

---

## 1. SOUND EFFECTS - COPY & PASTE EXAMPLES

### In `game.html` - When Role is Revealed:
```javascript
// In your setupRevealScreen() function, after showing the role:
if (rIcon && role) {
    rIcon.innerText = role.icon;
    rIcon.style.color = role.color;
    
    // ✨ ADD THIS LINE:
    MafiaFX.cardReveal(document.getElementById('reveal-screen'));
}
```

### In `game.html` - When Vote Confirmed:
```javascript
// Add to your vote submission handler:
function submitVote(targetPlayerId) {
    // ... your existing vote code ...
    
    // ✨ ADD THIS:
    const voteBtn = document.getElementById('your-vote-button-id');
    const rect = voteBtn.getBoundingClientRect();
    MafiaFX.voteConfirm(rect.x + rect.width/2, rect.y + rect.height/2);
    
    MafiaFX.play('vote'); // Also play the vote sound
}
```

### In `game.html` - When Game Ends:
```javascript
// In your endGame() or resolution function:
function handleGameEnd(winnerTeam) {
    // ... your end screen code ...
    
    // ✨ ADD ONE OF THESE:
    if (playerTeamWon) {
        MafiaFX.victory();
    } else {
        MafiaFX.defeat();
    }
}
```

### In `store.html` - When Item Purchased:
```javascript
// In your purchase confirmation handler:
function confirmPurchase(itemElement) {
    // ... your purchase API call ...
    
    // ✨ ADD THIS:
    MafiaFX.coinGain(itemElement);
    MafiaFX.play('purchase');
    
    // Show success message
    showToast('تم الشراء بنجاح! 🎉', 'success');
}
```

### In `collection.html` - When Card Flips:
```javascript
// In your card flip handler:
function flipCard(cardElement) {
    // ... your flip logic ...
    
    // ✨ ADD THIS:
    MafiaFX.cardReveal(cardElement);
    
    // Or if it's just revealing (not flipping):
    MafiaFX.play('reveal');
    MafiaFX.createParticles({
        x: cardElement.getBoundingClientRect().x + 75,
        y: cardElement.getBoundingClientRect().y + 112,
        colors: ['#cfb06f', '#fff', '#7f95a1'],
        count: 25
    });
}
```

---

## 2. CSS CLASSES - APPLY TO YOUR ELEMENTS

### Loading State:
```html
<!-- Show while loading -->
<button class="px-btn ds-loading">Loading...</button>

<!-- In JavaScript: -->
button.classList.add('ds-loading');
await fetchData();
button.classList.remove('ds-loading');
```

### Form Input Feedback:
```html
<!-- Normal input -->
<input type="text" id="playerName" placeholder="اسم اللاعب">

<!-- When there's an error -->
<input type="text" class="error" placeholder="خطأ في الإدخال">
<p class="error-message">هذا الاسم مأخوذ بالفعل</p>

<!-- When input is valid -->
<input type="text" class="success" placeholder="تم التحقق">
<p class="success-message">الاسم صحيح</p>
```

### Toast Notifications:
```javascript
// Create helper function (add to your JS):
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `ds-toast ${type}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInToast 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Use it anywhere:
showToast('تم الانضمام بنجاح!', 'success');
showToast('خطأ الاتصال', 'error');
showToast('يرجى الانتظار...', 'info');
```

### Pulse Animation (Attention):
```html
<!-- Add to any element that needs attention -->
<button class="pulse px-btn">انقر هنا!</button>

<!-- In CSS (already in design-system.css) -->
<style>
  .pulse {
    animation: pulse 2s ease-in-out infinite;
  }
</style>
```

### Glow Fade Effect:
```javascript
// When something important happens:
const element = document.getElementById('important-text');
element.classList.add('glow-fade');

// After animation, remove it:
setTimeout(() => {
    element.classList.remove('glow-fade');
}, 1500);
```

---

## 3. SETTINGS PAGE - LINK IT UP

### Add Settings Link to index.html:
In your home page navigation, add:
```html
<a href="settings.html" class="px-btn px-btn-gray">
  <span>⚙️</span> الإعدادات
</a>
```

### Add Settings Link to Game HUD:
In `game.html`, add to your HUD:
```html
<button id="openSettings" class="ds-icon-btn" title="الإعدادات">⚙️</button>

<script>
document.getElementById('openSettings').addEventListener('click', () => {
    // Option 1: Open settings in modal
    window.location.href = 'settings.html';
    
    // Option 2: If you want a modal instead, create a modal with settings iframe
});
</script>
```

### Check User Settings Before Game Starts:
```javascript
function checkGameSettings() {
    const speechDuration = parseInt(localStorage.getItem('maf_speech_duration') || 15);
    const voteDuration = parseInt(localStorage.getItem('maf_vote_duration') || 15);
    const nightDuration = parseInt(localStorage.getItem('maf_night_duration') || 15);
    
    // Use these values in your game config
    return {
        speechSeconds: speechDuration,
        voteSeconds: voteDuration,
        nightSeconds: nightDuration
    };
}
```

---

## 4. ERROR HANDLING - WRAP YOUR API CALLS

### Before (No Error Feedback):
```javascript
async function joinGame(roomCode) {
    const response = await fetch('/api/join', {
        body: JSON.stringify({ roomCode })
    });
    const data = await response.json();
    // ... proceed ...
}
```

### After (With Polish):
```javascript
async function joinGame(roomCode) {
    const btn = document.getElementById('joinBtn');
    btn.classList.add('ds-loading');
    
    try {
        const response = await fetch('/api/join', {
            body: JSON.stringify({ roomCode })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Success!
        btn.classList.remove('ds-loading');
        MafiaFX.success('تم الانضمام!', btn);
        showToast('تم الانضمام بنجاح!', 'success');
        
    } catch (error) {
        // Error handling with polish
        btn.classList.remove('ds-loading');
        MafiaFX.error(btn);
        showToast('خطأ: ' + error.message, 'error');
    }
}
```

---

## 5. ASSET REFERENCES - ADD THESE COMMENTS

### In game.html, add near role icons:
```javascript
// Role icons (can be emoji or image)
const ROLES = {
    doctor: {
        id: 'doctor',
        icon: '💊', // OR: ASSET_IMAGE: assets/role-doctor.png
        name: 'الطبيب',
        color: '#7f95a1'
    },
    // ... more roles
};
```

### In collection.html, add near collection items:
```javascript
// ASSET_IMAGES_NEEDED:
// - assets/card-back-default.png
// - assets/card-back-neon.png
// - assets/card-back-gold.png
// - assets/role-citizen.png
// - assets/role-doctor.png
// - assets/role-sheriff.png
// ... (list all needed images)
```

### In effects.js, reference sound files:
```javascript
// SOUND_FILES_NEEDED (in assets/ folder):
sounds: {
    click: new Audio('assets/sfx-click.mp3'),      // ✓ Existing
    // ...
    vote: new Audio('assets/sfx-vote.mp3'),        // ✓ NEW
    notification: new Audio('assets/sfx-notification.mp3'),
    heartbeat: new Audio('assets/sfx-heartbeat.mp3'),
    // etc...
}
```

---

## 6. MODAL DIALOG - FOR CONFIRMATIONS

### Create a Reusable Modal:
```javascript
class ConfirmDialog {
    constructor(title, message, onConfirm, onCancel) {
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
    }
    
    show() {
        const modal = document.createElement('div');
        modal.className = 'ds-modal visible';
        modal.innerHTML = `
            <div class="ds-modal-content">
                <h2>${this.title}</h2>
                <p>${this.message}</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="px-btn px-btn-green" id="confirmBtn">تأكيد</button>
                    <button class="px-btn px-btn-gray" id="cancelBtn">إلغاء</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#confirmBtn').addEventListener('click', () => {
            this.onConfirm?.();
            modal.remove();
        });
        
        modal.querySelector('#cancelBtn').addEventListener('click', () => {
            this.onCancel?.();
            modal.remove();
        });
    }
}

// Usage:
new ConfirmDialog(
    'هل أنت متأكد؟',
    'هل تريد فعلاً ترك اللعبة؟',
    () => leaveGame(),
    () => console.log('Cancelled')
).show();
```

---

## 7. DANGER/URGENCY STATE - FOR TIME-CRITICAL MOMENTS

### When Timer is Low:
```javascript
function updateTimer(secondsLeft) {
    const timerEl = document.getElementById('timer');
    timerEl.textContent = secondsLeft;
    
    if (secondsLeft <= 10) {
        // Enter danger mode
        if (!timerEl.classList.contains('pulse')) {
            timerEl.classList.add('pulse');
            MafiaFX.danger();
        }
        
        // Color the timer red
        timerEl.style.color = '#b64f43';
    } else {
        // Normal mode
        timerEl.classList.remove('pulse');
        MafiaFX.stopDanger();
        timerEl.style.color = '#cfb06f';
    }
}
```

---

## 8. SKELETON LOADING - FOR CONTENT PLACEHOLDERS

### While Fetching Player Data:
```html
<!-- Before loading -->
<div class="skeleton" style="height: 40px; width: 80%; margin: 10px 0;"></div>
<div class="skeleton" style="height: 24px; width: 60%; margin: 10px 0;"></div>

<!-- In JavaScript, remove when loaded -->
document.querySelectorAll('.skeleton').forEach(el => el.remove());
```

---

## 9. VALIDATION FEEDBACK - REAL-TIME INPUT CHECKING

```javascript
const nameInput = document.getElementById('playerName');

nameInput.addEventListener('input', async (e) => {
    const value = e.target.value.trim();
    
    // Show loading state
    nameInput.classList.remove('error', 'success');
    nameInput.classList.add('ds-loading');
    
    // Check if name is available
    try {
        const response = await fetch('/api/check-name/' + value);
        const { available } = await response.json();
        
        nameInput.classList.remove('ds-loading');
        
        if (available) {
            nameInput.classList.add('success');
            nameInput.nextElementSibling?.remove(); // Remove error message
        } else {
            nameInput.classList.add('error');
            // Show error message
            const err = document.createElement('p');
            err.className = 'error-message';
            err.textContent = 'هذا الاسم مأخوذ بالفعل';
            nameInput.parentElement.appendChild(err);
        }
    } catch (err) {
        nameInput.classList.remove('ds-loading');
        nameInput.classList.add('error');
    }
});
```

---

## 10. COPY-TO-CLIPBOARD WITH FEEDBACK

```javascript
function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        // Show feedback
        element.classList.add('copy-success');
        showToast('تم النسخ! 📋', 'success');
        
        // Remove after animation
        setTimeout(() => {
            element.classList.remove('copy-success');
        }, 400);
    }).catch(err => {
        showToast('فشل النسخ', 'error');
    });
}

// Usage:
document.getElementById('roomCodeDisplay').addEventListener('click', (e) => {
    copyToClipboard(e.target.textContent, e.target);
});
```

---

## ⚡ QUICK INTEGRATION CHECKLIST

- [ ] Hook MafiaFX effects into game events (30 min)
- [ ] Create showToast() helper function (5 min)
- [ ] Add ConfirmDialog class (10 min)
- [ ] Add settings link to main menu (5 min)
- [ ] Apply CSS classes to loading states (15 min)
- [ ] Add error handling to API calls (20 min)
- [ ] Test all sounds (10 min)
- [ ] Test all animations (10 min)
- [ ] Test on mobile (15 min)

**Total Time: ~2 hours of implementation**

---

## 📞 NEED HELP?

All functions are already defined and ready to use:
- ✅ `MafiaFX.victory()` - Victory animation
- ✅ `MafiaFX.defeat()` - Defeat animation
- ✅ `MafiaFX.voteConfirm()` - Vote particle effect
- ✅ `MafiaFX.cardReveal()` - Card reveal with particles
- ✅ CSS classes for all states
- ✅ Settings page fully functional

Just copy-paste the examples above and you're done! 🚀

