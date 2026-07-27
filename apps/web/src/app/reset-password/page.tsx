import { Suspense, type ReactNode } from "react";
import { ResetPasswordScreen } from "../../features/auth/account-flow-screens";

export const metadata = { title: "New access code" };

// useSearchParams requires a Suspense boundary during prerender.
export default function ResetPasswordPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
