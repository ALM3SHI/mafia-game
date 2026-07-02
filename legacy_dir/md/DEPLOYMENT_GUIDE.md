# DEPLOYMENT & MIGRATION GUIDE
## How to Deploy MVP Step 1 & Step 2 Changes

---

## 🚀 QUICK START

### 1. **Apply Supabase Schema Migration**

2. Go to your **Supabase Dashboard**
3. Open **SQL Editor**
4. Copy the entire contents of:
   ```
   supabase/migrations/20260402_add_host_controls.sql
   ```
5. Paste into the SQL Editor
6. Click **Run**

Expected output:
```
✓ ALTER TABLE public.rooms ADD COLUMN is_private
✓ ALTER TABLE public.rooms ADD COLUMN game_mode  
✓ CREATE TABLE public.player_kicks
✓ CREATE POLICY "Hosts manage kicks"
✓ CREATE INDEX ON player_kicks(room_id)
✓ ALTER PUBLICATION supabase_realtime ADD TABLE player_kicks
```

### 2. **Update lobby.html**

The lobby.html file has been fully updated with:
- Mobile responsive grid layout
- Host controls UI (badges, kick buttons)
- Role transparency display
- All CSS and JavaScript modifications

**No additional files need to be changed.**

---

## 📝 WHAT CHANGED IN lobby.html

### NEW CSS ADDITIONS
1. **Mobile Grid Layout** (lines ~190-220)
   - 2-column grid for 8 seats
   - Responsive sizing with aspect-ratio

2. **Empty Seat Cards** (lines ~260-290)
   - `.empty-seat-card` styling
   - Breathing animation for chair emoji
   - Dashed borders with gradient background

3. **Host Badge** (lines ~240-258)
   - `.host-badge` 👑 crown icon styling
   - Pulse animation effect
   - Golden color scheme

4. **Role Overview Panel** (lines ~380-410)
   - Role grid styling (2 columns)
   - Enabled/disabled state indicators
   - Team color coding (blue/gold/red)

### NEW JAVASCRIPT FUNCTIONS
1. **`checkLayoutChange()`** (after line 950)
   - Detects viewport size changes
   - Triggers re-render when switching mobile ↔ desktop

2. **`renderSeatsGrid(allPlayers, isInitialLoad)`** (lines 1050-1085)
   - Mobile-only renderer using CSS Grid
   - Creates 8 seat slots (occupied + empty)
   - Animates empty seats on initial load

3. **`renderSeatsDesktop3D(allPlayers, isInitialLoad)`** (lines 1087-1145)
   - Refactored desktop renderer (original logic preserved)
   - Maintains 3D U-shape positioning
   - Floats cards with sine-wave motion

4. **`updateRoleOverview()`** (lines 1740-1790)
   - Populates role transparency panel
   - Updates in real-time when settings change
   - Shows all 11 roles with enabled/disabled states

### MODIFIED FUNCTIONS
1. **`renderTable(isInitialLoad)`** (lines 1030-1045)
   - Now checks if mobile
   - Routes to appropriate renderer
   - Handles responsive breakpoint

2. **`_buildCardHTML(player, isReady)`** (lines 1005-1025)
   - Added `hostBadge` HTML when `player.id === currentRoom.host_id`
   - Improved kick button logic (prevents kicking host)

3. **`updateReadyUI()`** (lines 1263-1310)
   - Shows seats counter badge on mobile
   - Updates "🪑 X/8" display
   - Hides badge on desktop

4. **`syncSettings()` & `syncSettingsToUI()`** (lines 1733-1823)
   - Calls `updateRoleOverview()` after changes
   - Ensures role panel updates in real-time

5. **`startFloating()`** (lines 1180-1195)
   - Skips floating animation on mobile (no 3D in grid)
   - Desktop-only feature

---

## 🔍 TESTING BEFORE & AFTER

### Desktop Testing (≥ 769px)
**BEFORE:**
- 3D U-shape cards ✓
- Floating animation ✓
- Kick button hidden until hover ✓

**AFTER:**
- 3D U-shape cards ✓ (same)
- Floating animation ✓ (same)
- Kick button hidden until hover ✓ (same)
- **NEW**: Host badge (👑) on host's card
- **NEW**: Role transparency panel in settings

### Mobile Testing (≤ 768px)
**BEFORE:**
- Drawer-based bottom sheets
- 3D card positioning (squished)
- Hard to see all players

**AFTER:**
- ✅ 2×4 grid layout (all 8 seats visible)
- ✅ Empty seat placeholders with animations
- ✅ Seats counter badge (top-right)
- ✅ Larger kick buttons (always visible)
- ✅ Host badge shows on host card
- ✅ Role overview in settings drawer
- ✅ Same bottom sheet chat/settings (drawer-panel)

### Orientation Change (Landscape ↔ Portrait)
- Dynamically re-renders layout
- No data loss when rotating
- Smooth GSAP transitions

---

## 🐛 TROUBLESHOOTING

### Issue: Empty seats not showing
**Solution:**
- Clear browser cache (Ctrl+Shift+Del)
- Hard reload: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- Check console for errors: F12 → Console

### Issue: Kick button not clickable on mobile
**Solution:**
- Ensure phone width ≤ 768px
- Zoom out to less than 100% if needed
- Try portrait orientation (triggers mobile layout)

### Issue: Role overview showing duplicate roles
**Solution:**
- Refresh page
- Check browser console for JavaScript errors
- Ensure `updateRoleOverview()` is called only once per change

### Issue: Migration failed in Supabase
**Solution:**
- Copy paste migration SQL again (careful with quotes)
- Check for syntax errors in SQL Editor error message
- Verify Supabase database version is up to date

---

## 📊 PERFORMANCE NOTES

### Rendering Performance
- **Mobile Grid**: O(8) — always renders exactly 8 cards
- **Desktop 3D**: O(n) where n = players — scales with player count
- **Layout Detection**: Fires on resize (debounced by renderTable)
- **Role Overview**: O(11) — always 11 roles

### Network
- No additional API calls (uses existing room.settings)
- New `player_kicks` table not queried yet (for next phase)
- Realtime publication added for player_kicks (ready for Phase 3)

### Memory
- CSS Grid layout lighter than 3D transforms
- Empty seat DOM nodes minimal (no interactivity)
- Host badge: single animated element

---

## 🎯 NEXT PHASE (Phase 3)

### Ready to Implement
1. **Kick Action Handler**
   - Call Supabase function to insert into `player_kicks`
   - Send system message to chat
   - Remove player from room_players

2. **Ban System**
   - Check `player_kicks` table on join
   - Prevent rejoining if `is_banned=true`

3. **Connection Quality Display**
   - Show ping badge (🟢/🟡/🔴) on each card
   - Use Websocket latency measurements

4. **Visual Polish**
   - Pixel/retro aesthetic (update CSS variables)
   - Custom web font (cinematic mystery theme)
   - Drop shadows and depth effects

5. **QoL Features**
   - Cosmetics store quick-access
   - In-game friend invites
   - Game mode label on room code
   - Player level/rank display on cards

---

## 📞 SUPPORT

**If you encounter issues:**

1. Check browser console (F12 → Console tab)
2. Check Supabase logs (Dashboard → Logs)
3. Verify migration ran successfully
4. Test on different device sizes (mobile + desktop)
5. Clear cache and reload

---

*Last Updated: 2026-04-02*  
*Status: Ready for Production Deploy*
