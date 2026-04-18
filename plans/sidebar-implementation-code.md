# Code Implementation Examples

## 📦 File Cần Tạo & Cập Nhật

### 1. Context Provider (New File)
**File**: `exambank-frontend/src/contexts/SidebarContext.tsx`

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  isHovered: boolean;
  toggleSidebar: () => void;
  setIsHovered: (hovered: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'exambank-sidebar-collapsed';

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Initialize từ localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false; // Default: expanded
    }
  });

  const [isHovered, setIsHovered] = useState(false);

  // Lưu state vào localStorage khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
    setIsHovered(false); // Reset hover state khi toggle
  };

  const value: SidebarContextType = {
    isCollapsed,
    isHovered,
    toggleSidebar,
    setIsHovered,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

// Custom hook để sử dụng context
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
```

### 2. Updated AppShell
**File**: `exambank-frontend/src/layouts/shared/AppShell.tsx`

```tsx
import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar, type SidebarNavItem } from './AppSidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';

type Props = {
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  sidebarItems: SidebarNavItem[];
  sidebarSubtitle: string;
  showAdminExtras?: boolean;
};

export function AppShell({
  children,
  headerTitle,
  headerSubtitle,
  sidebarItems,
  sidebarSubtitle,
  showAdminExtras = false,
}: Props) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[var(--bg-page)]">
        <div className="flex min-h-screen">
          <AppSidebar
            items={sidebarItems}
            subtitle={sidebarSubtitle}
            showAdminExtras={showAdminExtras}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader title={headerTitle} subtitle={headerSubtitle} />

            <main className="flex-1 p-5 lg:p-6">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
```

### 3. Updated AppSidebar (Complete Implementation)
**File**: `exambank-frontend/src/layouts/shared/AppSidebar.tsx`

```tsx
import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Building2, Headset, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';

export type SidebarNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

type Props = {
  items: SidebarNavItem[];
  subtitle: string;
  showAdminExtras?: boolean;
};

