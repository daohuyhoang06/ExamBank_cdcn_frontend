# Visual Mockup - Sidebar Toggle & Hover

## 🎨 Trạng Thái 1: Sidebar Mở Rộng (Default)

```
┌─────────────────────────┬──────────────────────────────────┐
│                         │                                  │
│  🏢 Scholarly Sanctuar  │  [Header với Avatar & Notif]    │
│     STUDENT PORTAL      │                                  │
│                         ├──────────────────────────────────┤
│  ─────────────────────  │                                  │
│                         │                                  │
│  📊 Bảng điều khiển     │                                  │
│                         │                                  │
│  📝 Đề của bạn          │      MAIN CONTENT AREA          │
│                         │                                  │
│  🎯 Thi online          │                                  │
│                         │                                  │
│  👤 Hồ sơ cá nhân       │                                  │
│                         │                                  │
│  📈 Thống kê            │                                  │
│                   [>]   │                                  │
│                         │                                  │
│  ┌───────────────────┐  │                                  │
│  │ 🎧 Support Portal │  │                                  │
│  └───────────────────┘  │                                  │
│                         │                                  │
└─────────────────────────┴──────────────────────────────────┘
        256px (w-64)              Phần còn lại
```

**Chi tiết Toggle Button [>]**:
```
┌────────────────────┐
│                 [>]│ ← Button nằm trên biên phải
│                    │    Tròn, white bg, shadow
│                    │    Icon: ChevronRight
└────────────────────┘
```

## 🎨 Trạng Thái 2: Sidebar Thu Gọn

```
┌───┬──────────────────────────────────────────────┐
│   │                                              │
│ 🏢│  [Header với Avatar & Notifications]        │
│   │                                              │
│   ├──────────────────────────────────────────────┤
│ ─ │                                              │
│   │                                              │
│ 📊│                                              │
│   │                                              │
│ 📝│        MAIN CONTENT AREA                     │
│   │        (Rộng hơn vì sidebar nhỏ)            │
│ 🎯│                                              │
│   │                                              │
│ 👤│                                              │
│[<]│                                              │
│ 📈│                                              │
│   │                                              │
│ 🎧│                                              │
│   │                                              │
└───┴──────────────────────────────────────────────┘
 64px                  Phần còn lại (rộng hơn)
(w-16)
```

**Chi tiết Toggle Button [<]**:
```
┌──┐
│[<│ ← Button giờ ở giữa biên
│  │    Icon: ChevronLeft
│  │
└──┘
```

## 🎨 Trạng Thái 3: Hover to Expand (Khi Hover vào Sidebar Thu Gọn)

```
┌───┬─────────────────────────┬───────────────────┐
│   │ ┌─────────────────────┐ │                   │
│ 🏢│ │ 🏢 Scholarly...      │ │  [Header]         │
│   │ │    STUDENT PORTAL    │ │                   │
│   │ │                      │ ├───────────────────┤
│ ─ │ │  ─────────────────   │ │                   │
│   │ │                      │ │                   │
│ 📊│ │  📊 Bảng điều khiển  │ │                   │
│   │ │                      │ │  MAIN CONTENT     │
│ 📝│ │  📝 Đề của bạn       │ │  (Mờ đi một chút) │
│   │ │                      │ │                   │
│ 🎯│ │  🎯 Thi online       │ │                   │
│[<]│ │               [<]    │ │                   │
│ 👤│ │  👤 Hồ sơ cá nhân    │ │                   │
│   │ │                      │ │                   │
│ 📈│ │  📈 Thống kê         │ │                   │
│   │ │                      │ │                   │
│ 🎧│ │  ┌─────────────────┐ │ │                   │
│   │ │  │🎧 Support Portal│ │ │                   │
│   │ │  └─────────────────┘ │ │                   │
│   │ └─────────────────────┘ │                   │
└───┴─────────────────────────┴───────────────────┘
 64px     256px (overlay)          Phần còn lại
(base)    với shadow & z-50
```

**Hiệu ứng khi hover**:
- Sidebar overlay lên trên content
- Background: #f2f5fa với backdrop-blur
- Shadow: `0 20px 30px rgba(0,0,0,0.15)`
- Content bên dưới có lớp overlay tối mờ (optional)
- Transition smooth 300ms

## 📐 Measurements & Spacing

### Expanded State (Desktop)
```
Width: 256px
Padding: 16px (p-4)
Logo Area: 
  - Padding: 24px horizontal, 20px vertical
  - Icon: 20x20px
  - Text: 2.45rem (39.2px)
  - Subtitle: 8px text, scaled 0.7

Navigation Items:
  - Gap: 4px (gap-1)
  - Padding: 16px horizontal, 12px vertical
  - Icon: 16x16px
  - Text: 14px (text-sm)
  - Border radius: 12px (rounded-xl)

Toggle Button:
  - Size: 24x24px
  - Position: absolute, right: 0, top: 80px
  - Transform: translateX(50%)
  - Icon: 14px
```

