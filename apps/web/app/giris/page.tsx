import { Layers3, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AuthForm } from "../auth-form";

export default function LoginPage() {
  return (
    <AuthPage
      title="Operasyonunuza devam edin"
      subtitle="Ekibinizin bugünkü işlerine güvenli biçimde erişin."
    >
      <AuthForm mode="login" />
    </AuthPage>
  );
}

export function AuthPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link className="auth-logo" href="/">
          <Layers3 size={35} />
          <span>
            Saha<strong>Flow</strong> <small>TR</small>
          </span>
        </Link>
        <div>
          <p className="eyebrow">SAHA İŞİNİZİN DİJİTAL GÜCÜ</p>
          <h2>
            Her iş, her ekip,
            <br />
            tek operasyon merkezi.
          </h2>
          <p>
            Müşteri talebinden tahsilata kadar saha süreçlerinizi güvenli bir
            çalışma alanında yönetin.
          </p>
        </div>
        <span className="auth-trust">
          <ShieldCheck size={17} /> Organizasyon bazlı güvenli veri erişimi
        </span>
      </section>
      <section className="auth-content">
        <div className="auth-card">
          <p className="eyebrow">SAHAFLOW TR</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
