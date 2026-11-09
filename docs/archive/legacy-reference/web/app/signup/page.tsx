import type { ReactNode } from "react";
import { AuthForm } from "../../features/auth/auth-form";

export default function SignupPage(): ReactNode {
  return <AuthForm mode="signup" />;
}
