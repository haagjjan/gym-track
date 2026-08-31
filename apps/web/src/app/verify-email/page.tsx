import { Suspense, type ReactNode } from "react";
import { VerifyEmailScreen } from "../../features/auth/account-flow-screens";

export const metadata = { title: "Confirm your email" };

// useSearchParams requires a Suspense boundary during prerender.
export default function VerifyEmailPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <VerifyEmailScreen />
    </Suspense>
  );
}
