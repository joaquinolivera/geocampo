import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.geocampo.io';

// ─── Feature data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Mapa satelital interactivo',
    desc:  'Dibujá y editá tus potreros directamente sobre imágenes satelitales. Visualizá carga animal, alertas y movimientos en tiempo real.',
  },
  {
    icon: '🐄',
    title: 'Seguimiento de hacienda',
    desc:  'Registrá lotes, pesajes, movimientos entre potreros y trazá la ganancia de peso diaria. Por especie, por raza, por lote.',
  },
  {
    icon: '💉',
    title: 'Sanidad animal',
    desc:  'Calendario sanitario, alertas de vencimiento, historial de vacunas, desparasitaciones y tratamientos. Nunca más perdés una aplicación.',
  },
  {
    icon: '🏢',
    title: 'ERP completo',
    desc:  'Empleados, combustible, gastos, maquinaria y costo por cabeza. Todo integrado con el mapa y los datos de producción.',
  },
  {
    icon: '📡',
    title: 'Offline-first',
    desc:  'Funciona sin internet. Los datos se sincronizan en segundo plano cuando hay conectividad. Ideal para el campo.',
  },
  {
    icon: '🤖',
    title: 'Asistente IA (próximamente)',
    desc:  'Consultá al asistente sobre tu hacienda: "¿Cuál potrero tiene la mayor carga?", "¿Qué lotes necesitan desparasitar esta semana?"',
  },
];

const PRICING = [
  {
    name:  'Starter',
    price: 'USD 29',
    period: '/mes',
    desc:  'Para pequeños productores',
    features: [
      'Hasta 3 potreros',
      'Hasta 500 cabezas',
      'Mapa satelital',
      'Seguimiento de hacienda',
      'Sanidad animal',
      '1 usuario',
    ],
    cta:  'Empezar gratis',
    href: `${APP_URL}/register?plan=starter`,
    highlighted: false,
  },
  {
    name:  'Pro',
    price: 'USD 79',
    period: '/mes',
    desc:  'Para estancias medianas',
    features: [
      'Potreros ilimitados',
      'Cabezas ilimitadas',
      'ERP completo',
      'Importar GeoJSON',
      'Multi-usuario (5)',
      'Soporte prioritario',
    ],
    cta:  'Empezar Pro',
    href: `${APP_URL}/register?plan=pro`,
    highlighted: true,
  },
  {
    name:  'Enterprise',
    price: 'A consultar',
    period: '',
    desc:  'Para grupos ganaderos y cooperativas',
    features: [
      'Multi-estancia',
      'Asistente IA',
      'API acceso',
      'SSO / SAML',
      'SLA dedicado',
      'Integración ERP externo',
    ],
    cta:  'Hablar con ventas',
    href: 'mailto:ventas@geocampo.io',
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    name:  'Rodrigo Villalba',
    role:  'Productor, Concepción PY',
    text:  'Antes usaba cuadernos y hojas de cálculo. Con GeoCampo veo en segundos qué potrero está sobrecargado y cuántos días llevan los lotes.',
    initials: 'RV',
  },
  {
    name:  'Luciana Ferreyra',
    role:  'Administradora, Formosa AR',
    text:  'El módulo de sanidad me salvó dos veces. Las alertas de vencimiento de vacunas son exactamente lo que necesitaba.',
    initials: 'LF',
  },
  {
    name:  'Pablo Acosta',
    role:  'Capataz, Chaco PY',
    text:  'Lo uso desde el celular en el campo, sin internet. Cuando llego a la casa sincroniza solo. Muy fácil.',
    initials: 'PA',
  },
];

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 border-b border-white/10"
      style={{ backgroundColor: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(16px)' }}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">🌿</span>
        <span className="text-lime font-bold text-xl tracking-tight">GeoCampo</span>
      </div>
      <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
        <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
        <a href="#pricing"  className="hover:text-white transition-colors">Precios</a>
        <a href="#testimonials" className="hover:text-white transition-colors">Testimonios</a>
      </nav>
      <div className="flex items-center gap-3">
        <Link href={`${APP_URL}/login`}
          className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
          Iniciar sesión
        </Link>
        <Link href={`${APP_URL}/register`}
          className="text-sm font-bold rounded-xl px-4 py-2 transition-all hover:opacity-90"
          style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}>
          Empezar gratis
        </Link>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-40 pb-24 px-6 text-center max-w-4xl mx-auto">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-lime/70 border border-lime/20 rounded-full px-4 py-1.5 mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
        Ahora disponible · Beta pública
      </div>
      <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight mb-6">
        Gestioná tu estancia{' '}
        <span style={{ color: '#DEFF9A' }}>desde el satélite</span>{' '}
        hasta la balanza
      </h1>
      <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
        GeoCampo es el sistema de gestión ganadera que combina mapa satelital interactivo,
        seguimiento de hacienda, sanidad animal y ERP completo — en una sola plataforma offline-first.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href={`${APP_URL}/setup`}
          className="rounded-2xl px-8 py-4 font-bold text-base transition-all hover:opacity-90 hover:scale-105"
          style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}>
          Crear mi estancia gratis →
        </Link>
        <Link href={`${APP_URL}/estancia-las-pampas`}
          className="rounded-2xl px-8 py-4 font-bold text-base border border-white/20 hover:border-white/40 text-white transition-all hover:bg-white/5">
          Ver demo en vivo
        </Link>
      </div>
      <p className="text-white/30 text-sm mt-6">Sin tarjeta de crédito · 30 días gratis en plan Pro</p>
    </section>
  );
}

