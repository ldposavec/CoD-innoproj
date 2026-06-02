# Merit Card Display Improvements

## Overview
Implemented collapsible merit cards with fixed compact size in collapsed state, expandable details on click, and prominent delete buttons. These improvements work consistently in both character creation and editing modes.

## Changes Made

### 1. Merit Selected List Container (`.merit-selected-list`)
- **Gap**: Reduced from `0.45rem` to `0.35rem` for tighter spacing
- **Scrolling**: Maintained `overflow-y: auto` and `flex: 1` for proper scrolling behavior when many items are added
- **Min-height**: Set to `0` to allow proper flex layout with scrolling

### 2. Merit Card Base (`.merit-card`)
- **Overflow**: Changed from `hidden` to `visible` to allow content expansion
- **Padding**: Set to `0` for clean compact appearance
- **Flex**: Kept `0 0 auto` to maintain fixed size based on content

### 3. Merit Card Summary (`.merit-card .expandable-summary`)
**New styling for collapsed state:**
- **Font-size**: `0.88rem` - slightly smaller to emphasize compact view
- **Padding**: `0.5rem 0.6rem` - balanced spacing
- **Display**: `flex` with `justify-content: space-between` and `align-items: center`
- **Gap**: `0.5rem` between elements
- **Min-height**: `2.2rem` - fixed compact size, just enough to display merit info clearly
- **Background**: `var(--surface-2)` - subtle card background
- **Border**: `1px solid var(--border)` - subtle outline
- **Border-radius**: `0.65rem` - slightly rounded corners
- **Width**: `100%` - fills available width
- **Transition**: Smooth background and border transitions for hover/expanded states

**Visual feedback:**
- **Hover state**: Background to `color-mix(in srgb, var(--surface) 50%, var(--surface-2))` and border to primary color highlight
- **Expanded state** (when `[open]`): Background to subtle primary color `color-mix(in srgb, var(--primary) 12%, var(--surface))` and border to `color-mix(in srgb, var(--primary) 50%, var(--border))`

### 4. Merit Card Expandable Content (`.merit-card .expandable-content`)
**Styling for expanded state:**
- **Margin-top**: `0.5rem` - spacing between summary and content
- **Padding**: `0.6rem` - generous padding for readability
- **Background**: `var(--surface-2)` - matches overall theme
- **Border**: `1px solid color-mix(in srgb, var(--primary) 30%, var(--border))` - subtle primary-tinted border
- **Border-radius**: `0.65rem` with top corners `0` (connects visually to summary)

### 5. Delete Button (`.merit-remove`)
**New prominent styling:**
- **Background**: `color-mix(in srgb, var(--danger) 14%, var(--surface))` - subtle danger color tint
- **Border-color**: `color-mix(in srgb, var(--danger) 50%, var(--border))` - visible danger border
- **Color**: `color-mix(in srgb, var(--danger) 80%, var(--text))` - danger-tinted text
- **Font-weight**: `600` - bold text for visibility
- **Margin-top**: `0.3rem` - small spacing from content above
- **Transition**: Smooth all transitions for hover effects
- **Hover state**: 
  - Background darkens to `color-mix(in srgb, var(--danger) 24%, var(--surface))`
  - Border intensifies to `color-mix(in srgb, var(--danger) 70%, var(--border))`

### 6. Merit Details (`.merit-details`)
**Simplified styling for merit-specific content:**
- **Padding-left**: `0` - no left padding
- **Border-left**: `none` - removed the accent border

## Behavior

### Collapsed State
- Shows compact fixed-height card (2.2rem minimum)
- Displays merit name, category, and dot visualization
- Hover changes background and border for visual feedback
- Chevron icon indicates expandable nature

### Expanded State
- Background shifts to subtle primary color
- Expandable content section appears below with:
  - Merit prerequisites (if any)
  - Full description
  - Dot adjustment buttons (+/-)
  - **Prominent delete button** with danger styling
- Smooth transitions between states
- Content area has own border to visually separate from summary

### Scrolling
- When multiple merits are added, the list becomes scrollable
- Individual merit cards maintain fixed heights
- No shrinking of cards as new items are added
- Smooth scrollbar interaction

## Implementation Details

### Responsive Design
- All measurements use relative units (rem) for proper scaling
- Flexbox layout ensures cards expand to fill available width
- Grid gap maintains consistency across different screen sizes

### Theme Support
- Uses CSS custom properties (variables) for colors
- Supports both dark and light themes via root CSS variables
- Danger state uses `--danger` color variable

### Accessibility
- Maintain semantic `<details>` and `<summary>` elements
- Cursor pointer on summary for clear interactivity
- Proper color contrast for text and backgrounds
- WebKit details marker hidden for custom styling

## Files Modified

1. **`/src/app.css`** - CSS styling updates for improved layout and visuals
   - `.merit-selected-list` - Container styling
   - `.merit-card` - Base card styling
   - `.merit-card .expandable-summary` - Collapsed state styling
   - `.merit-card .expandable-summary:hover` - Hover feedback
   - `.merit-card[open] .expandable-summary` - Expanded state styling
   - `.merit-card .expandable-content` - Expanded content area
   - `.merit-remove` - Delete button styling
   - `.merit-details` - Merit-specific content styling

## Usage Locations

### Character Creation (Wizard Step 4)
- MeritPicker component in creation flow
- Shows with `isCreationMode={true}`
- Same compact card styling applies

### Character Sheet Editing (Features Tab)
- MeritPicker component when `sheetEdit` is true
- Shows existing merits in compact cards
- Same expand/collapse behavior

## Testing Recommendations

1. **Visual Testing**
   - Add 3-5 merits and verify compact display
   - Click merit to expand and verify content visibility
   - Check delete button is visible and clickable
   - Verify animation smoothness

2. **Interaction Testing**
   - Expand/collapse multiple times to ensure consistency
   - Click delete button and verify removal works
   - Adjust dots using +/- buttons
   - Test header information (prerequisites, description)

3. **Scrolling Testing**
   - Add 10+ merits to trigger scrolling
   - Verify list scrolls without affecting individual cards
   - Check that scroll position is maintained

4. **Theme Testing**
   - Test in both dark and light themes
   - Verify color contrast meets accessibility standards
   - Check that all colors are properly themed

5. **Cross-Browser Testing**
   - Test in Chrome/Chromium
   - Test in Firefox
   - Test in Safari
   - Verify details/summary functionality works in all browsers

