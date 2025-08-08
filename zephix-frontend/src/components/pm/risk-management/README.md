# Risk Management Dashboard

A comprehensive AI-powered risk management dashboard component for project management applications.

## Features

### 🎯 Risk Overview
- Risk level distribution charts
- Category breakdown analysis
- Top risks by score ranking
- Summary cards with key metrics

### 📊 Risk Matrix
- Interactive probability vs impact matrix
- Color-coded risk levels
- Visual representation of risk distribution
- Risk count indicators in matrix cells

### 📋 Risk Register
- Comprehensive risk listing table
- Category and level filtering
- Detailed risk information display
- Risk detail modal with full information

### 🔍 Risk Monitoring
- Active risk monitoring status
- Risk trends and statistics
- Warning signals and lead indicators
- Alert configuration settings

### 🔮 Risk Forecasting
- Project impact forecasting
- Contingency recommendations
- Emerging risk projections
- AI-powered risk prediction

## Usage

```tsx
import { RiskManagementDashboard } from '@/components/pm/risk-management';

function ProjectPage() {
  const handleRiskAnalyzed = (analysisId: string) => {
    console.log('Risk analysis completed:', analysisId);
  };

  return (
    <RiskManagementDashboard
      projectId="project-123"
      onRiskAnalyzed={handleRiskAnalyzed}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | `string` | Yes | The ID of the project to manage risks for |
| `onRiskAnalyzed` | `(analysisId: string) => void` | No | Callback when risk analysis is completed |

## API Endpoints

The component expects the following API endpoints:

- `GET /api/pm/risk-management/{projectId}/register` - Load risk data
- `POST /api/pm/risk-management/analyze` - Perform risk analysis
- `GET /api/pm/risk-management/{projectId}/forecasting` - Load forecast data

## Data Structure

### RiskData Interface
```typescript
interface RiskData {
  id: string;
  title: string;
  description: string;
  category: string;
  probability: {
    score: number;
    confidence: number;
    rationale: string;
  };
  impact: {
    schedule: number;
    budget: number;
    scope: number;
    quality: number;
    overall: number;
  };
  riskScore: number;
  riskLevel: string;
  status: string;
  owner?: string;
  createdAt: string;
  triggers: {
    warningSignals: string[];
    leadIndicators: string[];
  };
}
```

### RiskSummary Interface
```typescript
interface RiskSummary {
  totalRisks: number;
  activeRisks: number;
  newRisks: number;
  closedRisks: number;
  riskDistribution: {
    veryHigh: number;
    high: number;
    medium: number;
    low: number;
    veryLow: number;
  };
  categoryBreakdown: Record<string, number>;
}
```

## Features

### AI-Powered Analysis
- Comprehensive risk scanning across multiple sources
- Probability and impact assessment with confidence levels
- Automated risk categorization and scoring
- Warning signals and lead indicators identification

### Visual Risk Matrix
- 5x5 probability vs impact matrix
- Color-coded risk levels (Very High, High, Medium, Low, Very Low)
- Interactive cell display with risk counts
- Clear visual risk assessment

### Advanced Filtering
- Filter by risk category (Technical, Resource, Schedule, Budget, etc.)
- Filter by risk level (Very High, High, Medium, Low, Very Low)
- Real-time filtering with immediate UI updates

### Risk Monitoring
- Active risk tracking with warning signals
- Risk trend analysis and statistics
- Configurable alert thresholds
- Escalation monitoring

### Forecasting & Planning
- Project impact forecasting across schedule, budget, scope, and quality
- Contingency planning recommendations
- Emerging risk projections
- Resource and timeline recommendations

## Styling

The component uses Tailwind CSS classes and is fully responsive. It includes:

- Modern card-based layout
- Consistent color coding for risk levels
- Responsive grid layouts
- Interactive hover states
- Loading states and animations

## Dependencies

- React 18+
- Lucide React (for icons)
- Tailwind CSS
- TypeScript

## Browser Support

- Modern browsers with ES6+ support
- Responsive design for mobile and desktop
- Touch-friendly interactions
