# Resource Availability Heatmap - Frontend Implementation

## Overview

Frontend implementation for Resource Intelligence heatmap and timeline views using the new timeline and heatmap APIs.

## Files Created

### Types
- `src/types/resourceTimeline.ts` - TypeScript interfaces for timeline and heatmap data

### API Client
- Extended `src/features/resources/api/useResources.ts` with:
  - `fetchResourceTimeline()` - Fetch timeline for a resource
  - `fetchResourceHeatmap()` - Fetch heatmap for a workspace
  - `useResourceTimeline()` - React Query hook for timeline
  - `useResourceHeatmap()` - React Query hook for heatmap

### Components
- `src/components/resources/ResourceHeatmapCell.tsx` - Individual cell component
- `src/components/resources/ResourceHeatmapGrid.tsx` - Grid component with sticky headers
- `src/pages/resources/ResourceHeatmapPage.tsx` - Workspace heatmap page
- `src/pages/resources/ResourceTimelinePage.tsx` - Resource timeline page

### Utilities
- `src/utils/resourceTimeline.ts` - Helper functions for classification and styling

### Styles
- Added Tailwind classes in `src/index.css`:
  - `bg-availability-none` (green)
  - `bg-availability-warning` (yellow)
  - `bg-availability-critical` (red)

### Routing
- Added routes in `src/App.tsx`:
  - `/workspaces/:id/heatmap` - Workspace heatmap view
  - `/resources/:id/timeline` - Resource timeline view

## API Contract

### GET /api/resources/:id/timeline
**Query Params:**
- `fromDate` (YYYY-MM-DD)
- `toDate` (YYYY-MM-DD)

**Response:**
```json
{
  "data": [
    {
      "date": "2025-01-15",
      "capacityPercent": 100,
      "hardLoadPercent": 50,
      "softLoadPercent": 40,
      "classification": "WARNING",
      "warningThreshold": 80,
      "criticalThreshold": 100,
      "hardCap": 150
    }
  ]
}
```

### GET /api/resources/heatmap/timeline
**Query Params:**
- `workspaceId` (optional)
- `fromDate` (YYYY-MM-DD)
- `toDate` (YYYY-MM-DD)

**Response:**
```json
{
  "data": [
    {
      "date": "2025-01-15",
      "resources": [
        {
          "resourceId": "uuid",
          "resourceName": "John Doe",
          "hardLoad": 50,
          "softLoad": 40,
          "classification": "WARNING"
        }
      ]
    }
  ]
}
```

## Component Architecture

### ResourceHeatmapPage
- **Location**: `/workspaces/:id/heatmap`
- **Features**:
  - Workspace selector (from route or active workspace)
  - Date range picker (default: today + 28 days)
  - Legend showing color meanings
  - ResourceHeatmapGrid component

### ResourceTimelinePage
- **Location**: `/resources/:id/timeline`
- **Features**:
  - Resource ID from route
  - Date range picker
  - Single-row grid showing timeline for one resource
  - Future: Stacked bar chart

### ResourceHeatmapGrid
- **Props**: `resources`, `dates`, `cells`
- **Features**:
  - Sticky resource name column
  - Sticky date header row
  - O(1) cell lookup via Map
  - Responsive table with horizontal scroll

### ResourceHeatmapCell
- **Props**: `cell` (HeatmapCell | null)
- **Features**:
  - Color coding based on classification
  - Load percentage display (e.g., "80H/20S" or "80%")
  - Hover tooltip with detailed breakdown
  - Visual intensity based on total load

## Color Rules

- **NONE** (green): `bg-availability-none` - Within thresholds
- **WARNING** (yellow): `bg-availability-warning` - Above warningThreshold
- **CRITICAL** (red): `bg-availability-critical` - Above criticalThreshold

Optional opacity:
- Total load < 50%: 60% opacity (light)
- Total load 50-100%: 100% opacity (normal)
- Total load > 100%: 100% opacity + ring (strong)

## Performance

- Uses pre-computed ResourceDailyLoad read model
- No heavy joins on each request
- React Query caching (30s staleTime)
- Efficient cell lookup with Map structure
- Handles 100-200 resources per workspace efficiently

## Testing

### Unit Tests
- `ResourceHeatmapCell.test.tsx` - Cell rendering and classification

### Manual Testing
1. Navigate to `/workspaces/{id}/heatmap`
2. Verify date range defaults to 28 days
3. Verify cells show correct colors and percentages
4. Verify tooltips show detailed breakdown
5. Navigate to `/resources/{id}/timeline`
6. Verify single resource timeline displays correctly

## Next Steps

1. Add stacked bar chart to ResourceTimelinePage
2. Add weekly/monthly aggregation for longer date ranges
3. Add export functionality (CSV/PDF)
4. Add filtering by resource role or skills
5. Add click-through to allocation details





