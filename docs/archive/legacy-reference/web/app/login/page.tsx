import type { ReactNode } from "react";
import { AuthForm } from "../../features/auth/auth-form";

export default function LoginPage(): ReactNode {
  return <AuthForm mode="login" />;
}
