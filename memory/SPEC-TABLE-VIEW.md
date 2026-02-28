# Technical Specification: Table View Feature
## Remy-Tracker

**Date:** 2026-02-21  
**Status:** Draft - Ready for Dev Implementation

---

## 1. Component Hierarchy

```
TableViewPage (Route: /table)
├── FilterBar (existing, reused)
│   └── SearchInput, StatusFilter, PriorityFilter
├── TicketTable (new)
│   ├── TableHeader (new)
│   │   └── SortableHeaderCell (new) × 7 columns
│   ├── TableBody (new)
│   │   └── TableRow (new) × N tickets
│   └── TableFooter (optional - pagination placeholder)
├── LoadingState (existing or new)
├── EmptyState (existing or new)
└── BackToBoardButton (new)
```

---

## 2. Props/Interfaces Definition

### Ticket Interface (existing - verify exists)
```typescript
interface Ticket {
  id: string;
  ticketNumber: string;      // Ticket # column
  title: string;               // Title column
  status: 'open' | 'in-progress' | 'closed' | 'backlog';  // Status column
  priority: 'low' | 'medium' | 'high' | 'critical';         // Priority column
  assignee?: {               // Assignee column
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  createdAt: string;         // Created column (ISO 8601)
  updatedAt: string;         // Last Updated column (ISO 8601)
}
```

### Sort Configuration
```typescript
interface SortConfig {
  column: 'ticketNumber' | 'title' | 'status' | 'priority' | 'assignee' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}
```

### SortableHeader Props
```typescript
interface SortableHeaderProps {
  column: SortConfig['column'];
  label: string;
  sortConfig: SortConfig | null;
  onSort: (column: SortConfig['column']) => void;
}
```

### TicketTable Props
```typescript
interface TicketTableProps {
  tickets: Ticket[];
  sortConfig: SortConfig | null;
  onSort: (column: SortConfig['column']) => void;
  onRowClick: (ticketId: string) => void;
  isLoading?: boolean;
}
```

### TableViewPage State
```typescript
interface TableViewState {
  tickets: Ticket[];
  sortConfig: SortConfig | null;
  filters: FilterState;  // From existing FilterBar
  isLoading: boolean;
}
```

---

## 3. State Management Approach

### Primary: Extend Existing `useTickets` Hook

```typescript
// hooks/useTickets.ts (modify existing)
interface UseTicketsOptions {
  filters?: FilterState;
  sort?: SortConfig;
}

export function useTickets(options?: UseTicketsOptions) {
  // Existing: fetch tickets
  // Add: sort tickets if sort config provided
  // Returns: { tickets, isLoading, error, refetch }
}
```

**Implementation:**
- ✅ Keep existing data fetching logic
- ✅ Add client-side sorting (API sorting = future enhancement)
- ✅ Filter application happens before sort

### Secondary: useTableView Hook (new)

```typescript
// hooks/useTableView.ts
export function useTableView() {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const router = useRouter();
  
  // Sync sort with URL
  const updateSort = useCallback((column: SortConfig['column']) => {
    setSortConfig(current => {
      const newDirection = current?.column === column && current.direction === 'asc' 
        ? 'desc' 
        : 'asc';
      return { column, direction: newDirection };
    });
  }, []);
  
  // Initialize from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sort = params.get('sort');
    const order = params.get('order');
    if (sort && order) {
      setSortConfig({ column: sort as SortConfig['column'], direction: order as 'asc' | 'desc' });
    }
  }, []);
  
  // Update URL when sort changes (debounced optional)
  useEffect(() => {
    if (sortConfig) {
      const params = new URLSearchParams(window.location.search);
      params.set('sort', sortConfig.column);
      params.set('order', sortConfig.direction);
      router.replace(`/table?${params.toString()}`, { scroll: false });
    }
  }, [sortConfig, router]);
  
  return { sortConfig, updateSort };
}
```

---

## 4. URL State Management

### Route: `/table`

### Query Parameters:
| Param | Type | Description |
|-------|------|-------------|
| `sort` | string | Column key: `ticketNumber`, `title`, `status`, `priority`, `assignee`, `createdAt`, `updatedAt` |
| `order` | `asc` \| `desc` | Sort direction |

### URL Examples:
- `/table` - Default sort (by ticket number desc)
- `/table?sort=priority&order=desc` - Priority high-to-low
- `/table?sort=createdAt&order=asc` - Oldest first
- `/table?filter=open&sort=updatedAt&order=desc` - With filters (reuses existing filter params)

### Filter Compatibility:
- ✅ Reuse existing FilterBar's URL sync logic
- ✅ Filters and sort work independently
- ✅ Combined: `/table?status=open&priority=high&sort=createdAt&order=desc`