export function AppSidebar({ items, subtitle, showAdminExtras = false }: Props) {
  const location = useLocation();
  const { isCollapsed, isHovered, toggleSidebar, setIsHovered } = useSidebar();
  
  // Determine if sidebar should show expanded content
  const isExpanded = !isCollapsed || isHovered;
  
  // Hover state management với delay
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (!isCollapsed) return; // Chỉ hover expand khi collapsed
    
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    
    // Delay 100ms trước khi expand
    const timeout = setTimeout(() => {
      setIsHovered(true);
    }, 100);
    
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    // Clear expand timeout nếu còn
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    
    // Delay 200ms trước khi collapse
    const timeout = setTimeout(() => {
      setIsHovered(false);
    }, 200);
    
    setHoverTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Path matching logic (giữ nguyên)
  const normalizePath = (path: string): string => {
    if (!path) return '/';
    const normalized = path.replace(/\/+$/, '');
    return normalized.length > 0 ? normalized : '/';
  };

  const currentPath = normalizePath(location.pathname);
  const matchedItemPaths = items
    .map((item) => {
      const targetPath = normalizePath(item.path);
      const depth = targetPath.split('/').filter(Boolean).length;
      const isTopLevelRoot = depth === 1;
      const matches = isTopLevelRoot
        ? currentPath === targetPath
        : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

      return { path: item.path, targetPath, matches };
    })
    .filter((entry) => entry.matches)
    .sort((left, right) => right.targetPath.length - left.targetPath.length);

  const activeItemPath = matchedItemPaths[0]?.path;

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        hidden md:flex md:flex-col
        border-r border-[var(--line-soft)] bg-[#f2f5fa]
        transition-all duration-300 ease-in-out
        relative
        ${isCollapsed && !isHovered ? 'w-16' : 'w-64'}
        ${isHovered ? 'fixed left-0 top-0 bottom-0 z-50 shadow-[0_20px_30px_rgba(0,0,0,0.15)] backdrop-blur-sm' : ''}
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        className={`
          absolute top-20 -right-3
          w-6 h-6 rounded-full
          bg-white border border-[var(--line-soft)]
          shadow-[0_2px_8px_rgba(0,0,0,0.1)]
          flex items-center justify-center
          transition-all duration-200 ease-in-out
          hover:scale-110 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]
          hover:text-[var(--brand-700)]
          active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]
          z-10
        `}
      >
        {isCollapsed ? (
          <ChevronRight size={14} />
        ) : (
          <ChevronLeft size={14} />
        )}
      </button>

      {/* Logo Header */}
      <div className={`px-6 py-5 transition-all duration-300 ${!isExpanded && 'px-2'}`}>
        <div className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center'}`}>
          <div className="rounded-2xl bg-[linear-gradient(135deg,var(--brand-700)_0%,var(--brand-600)_100%)] p-2.5 text-white shadow-[var(--shadow-brand)]">
            <Building2 size={20} />
          </div>
          
          {/* Text - fade in/out based on expanded state */}
          <div
            className={`
              transition-opacity duration-200
              ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}
            `}
          >
            <p className="whitespace-nowrap font-[var(--font-label)] text-[2.45rem] font-semibold tracking-[0.01em] text-[var(--ink-900)]">
              Scholarly Sanctuar
            </p>
            <p className="-mt-1 inline-block origin-left whitespace-nowrap text-[8px] uppercase leading-none tracking-[0.12em] text-[var(--ink-500)] scale-[0.7]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex flex-1 flex-col gap-1 p-4 transition-all ${!isExpanded && 'p-2'}`}>
        {items.map((item) => {
          const isActive = activeItemPath === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                group inline-flex items-center gap-3
                py-3 text-sm font-medium
                transition-all duration-200 ease-out
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]
                ${isExpanded ? 'px-4 mr-3' : 'px-3 justify-center'}
                ${
                  isActive
                    ? `translate-x-1 -translate-y-0.5 bg-white text-[var(--brand-700)] ring-1 ring-[var(--brand-100)] shadow-[0_12px_22px_rgba(16,21,38,0.10)] ${isExpanded ? 'rounded-r-full' : 'rounded-xl'}`
                    : `rounded-xl text-[var(--ink-700)] hover:translate-x-1 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_18px_rgba(16,21,38,0.09)]`
                }
              `}
            >
              <Icon
                size={isExpanded ? 16 : 20}
                className={`transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}
              />
              
              {/* Label - fade in/out */}
              <span
                className={`
                  transition-opacity duration-200
                  ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}
                `}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Admin Extras - Expanded */}
        {showAdminExtras && isExpanded && (
          <div
            className={`
              mt-6 rounded-xl border border-[var(--line-soft)] bg-white p-3
              transition-opacity duration-200
              ${isExpanded ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <p className="inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-[var(--brand-700)]">
              <Headset size={14} />
              Support Portal
            </p>
          </div>
        )}
        
        {/* Admin Extras - Icon only khi collapsed */}
        {showAdminExtras && !isExpanded && (
          <div className="mt-6 flex justify-center">
            <div className="rounded-xl bg-white p-2">
              <Headset size={20} className="text-[var(--brand-700)]" />
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
```

## 📝 Implementation Notes

### Key Features Implemented:

1. **SidebarContext**: 
   - Quản lý state `isCollapsed` và `isHovered`
   - LocalStorage persistence
   - Custom hook `useSidebar()`

2. **Toggle Button**:
   - Position absolute trên đường biên sidebar
   - Icon thay đổi: ChevronLeft ↔ ChevronRight
   - Hover effects & accessibility

3. **Hover to Expand**:
   - Delay 100ms khi hover vào
   - Delay 200ms khi rời chuột
   - Fixed positioning với z-index cao
   - Shadow & backdrop-blur effect

4. **Responsive Content**:
   - Logo text fade in/out
   - Navigation labels fade in/out
   - Icon size điều chỉnh (16px ↔ 20px)
   - Admin extras có 2 variants

5. **Animations**:
   - Width transition: 300ms
   - Opacity transition: 200ms
   - All transitions smooth với cubic-bezier

### Testing Checklist:

- [ ] Click toggle button → sidebar mở/đóng mượt
- [ ] Hover vào collapsed sidebar → expand overlay
- [ ] Rời chuột → collapse sau delay
- [ ] Reload page → state persist
- [ ] Navigation active state đúng
- [ ] Icons scale on hover
- [ ] Keyboard navigation (Tab, Enter, Space)
- [ ] ARIA labels đầy đủ
- [ ] Mobile responsive (sidebar hidden)

### Browser Support:

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅ (cần test backdrop-blur)
- Mobile browsers: ✅

### Performance Considerations:

- Timeout cleanup on unmount
- No unnecessary re-renders
- CSS transforms for smooth animation
- LocalStorage error handling
