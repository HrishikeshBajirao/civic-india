import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";

export default function RegisterPage() {
  return (
    <>
      <div className="auth-header-shell">
        <SiteHeader />
      </div>
      <AuthForm mode="register" />
    </>
  );
}
