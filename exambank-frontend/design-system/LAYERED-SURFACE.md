# Layered Surface Design System

## Tổng quan
Thiết kế "Layered Surface" (Bề mặt phân lớp) tạo ra trải nghiệm giao diện hiện đại, chuyên nghiệp với chiều sâu thị giác thông qua các lớp nội dung nổi trên nền.

---

## 1. Color Palette & Background

### Base Layer (Body)
- **Màu nền**: `#F3F4F6` (Slate-100)
- **Mục đích**: Tạo chiều sâu cho toàn bộ trang web, làm nền tảng cho các lớp trên
- **Áp dụng**: `body`, `main` elements của các trang

### Sidebar Layer
- **Màu nền**: `#FFFFFF` (Trắng tinh khiết)
- **Bo góc**: `32px` (rounded-[32px])
- **Shadow**: `0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)`
- **Border**: `1px solid rgba(0,0,0,0.05)`
- **Tách biệt**: Sử dụng gap 16px với Main Content

### Main Content Layer
- **Màu nền**: `#FFFFFF`
- **Bo góc**: `32px` (rounded-[32px])
- **Shadow**: Tương tự Sidebar
- **Border**: `1px solid rgba(0,0,0,0.05)`
- **Mục đích**: Container lớn chứa nội dung chính, tạo hiệu ứng "bay" trên Base Layer

---

## 2. Geometry & Spacing

### Outer Padding
- **Giá trị**: `16px` (p-4)
- **Áp dụng**: Bao quanh toàn bộ cửa sổ trình duyệt
- **Mục đích**: Tạo khoảng trống giữa edge màn hình và các surface

### Gap Between Elements
- **Giá trị**: `16px` (gap-4)
- **Áp dụng**: Giữa Sidebar và Main Content
- **Biến thể**: Có thể tăng lên 24px cho màn hình lớn hơn

### Corner Radius
- **Standard**: `32px` (rounded-[32px])
- **Áp dụng**: Sidebar, Main Content Container, Auth Cards
- **Phong cách**: Mềm mại, hiện đại, tạo cảm giác thân thiện

---

## 3. Depth & Elevation

### Shadow System
Sử dụng multi-layer shadow để tạo hiệu ứng "floating":

```css
box-shadow: 
  0 10px 25px -5px rgba(0, 0, 0, 0.05),
  0 8px 10px -6px rgba(0, 0, 0, 0.05);
```

**Đặc điểm**:
- Shadow mềm mại, không quá đậm
- Tạo cảm giác khối nội dung đang "bay" nhẹ
- Opacity thấp (0.05) để giữ sự tinh tế

### Border System
- **Độ dày**: `1px` (border)
- **Màu**: `rgba(0, 0, 0, 0.05)`
- **Đặc điểm**: Viền siêu mảnh, opacity thấp
- **Mục đích**: Định nghĩa ranh giới nhẹ nhàng mà không tạo contrast quá mạnh

---

## 4. Component Applications

### AppShell
```tsx
// Base Layer với outer padding
<div className="h-screen overflow-hidden bg-[#F3F4F6] p-4">
  <div className="flex h-full gap-4">
    {/* Sidebar & Main Content */}
  </div>
</div>
```

### AppSidebar
```tsx
<aside className="
  hidden h-full shrink-0 md:flex md:flex-col
  bg-white
  rounded-[32px]
  shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.05)]
  border border-[rgba(0,0,0,0.05)]
  ...
">
```

### Main Content
```tsx
<div className="
  flex min-w-0 flex-1 flex-col 
  overflow-hidden 
  rounded-[32px] 
  bg-white 
  shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.05)] 
  border border-[rgba(0,0,0,0.05)]
">
  <main className="flex-1 overflow-y-auto p-5 lg:p-8">
    {children}
  </main>
</div>
```

### AuthLayout
```tsx
<main className="min-h-screen bg-[#F3F4F6] p-4">
  <div className="
    rounded-[32px] 
    border border-[rgba(0,0,0,0.05)] 
    bg-white 
    shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.05)]
  ">
    {/* Auth content */}
  </div>
</main>
```

---

## 5. Responsive Behavior

### Mobile (< 768px)
- Outer padding có thể giảm xuống `12px` (p-3) để tối ưu không gian
- Gap giữa elements giảm xuống `12px`
- Sidebar có thể ẩn hoặc chuyển sang overlay mode

### Tablet & Desktop (≥ 768px)
- Giữ nguyên outer padding `16px`
- Gap standard `16px`
- Sidebar hiển thị đầy đủ với width `256px` (w-64)

---

## 6. Visual Benefits

### Chiều sâu (Depth)
- Tạo hierarchy thị giác rõ ràng
- Nội dung quan trọng "nổi" lên trên
- Tăng khả năng focus của người dùng

### Hiện đại & Chuyên nghiệp
- Bo góc lớn tạo cảm giác mềm mại
- Shadow nhẹ nhàng, tinh tế
- Màu sắc neutral, dễ nhìn

### Tối ưu cho Học tập
- Giảm distraction với nền neutral
- Tập trung vào nội dung chính (white surface)
- Tách biệt rõ ràng giữa navigation và content

---

## 7. Design Tokens

```css
/* Color Tokens */
--base-layer-bg: #F3F4F6;
--surface-bg: #FFFFFF;
--surface-border: rgba(0, 0, 0, 0.05);

/* Spacing Tokens */
--outer-padding: 16px;
--gap-standard: 16px;
--gap-large: 24px;

/* Radius Tokens */
--radius-surface: 32px;
--radius-surface-large: 40px;

/* Shadow Tokens */
--shadow-layered: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 
                  0 8px 10px -6px rgba(0, 0, 0, 0.05);
--shadow-elevated: 0 20px 40px -10px rgba(0, 0, 0, 0.08),
                   0 16px 20px -12px rgba(0, 0, 0, 0.08);
```

---

## 8. Implementation Checklist

- [x] Base Layer background (#F3F4F6)
- [x] Outer padding (16px)
- [x] Sidebar: white background, 32px radius, shadow, border
- [x] Main Content: white background, 32px radius, shadow, border
- [x] Gap between Sidebar & Main (16px)
- [x] AuthLayout: áp dụng thiết kế tương tự
- [x] LandingPage: cập nhật base background
- [x] Badge borders: đổi từ #f2f5fa sang white
- [x] Toggle button: cải thiện shadow và border

---

## 9. Future Enhancements

### Glassmorphism Variant (Optional)
```css
background: rgba(255, 255, 255, 0.8);
backdrop-filter: blur(10px);
```

### Dark Mode Support
- Base Layer: `#1F2937` (Gray-800)
- Surface: `#374151` (Gray-700)
- Borders: `rgba(255, 255, 255, 0.1)`

### Interactive States
- Hover: Tăng shadow nhẹ
- Active: Giảm shadow, tạo cảm giác pressed
- Focus: Ring outline với brand color

---

## Tác giả
Thiết kế hệ thống Layered Surface cho ExamBank Platform  
Ngày tạo: 2026-04-18
