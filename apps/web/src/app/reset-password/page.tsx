import { Suspense, type ReactNode } from "react";
import { ResetPasswordScreen } from "../../features/auth/account-flow-screens";

export const metadata = { title: "Choose a new password" };

// useSearchParams requires a Suspense boundary during prerender.
export default function ResetPasswordPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
