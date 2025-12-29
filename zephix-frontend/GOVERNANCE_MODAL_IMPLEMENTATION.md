# Governance Modal Implementation

## Overview

Implementation of a Governance Modal that handles "justification required" errors when creating or updating resource allocations. When the backend returns a justification error, the UI automatically prompts the user for a reason and retries the allocation.

## Files Created

### Error Detection
- `src/features/resources/utils/allocation-errors.ts` - Helper functions to detect justification errors
  - `isJustificationRequiredError()` - Detects if error is justification-related
  - `extractProjectedTotal()` - Extracts projected load from error message
  - `extractJustificationThreshold()` - Extracts threshold from error message

### Components
- `src/features/resources/components/ResourceJustificationModal.tsx` - Modal component for collecting justification
- `src/features/resources/components/GovernedAllocationProvider.tsx` - Provider wrapper (optional)

### Hooks
- `src/features/resources/hooks/useGovernedAllocationMutation.ts` - Hook that wraps allocation mutations with justification handling

### Tests
- `src/features/resources/utils/__tests__/allocation-errors.test.ts` - Unit tests for error detection
- `src/features/resources/components/__tests__/ResourceJustificationModal.test.tsx` - Component tests

## Usage

### Basic Usage with Hook

```tsx
import { useGovernedAllocationMutation } from '@/features/resources/hooks/useGovernedAllocationMutation';
import { ResourceJustificationModal } from '@/features/resources/components/ResourceJustificationModal';

function MyComponent() {
  const {
    createAllocation,
    isJustificationModalOpen,
    justificationModalProps,
    handleJustificationSubmit,
    handleJustificationCancel,
  } = useGovernedAllocationMutation({
    onSuccess: (data) => {
      console.log('Allocation created:', data);
      // Refresh queries, close forms, etc.
    },
    onError: (error) => {
      // Handle non-justification errors
      console.error('Allocation failed:', error);
    },
    resourceName: 'John Doe', // Optional: for modal context
  });

  const handleCreate = async () => {
    try {
      await createAllocation({
        resourceId: 'resource-123',
        projectId: 'project-456',
        startDate: '2025-01-15',
        endDate: '2025-01-31',
        allocationPercentage: 120, // This will trigger justification
      });
      // Success handled by onSuccess callback
    } catch (error) {
      // Only non-justification errors reach here
    }
  };

  return (
    <>
      <button onClick={handleCreate}>Create Allocation</button>

      <ResourceJustificationModal
        {...justificationModalProps}
        onSubmit={handleJustificationSubmit}
        onCancel={handleJustificationCancel}
      />
    </>
  );
}
```

### Usage with Provider (Alternative)

```tsx
import { GovernedAllocationProvider } from '@/features/resources/components/GovernedAllocationProvider';

function App() {
  return (
    <GovernedAllocationProvider resourceName="John Doe">
      <MyComponent />
    </GovernedAllocationProvider>
  );
}
```

## Flow

1. **User creates/updates allocation** → Calls `createAllocation()` or `updateAllocation()`
2. **Backend validates** → If projected total > `requireJustificationAbove`, returns HTTP 400 with message: "Justification is required for allocations exceeding X%. Projected total: Y%"
3. **Hook detects error** → `isJustificationRequiredError()` returns true
4. **Modal opens** → Stores pending payload, opens `ResourceJustificationModal`
5. **User enters justification** → Types reason in textarea
6. **User submits** → Hook retries mutation with `justification` field included
7. **Success** → Modal closes, queries invalidate, success callback fires
8. **Failure** → If another justification error, stays in modal; otherwise shows standard error

## Error Detection

The `isJustificationRequiredError()` helper checks for:
- Message contains "Justification is required" (case-insensitive)
- Message contains "justification required" (case-insensitive)
- Works with both axios error format (`error.response.data.message`) and direct error objects

## Integration Points

### Updated Components
- `TaskCard.tsx` - Now uses `useGovernedAllocationMutation` instead of direct `resourceService.createAllocation()`

### Backward Compatibility
- `resourceService.createAllocation()` still exists but is marked as `@deprecated`
- Existing code continues to work but won't get automatic justification handling

## Testing

### Unit Tests
- Error detection helper tests all message formats
- Modal component tests user interactions

### Manual Testing Checklist
1. Create allocation that exceeds justification threshold
2. Verify modal appears instead of raw error
3. Enter justification and submit
4. Verify allocation succeeds
5. Verify timeline/heatmap refreshes
6. Try submitting empty justification (should show validation error)
7. Try canceling modal (should abort allocation)

## API Contract

### Backend Error Format
```json
{
  "statusCode": 400,
  "message": "Justification is required for allocations exceeding 100%. Projected total: 120%",
  "error": "Bad Request"
}
```

### Allocation Payload (with justification)
```json
{
  "resourceId": "uuid",
  "projectId": "uuid",
  "startDate": "2025-01-15",
  "endDate": "2025-01-31",
  "allocationPercentage": 120,
  "justification": "Critical project deadline requiring temporary overallocation"
}
```

## Future Enhancements

1. Add justification history/audit trail display
2. Pre-fill justification from similar allocations
3. Add justification templates
4. Show justification in allocation list/details views
5. Add E2E tests for full flow





