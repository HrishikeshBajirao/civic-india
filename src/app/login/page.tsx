import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <>
      <div className="auth-header-shell">
        <SiteHeader />
      </div>
      <AuthForm mode="login" />
    </>
  );
}
