# Design System: Smart School Admin

## 1. Visual Theme & Atmosphere
A calm, trustworthy school operations workspace. Balanced density (5/10), predictable
symmetric layouts (2/10) and restrained motion (2/10): administrators scan this screen
daily, often on slower connections, so clarity beats decoration.

## 2. Color Palette & Roles
- **Deep Navy** (#0F2748, `brand-900`): sidebar surface
- **School Blue** (#1E5AA8, `brand-500`): the single accent for primary actions, links, active states and focus
- **Soft Blue** (#EFF4FB, `brand-50`): icon tiles and selected rows
- **Canvas** (#F5F7FA, `content-bg`): page background
- **Pure Surface** (#FFFFFF): cards
- **Ink** (#0F172A, `slate-900`): titles and values
- **Muted Slate** (#64748B, `slate-500`): metadata, axis labels
- **Whisper Border** (#E2E8F0, `slate-200`): card and table lines

Status colors (emerald, amber, rose) mean state only and always come with a text label.

## 3. Typography Rules
- **Family:** Poppins, the existing brand font, is kept across the product.
- **Page title:** 20-24px, semibold, tight tracking.
- **Card title:** 14px, semibold.
- **Body and table text:** 13-14px. Nothing smaller than 11px.
- **Numbers:** tabular figures.
- Sentence case. Uppercase is reserved for table headers.

## 4. Component Stylings
- **Cards:** 12px radius, 1px whisper border, `shadow-card`.
- **Stat cards:** label, large value, one line of context, one icon in a soft blue tile. Icons are not color coded.
- **Buttons:** 8px radius. Accent fill for primary, outline for secondary.
- **Loaders:** skeletons matching the final layout.
- **Empty states:** icon, one sentence saying what will appear here.

## 5. Layout Principles
- Fixed 256px navy sidebar, collapsing to 64px icons; white top bar for every admin role.
- Page header sits directly on the canvas, not in a card.
- Single column below 768px, with no horizontal page scroll.

## 6. Charts
- Categorical order: `#2A78D6`, `#EB6834`, `#1BAF7A`, `#EDA100` (validated for color vision deficiency; defined in `src/components/ui/chart-theme.ts`).
- One axis per chart. Counts and percentages never share a chart.
- 2px lines, a legend for two or more series, recessive grid, hover tooltips.

## 7. Anti-Patterns (Banned)
- Invented numbers. A metric with no real data shows an empty state.
- Emojis in the interface.
- Rainbow icon colors, gradient sidebars, neon glows.
- Controls that do nothing.

## 8. Dashboard Pattern
- **Type:** Geist Sans for every signed-in role; Poppins stays on public pages.
- **Order:** page header, one continuous KPI band, then a two-column body with analysis on the left (8/12) and actions and summaries on the right (4/12).
- **KPI band:** no icons. Label, value, one line of context.
- **Needs attention:** only real, actionable items, each linking to where to fix it.
- **Sidebar:** grouped by job, with small quiet section labels.
- **Roles:** every dashboard uses this pattern. Students have a top navigation bar instead of a sidebar, and their page leads with the next course to continue.
