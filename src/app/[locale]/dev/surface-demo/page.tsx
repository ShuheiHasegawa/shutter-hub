'use client';

import { DevToolsNavigation } from '@/components/dev/DevToolsNavigation';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { SurfaceDemo, ComparisonDemo } from '@/components/ui/surface-demo';

export default function SurfaceDemoPage() {
  return (
    <AuthenticatedLayout>
      <DevToolsNavigation />
      <div className="container py-8 space-y-12">
        <SurfaceDemo />
        <ComparisonDemo />
      </div>
    </AuthenticatedLayout>
  );
}