---

## 5. Filter Logic Reuse

### Decision: ✅ FULL REUSE of existing FilterBar

**Rationale:**
- FilterBar already syncs with URL
- Same filter options apply to board and table views
- DRY principle - single source of truth

**Modification needed:**
```typescript
// FilterBar.tsx (existing - minimal change)
interface FilterBarProps {
  onFiltersChange?: (filters: FilterState) => void;
  variant?: 'board' | 'table'; // optional - for slight styling differences
}
```

**Route Handling:**
- Filters on `/board` → stay on board
- Filters on `/table` → stay on table
- FilterBar auto-detects current route

---

## 6. Styling Approach (Tailwind)

### Table Container
```tsx
<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
```

### Header Row
```tsx
<thead className="bg-gray-50 dark:bg-gray-800">
  <tr>
    {/* Column headers */}
  </tr>
</thead>
```

### Sortable Header Cell
```tsx
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none">
  <div className="flex items-center gap-1">
    <span>{label}</span>
    <SortIcon direction={sortConfig?.direction} isActive={sortConfig?.column === column} />
  </div>
</th>
```

### Data Row
```tsx
<tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
  <tr 
    onClick={() => onRowClick(ticket.id)}
    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
  >
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
      {ticket.ticketNumber}
    </td>
    {/* ... other cells ... */}
  </tr>
</tbody>
```

### Responsive Behavior
| Breakpoint | Behavior |
|------------|----------|
| Mobile (<640px) | `overflow-x-auto` enables horizontal scroll |
| Tablet (640-1024px) | Full table visible, compact padding |
| Desktop (>1024px) | Full table, comfortable padding |

---

## 7. Component Implementation Order

1. **SortableHeaderCell** - Pure UI component
2. **TicketTable** - Presentational component
3. **useTableView hook** - Sort + URL sync
4. **TableViewPage** - Route page composing all pieces
5. **BackToBoardButton** - Simple nav button
6. **Loading/Empty states** - Reuse existing or create

---

## 8. File Structure

```
app/
├── table/
│   └── page.tsx                    # TableViewPage
├── hooks/
│   ├── useTickets.ts               # Modify existing (add sort support)
│   └── useTableView.ts             # NEW
├── components/
│   ├── TicketTable.tsx             # NEW
│   ├── SortableHeaderCell.tsx      # NEW
│   ├── BackToBoardButton.tsx       # NEW
│   └── TicketRow.tsx               # NEW (optional - extracted)
├── types/
│   └── ticket.ts                   # Verify exists
└── lib/
    └── sortTickets.ts              # NEW (sorting utility)
```

---

## 9. Sorting Logic (Client-side)

```typescript
// lib/sortTickets.ts
export function sortTickets(
  tickets: Ticket[], 
  sortConfig: SortConfig
): Ticket[] {
  return [...tickets].sort((a, b) => {
    let aVal: any = a[sortConfig.column];
    let bVal: any = b[sortConfig.column];
    
    // Handle nested fields (assignee)
    if (sortConfig.column === 'assignee') {
      aVal = a.assignee?.name ?? '';
      bVal = b.assignee?.name ?? '';
    }
    
    // Handle dates
    if (['createdAt', 'updatedAt'].includes(sortConfig.column)) {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    // Handle priority ordering (critical > high > medium > low)
    if (sortConfig.column === 'priority') {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      aVal = priorityOrder[aVal] || 0;
      bVal = priorityOrder[bVal] || 0;
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
}
```

---

## 10. Navigation & UX

### Row Click Behavior
- Primary: Navigate to `/tickets/[id]`
- Visual: Pointer cursor, row highlight on hover
- Accessibility: `role="link"`, `tabIndex={0}`, Enter key support

### Back to Board Button
```tsx
<Link href="/board">
  <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
    <ArrowLeftIcon className="w-4 h-4" />
    Back to Board
  </button>
</Link>
```

### Empty State
- Reuse existing EmptyState component if available
- Message: "No tickets match your filters"
- Action: "Clear filters" button

---

## Summary for Dev

| Task | Priority | Notes |
|------|----------|-------|
| Create types/interfaces | P0 | Verify existing Ticket type |
| Build SortableHeaderCell | P0 | Pure component, icon support |
| Build TicketTable | P0 | Responsive, accessible |
| Create useTableView hook | P0 | URL sync + sort state |
| Modify useTickets | P0 | Accept sort config |
| Create TableViewPage | P0 | Compose all pieces |
| Update FilterBar | P1 | Route-aware (if needed) |
| Add BackToBoardButton | P1 | Simple nav component |
| Implement sorting util | P1 | Custom sort logic |
| Tests | P2 | Unit + integration |
