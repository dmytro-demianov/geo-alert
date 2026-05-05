# geo-alert — Design Reference

> Агент ПОВИНЕН прочитати цей файл перед написанням будь-якого UI-коду.

---

## Кольори

### Brand (primary)
| Token | Hex |
|-------|-----|
| `brand-50` | `#fef2f2` |
| `brand-100` | `#fee2e2` |
| `brand-200` | `#fecaca` |
| `brand-300` | `#fca5a5` |
| `brand-400` | `#f87171` |
| `brand-500` | `#ef4444` ← primary |
| `brand-600` | `#dc2626` |
| `brand-700` | `#b91c1c` |
| `brand-800` | `#991b1b` |
| `brand-900` | `#7f1d1d` |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#10B981` | PUBLIC badge |
| `warning` | `#F59E0B` | LINK_ONLY badge, TTL expiry |
| `danger` | `#EF4444` | Errors, brand |
| `info` | `#3B82F6` | Info, comments |

### Heat scale (like_weight)
| Range | Color | Token |
|-------|-------|-------|
| `< 0` | `#9CA3AF` | `heat-cold` |
| `0–2` | `#6B7280` | `heat-low` |
| `3–5` | `#FBBF24` | `heat-warm` |
| `6–10` | `#F97316` | `heat-hot` |
| `≥ 11` | `#EF4444` | `heat-fire` |

---

## Шрифти
- Sans: **Inter** (400/500/600/700/800) — весь основний текст
- Mono: **JetBrains Mono** (400/500/700) — координати, TTL, like_weight, badge-значення

---

## Типографіка
| Class | Size / Weight |
|-------|---------------|
| `text-display` | 36px / 800 |
| `text-h1` | 28px / 700 |
| `text-h2` | 22px / 700 |
| `text-h3` | 18px / 600 |
| `text-label` | 11px / 700 / tracking-widest / uppercase |
| `text-caption` | 12px / 400 |
| `text-overline` | 10px / 700 / tracking-widest / uppercase |

---

## Радіуси
| Token | Value |
|-------|-------|
| `rounded-xs` | 4px |
| `rounded-sm` | 6px |
| `rounded-md` | 10px |
| `rounded-lg` | 14px |
| `rounded-xl` | 20px |
| `rounded-2xl` | 28px |

---

## Тіні
| Token | Usage |
|-------|-------|
| `shadow-xs` | Subtle cards |
| `shadow-sm` | Default card |
| `shadow-md` | Modals, TopBar |
| `shadow-lg` | Drawers |
| `shadow-xl` | Dropdowns |
| `shadow-pin` | FAB, floating red elements |
| `shadow-focus` | Focus ring |

---

## Компоненти

### TopBar
```tsx
<TopBar onMenuToggle={() => {}} onCreateCard={() => {}} />
```
- Позиція: `absolute top-3 left-3 right-3`, висота 56px, z-150
- Фон: `bg-white/95 backdrop-blur-md`
- Вміст: меню-кнопка | логотип | SearchBar | Нова картка | Notifications | User

### LeftDrawer
```tsx
<LeftDrawer open={bool} onClose={fn} markers={[]} cards={[]} onOpenMarker={fn} onCreateCard={fn} />
```
- Ширина: 360px, slide-in зліва, z-120
- Вкладки: Позначки / Картки / Мої

### RightDrawer
```tsx
<RightDrawer marker={MarkerDetail | null} onClose={fn} onShare={fn} onDelete={fn} />
```
- Ширина: 420px, slide-in справа, z-125

### MapControls
```tsx
<MapControls onLocate={fn} onThemeChange={fn} />
```
- Позиція: `absolute right-5 top-1/2 -translate-y-1/2`, z-90

### HeatLegend
```tsx
<HeatLegend />
```
- Позиція: `absolute left-5 bottom-5`, z-90, pointer-events-none

### FAB
```tsx
<FAB onClick={fn} />
```
- Позиція: `absolute bottom-8 left-1/2 -translate-x-1/2`, z-90
- Колір: `bg-brand-500`, тінь: `shadow-pin`

### MarkerPin
```tsx
<MarkerPin weight={number} size={28} />
```
- SVG pin, колір залежить від `like_weight` (heat scale)
- Функція `heatColor(weight)` — експортується окремо

### Avatar
```tsx
<Avatar name="Ім'я" size={32} hue={0} avatarUrl={null} />
```
- Градієнтний фон з ініціалами або img

### PrivacyBadge
```tsx
<PrivacyBadge value="PUBLIC" />
```
- PUBLIC (зелений) / LINK_ONLY (жовтий) / PRIVATE (сірий)

### Icon
```tsx
<Icon name="bell" size={20} stroke="#EF4444" />
```
- Inline SVG, доступні: search, x, bell, user, map-pin, heart, plus, menu, list,
  navigation, clock, send, share, check, crosshair, image, message, trash, edit,
  layers, chevron-down, chevron-right, alert-circle, log-out, settings

---

## Класи компонентів (index.css)
- `.btn-primary` — червона кнопка brand-500
- `.btn-secondary` — біла кнопка з border
- `.btn-ghost` — прозора кнопка
- `.input` — поле вводу зі стилем slate
- `.card` — картка з border + shadow-sm
- `.badge-public` / `.badge-private` / `.badge-link` — badge privacy

---

## Архітектура сторінок
```
MainApp (MapPage)
  ├── MapView (fullscreen, z-0)
  ├── TopBar (z-150, absolute top-3)
  ├── LeftDrawer (z-120, left slide-in)
  ├── RightDrawer (z-125, right fixed)
  ├── MapControls (z-90, right center)
  ├── HeatLegend (z-90, bottom-left)
  └── FAB (z-90, bottom-center)
```

Модалы: z-[200+], поверх усього.
