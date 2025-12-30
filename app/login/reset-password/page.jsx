import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

// This is now a Server Component that wraps the Client Component in a Suspense boundary.
// This is the recommended way to solve the `useSearchParams()` build error.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