// ─── Features grid ────────────────────────────────────────────────────────────

function Features() {
  return (
    <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-black mb-4">Todo lo que necesitás, integrado</h2>
        <p className="text-white/50 text-lg max-w-2xl mx-auto">Dejá los cuadernos. GeoCampo centraliza todo el manejo de tu campo en una sola herramienta.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title}
            className="rounded-2xl border border-white/10 p-6 hover:border-lime/30 transition-colors group"
            style={{ backgroundColor: '#1A1A1B' }}>
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="text-white font-bold text-lg mb-2 group-hover:text-lime transition-colors">{f.title}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Social proof strip ───────────────────────────────────────────────────────

function Stats() {
  return (
    <section className="py-16 border-y border-white/10" style={{ backgroundColor: '#0F0F10' }}>
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          { value: '12k+', label: 'hectáreas gestionadas' },
          { value: '4.8k',  label: 'cabezas registradas' },
          { value: '98%',  label: 'uptime' },
          { value: '< 100ms', label: 'tiempo de respuesta' },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-3xl font-black" style={{ color: '#DEFF9A' }}>{s.value}</p>
            <p className="text-white/40 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-black mb-4">Precios simples y transparentes</h2>
        <p className="text-white/50 text-lg">Comenzá gratis. Escala cuando tu campo crece.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRICING.map((plan) => (
          <div key={plan.name}
            className={`rounded-2xl border p-6 flex flex-col ${plan.highlighted ? 'border-lime/50 scale-105' : 'border-white/10'}`}
            style={{ backgroundColor: plan.highlighted ? '#1A1F0A' : '#1A1A1B' }}>
            {plan.highlighted && (
              <div className="text-[10px] font-bold uppercase tracking-widest text-lime/80 mb-4">
                ⭐ Más popular
              </div>
            )}
            <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
            <p className="text-white/40 text-sm mb-4">{plan.desc}</p>
            <div className="mb-6">
              <span className="text-3xl font-black" style={{ color: plan.highlighted ? '#DEFF9A' : '#fff' }}>
                {plan.price}
              </span>
              {plan.period && <span className="text-white/40 text-sm ml-1">{plan.period}</span>}
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm text-white/70">
                  <span style={{ color: '#DEFF9A' }}>✓</span> {feat}
                </li>
              ))}
            </ul>
            <Link href={plan.href}
              className={`text-center rounded-xl py-3 text-sm font-bold transition-all ${plan.highlighted ? 'hover:opacity-90' : 'border border-white/20 hover:border-white/40 hover:bg-white/5'}`}
              style={plan.highlighted ? { backgroundColor: '#DEFF9A', color: '#0A0A0B' } : { color: '#fff' }}>
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section id="testimonials" className="py-24 px-6 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-black mb-4">Lo que dicen los productores</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#1A1A1B' }}>
            <p className="text-white/70 text-sm leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: '#DEFF9A20', color: '#DEFF9A' }}>
                {t.initials}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{t.name}</p>
                <p className="text-white/40 text-xs">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-32 px-6 text-center max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
        Tu campo merece{' '}
        <span style={{ color: '#DEFF9A' }}>tecnología de punta</span>
      </h2>
      <p className="text-white/50 text-lg mb-10">
        Empezá gratis hoy. Configurá tu estancia en 5 minutos.
      </p>
      <Link href={`${APP_URL}/setup`}
        className="inline-block rounded-2xl px-10 py-5 font-bold text-lg transition-all hover:opacity-90 hover:scale-105"
        style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}>
        Crear mi estancia gratis →
      </Link>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-white/30 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <span className="font-bold text-white/60">GeoCampo</span>
          <span className="ml-2">© 2025</span>
        </div>
        <div className="flex gap-6">
          <a href="mailto:hola@geocampo.io" className="hover:text-white transition-colors">Contacto</a>
          <a href="/privacy" className="hover:text-white transition-colors">Privacidad</a>
          <a href="/terms" className="hover:text-white transition-colors">Términos</a>
        </div>
        <p>Hecho en Paraguay 🇵🇾 / Argentina 🇦🇷</p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main>
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
