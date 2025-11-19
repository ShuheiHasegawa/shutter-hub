'use client';

import dynamic from 'next/dynamic';

const PerformanceDashboard = dynamic(
  () =>
    import('@/components/dev/performance-dashboard').then(
      mod => mod.PerformanceDashboard
    ),
  { ssr: false }
);

const AnalyticsWrapper = dynamic(
  () =>
    import('@/components/analytics/AnalyticsWrapper').then(
      mod => mod.AnalyticsWrapper
    ),
  { ssr: false }
);

export function ClientOnlyComponents() {
  return (
    <>
      <PerformanceDashboard />
      <AnalyticsWrapper />
    </>
  );
}