### Collapsed State (Desktop)
```
Width: 64px
Padding: 8px (p-2)
Logo Area:
  - Only icon visible (20x20px)
  - Centered
  - Subtitle hidden

Navigation Items:
  - Only icons (20x20px)
  - Centered
  - Padding: 12px all sides
  - Text hidden
  - Border radius: 12px

Toggle Button:
  - Same size (24x24px)
  - Position: center of right edge
```

### Mobile (<768px)
```
Sidebar hidden by default
Hamburger menu button in header
When opened: full overlay, w-64 or w-full
Toggle button hidden
```

## 🎨 Color & Style Specifications

### Toggle Button States
```css
/* Normal */
background: #ffffff
border: 1px solid var(--line-soft)
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)
color: var(--ink-700)

/* Hover */
background: #ffffff
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
transform: scale(1.1)
color: var(--brand-700)

/* Active/Pressed */
transform: scale(0.95)
box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15)
```

### Sidebar States
```css
/* Expanded (default) */
width: 256px
background: #f2f5fa
border-right: 1px solid var(--line-soft)

/* Collapsed */
width: 64px
background: #f2f5fa
border-right: 1px solid var(--line-soft)

/* Hovered (when collapsed) */
width: 256px
position: fixed
background: rgba(242, 245, 250, 0.98)
backdrop-filter: blur(8px)
box-shadow: 0 20px 30px rgba(0, 0, 0, 0.15)
z-index: 50
```

### Navigation Item States
```css
/* Normal (expanded) */
padding: 12px 16px
color: var(--ink-700)
background: transparent

/* Hover (expanded) */
background: white
transform: translateX(4px) translateY(-2px)
box-shadow: 0 10px 18px rgba(16, 21, 38, 0.09)

/* Active (expanded) */
background: white
color: var(--brand-700)
border-radius: 0 9999px 9999px 0 /* rounded-r-full */
transform: translateX(4px) translateY(-2px)
box-shadow: 0 12px 22px rgba(16, 21, 38, 0.10)
ring: 1px solid var(--brand-100)

/* Collapsed (icon only) */
padding: 12px
color: var(--ink-700)
justify-content: center

/* Collapsed Active */
background: white
color: var(--brand-700)
border-radius: 12px /* rounded-xl */
```

## ⚡ Animation Timing

```css
/* Sidebar width change */
transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Text fade in/out */
transition: opacity 200ms ease-in-out;
/* Delay: 50ms for fade in, 0ms for fade out */

/* Toggle button */
transition: all 200ms ease-in-out;

/* Navigation items */
transition: all 200ms ease-out;

/* Hover overlay appearance */
transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
            opacity 200ms ease-in-out;
```

## 🔄 Interaction Flow

### Toggle Click
```
1. User clicks toggle button
2. isCollapsed state flips (true ↔ false)
3. Sidebar animates width change (300ms)
4. Text content fades in/out (200ms, staggered 50ms)
5. Toggle icon rotates 180deg
6. State saved to localStorage
```

### Hover Expand (when collapsed)
```
1. User hovers over collapsed sidebar
2. After 100ms delay → isHovered = true
3. Sidebar expands to overlay position
4. Shadow appears
5. Content fades in (200ms)
6. User can interact normally

On mouse leave:
7. After 200ms delay → isHovered = false
8. Sidebar collapses back
9. Content fades out
10. Shadow disappears
```

## 📱 Responsive Breakpoints

```css
/* Mobile: < 768px */
.sidebar {
  display: none; /* Default hidden */
}
.toggle-button {
  display: none; /* Hide toggle on mobile */
}

/* Tablet & Desktop: >= 768px */
.sidebar {
  display: flex;
}
.toggle-button {
  display: flex;
}

/* Large Desktop: >= 1920px */
/* Optional: Default to expanded, more screen space */
```

## 💡 Inspiration & References

Thiết kế này lấy cảm hứng từ:
- **Discord**: Hover expand mechanism
- **VS Code**: Toggle button placement
- **Notion**: Smooth animations & overlay effect
- **Linear**: Clean, modern aesthetic

## 🎯 Key UX Principles

1. **Discoverability**: Toggle button rõ ràng, dễ thấy
2. **Feedback**: Animation mượt mà, visual cues rõ ràng
3. **Efficiency**: Hover to expand nhanh, không cần click
4. **Consistency**: Hoạt động giống nhau trên tất cả layouts
5. **Accessibility**: Keyboard support, ARIA labels đầy đủ
