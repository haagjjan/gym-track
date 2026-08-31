import type { ReactNode } from "react";
import { ForgotPasswordScreen } from "../../features/auth/account-flow-screens";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage(): ReactNode {
  return <ForgotPasswordScreen />;
}
