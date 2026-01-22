# Analytics Components

Real-time analytics dashboards and data visualization components for admin insights.

## Component Structure
- Chart/ - Recharts-based visualization components
- ConversationsView/ - Main analytics dashboard for conversation data

## Data Sources
- Analytics API routes in @/app/api/admin/analytics
- Real-time data aggregation with Supabase
- Date range filtering with customizable periods
- Organization-scoped metrics

## Visualization Components

### Chart Components
- LineChart for temporal trends
- BarChart for categorical comparisons
- PieChart for distribution analysis
- Custom tooltips with formatted data
- Responsive design with dynamic sizing

### ConversationsView Dashboard
- Daily conversation volume tracking
- User engagement metrics
- Model usage distribution
- Response time analytics
- Export functionality for reports

## Data Flow
```typescript
// Fetch analytics data
const { data, loading, error } = useAnalytics({
  org_id: organization.id,
  dateRange: { start: startDate, end: endDate },
  metrics: ['conversations', 'users', 'models']
});

// Process for charts
const chartData = processAnalyticsData(data);
```

## Chart Configuration
```typescript
// Common chart props
interface ChartProps {
  data: AnalyticsData[];
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  interactive?: boolean;
}

// Recharts configuration
const chartConfig = {
  margin: { top: 20, right: 30, bottom: 40, left: 50 },
  animationDuration: 300,
  responsiveContainer: true
};
```

## Performance Considerations
- Data aggregation happens server-side
- Chart data is memoized to prevent re-renders
- Lazy loading for historical data
- Debounced date range changes
- Virtualized data tables for large datasets

## Date Handling
- Uses date-fns for formatting
- UTC normalization for consistency
- Timezone-aware displays
- Relative date options (Last 7 days, Last 30 days, etc.)

## Export Features
- CSV export for raw data
- PNG/SVG export for charts
- Scheduled report generation
- Email delivery integration

## Testing
```bash
# Run analytics component tests
npm test src/components/features/admin/analytics

# Test chart components
npm test Chart.test.tsx
npm test ConversationsView.test.tsx
```

## Security & Permissions
- Admin role required for access
- Organization data isolation
- Rate limiting on data endpoints
- Cached responses for common queries

## Common Patterns
```typescript
// Date range state management
const [dateRange, setDateRange] = useState({
  start: subDays(new Date(), 30),
  end: new Date()
});

// Chart data formatting
const formatChartData = (raw: RawData[]): ChartData[] => {
  return raw.map(item => ({
    date: format(item.date, 'MMM dd'),
    value: item.count,
    label: item.label
  }));
};
```

## Styling
- Consistent color palette from design system
- Dark mode support with theme variables
- Responsive breakpoints for mobile/tablet
- Print-friendly styles for reports

## Common Commands
```bash
npm run dev                    # Start development server
npm test                      # Run tests
npm run build                 # Build for production
npm run analyze              # Bundle size analysis
```