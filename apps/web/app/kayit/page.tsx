import { AuthForm } from "../auth-form";
import { AuthPage } from "../giris/page";

export default function RegisterPage() {
  return (
    <AuthPage
      title="Şirket çalışma alanınızı kurun"
      subtitle="İlk organizasyonunuz ve şirket sahibi rolünüz birlikte oluşturulur."
    >
      <AuthForm mode="register" />
    </AuthPage>
  );
}
