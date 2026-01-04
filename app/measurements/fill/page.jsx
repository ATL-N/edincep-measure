import { Suspense } from 'react';
import FillForm, { FormSkeleton } from './FillForm';

export default function FillMeasurementPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <FillForm />
    </Suspense>
  );
}