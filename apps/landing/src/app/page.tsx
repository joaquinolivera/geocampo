// No next/link — all cross-app links are plain <a> tags so the browser does a
// full navigation through the proxy, not a client-side route change in the
// landing app's webpack bundle (which doesn't contain the web app's chunks).

// Dev: relative '/app' → proxied to web app on :3002 via next.config rewrites.
// Production same-domain: set NEXT_PUBLIC_APP_URL=https://geocampo.app/app
// Production subdomain:   set NEXT_PUBLIC_APP_URL=https://app.geocampo.app
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '/app';

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Mapa satelital interactivo',
    desc:  'Dibujá y editá tus potreros directamente sobre imágenes satelitales. Visualizá carga animal, alertas y movimientos en tiempo real.',
  },
  {
    icon: '🐄',
    title: 'Seguimiento de hacienda',
    desc:  'Registrá lotes, pesajes y movimientos entre potreros. Trazá la ganancia de peso diaria (GPD) por especie, raza y lote.',
  },
  {
    icon: '💉',
    title: 'Sanidad animal',
    desc:  'Calendario sanitario, alertas de vencimiento, historial de vacunas, desparasitaciones y tratamientos. Nunca más perdés una aplicación.',
  },
  {
    icon: '🏢',
    title: 'ERP ganadero completo',
    desc:  'Empleados, combustible, gastos veterinarios, maquinaria y costo por cabeza — todo integrado con el mapa y los datos de producción.',
  },
  {
    icon: '📡',
    title: 'Offline-first',
    desc:  'Funciona sin internet. Los datos se sincronizan automáticamente cuando volvés a tener señal. Ideal para el campo.',
  },
  {
    icon: '🤖',
    title: 'Asistente IA (próximamente)',
    desc:  'Consultá al asistente sobre tu hacienda: "¿Qué lotes necesitan desparasitar esta semana?" o "¿Qué potrero está sobrecargado?"',
  },
];

const PRODUCTS = [
  {
    icon: '🖥️',
    name: 'GeoCampo Web',
    desc: 'Dashboard completo en el navegador. Mapa satelital, reportes, exportación PDF/CSV, ERP y gestión multi-usuario.',
    badge: 'Disponible',
    badgeColor: '#DEFF9A',
    href: APP_URL,
  },
  {
    icon: '📱',
    name: 'GeoCampo Mobile',
    desc: 'App para iOS y Android. Ingresá pesajes, movimientos y registros sanitarios desde el campo, sin internet.',
    badge: 'Beta',
    badgeColor: '#9ADEFF',
    href: '#',
  },
  {
    icon: '🔗',
    name: 'GeoCampo API',
    desc: 'Integrá tu ERP externo, básculas electrónicas o sistemas de SENACSA/SINIP directamente vía REST API.',
    badge: 'Enterprise',
    badgeColor: '#FFB444',
    href: 'mailto:hola@geocampo.app',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '✏️',
    title: 'Creá tu campo',
    desc: 'Registrate, dibujá tus potreros sobre el mapa satelital y configurá tu hacienda en menos de 5 minutos.',
  },
  {
    step: '02',
    icon: '📲',
    title: 'Registrá desde el campo',
    desc: 'Usá la app móvil para registrar pesajes, vacunas y movimientos en tiempo real — con o sin internet.',
  },
  {
    step: '03',
    icon: '📊',
    title: 'Tomá mejores decisiones',
    desc: 'Visualizá alertas de sobrecarga, GPD por lote, costos por cabeza y exportá reportes PDF para tu veterinario o contador.',
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
    cta:  'Empezar gratis 14 días',
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
      'Exportar PDF / CSV',
      'Multi-usuario (5)',
      'Soporte prioritario',
    ],
    cta:  'Empezar gratis 14 días',
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
    href: 'mailto:ventas@geocampo.app',
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    name:     'Rodrigo Villalba',
    role:     'Productor, Concepción PY',
    text:     'Antes usaba cuadernos y hojas de cálculo. Con GeoCampo veo en segundos qué potrero está sobrecargado y cuántos días llevan los lotes.',
    initials: 'RV',
  },
  {
    name:     'Luciana Ferreyra',
    role:     'Administradora, Formosa AR',
    text:     'El módulo de sanidad me salvó dos veces. Las alertas de vencimiento de vacunas son exactamente lo que necesitaba.',
    initials: 'LF',
  },
  {
    name:     'Pablo Acosta',
    role:     'Capataz, Chaco PY',
    text:     'Lo uso desde el celular en el campo, sin internet. Cuando llego a la casa sincroniza solo. Muy fácil.',
    initials: 'PA',
  },
];

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 border-b border-white/10"
      style={{ backgroundColor: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(16px)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">🌿</span>
        <span className="font-bold text-xl tracking-tight" style={{ color: '#DEFF9A' }}>GeoCampo</span>
      </div>
      <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
        <a href="#products"  className="hover:text-white transition-colors">Productos</a>
        <a href="#features"  className="hover:text-white transition-colors">Funcionalidades</a>
        <a href="#how"       className="hover:text-white transition-colors">Cómo funciona</a>
        <a href="#pricing"   className="hover:text-white transition-colors">Precios</a>
      </nav>
      <div className="flex items-center gap-3">
        <a
          href={`${APP_URL}/login`}
          className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Iniciar sesión
        </a>
        <a
          href={`${APP_URL}/register`}
          className="text-sm font-bold rounded-xl px-4 py-2 transition-all hover:opacity-90"
          style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}
        >
          Empezar gratis
        </a>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-40 pb-24 px-6 text-center max-w-4xl mx-auto">
      <div
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest border rounded-full px-4 py-1.5 mb-6"
        style={{ color: 'rgba(222,255,154,0.7)', borderColor: 'rgba(222,255,154,0.2)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#DEFF9A' }} />
        Ahora disponible · Beta pública
      </div>
      <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight mb-6 text-white">
        Gestioná tu estancia{' '}
        <span style={{ color: '#DEFF9A' }}>desde el satélite</span>{' '}
        hasta la balanza
      </h1>
      <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
        GeoCampo es el sistema de gestión ganadera que combina mapa satelital interactivo,
        seguimiento de hacienda, sanidad animal y ERP completo — en una sola plataforma offline-first.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href={`${APP_URL}/setup`}
          className="rounded-2xl px-8 py-4 font-bold text-base transition-all hover:opacity-90 hover:scale-105"
          style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}
        >
          Crear mi estancia gratis →
        </a>
        <a
          href={`${APP_URL}/estancia-las-pampas`}
          className="rounded-2xl px-8 py-4 font-bold text-base border border-white/20 hover:border-white/40 text-white transition-all hover:bg-white/5"
        >
          Ver demo en vivo
        </a>
      </div>
      <p className="text-white/30 text-sm mt-6">Sin tarjeta de crédito · 14 días gratis en todos los planes</p>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function Stats() {
  return (
    <section className="py-16 border-y border-white/10" style={{ backgroundColor: '#0F0F10' }}>
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          { value: '12k+',    label: 'hectáreas gestionadas' },
          { value: '4.8k',    label: 'cabezas registradas' },
          { value: '98%',     label: 'uptime' },
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

// ─── Products ────────────────────────────────────────────────────────────────

function Products() {
  return (
    <section id="products" className="py-24 px-6 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Una plataforma, tres productos</h2>
        <p className="text-white/50 text-lg max-w-2xl mx-auto">
          Web, móvil y API — todo sincronizado en tiempo real sobre Supabase.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRODUCTS.map((p) => (
          <div
            key={p.name}
            className="rounded-2xl border border-white/10 p-6 flex flex-col hover:border-white/20 transition-colors"
            style={{ backgroundColor: '#1A1A1B' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{p.icon}</span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                style={{ backgroundColor: p.badgeColor + '20', color: p.badgeColor }}
              >
                {p.badge}
              </span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">{p.name}</h3>
            <p className="text-white/50 text-sm leading-relaxed flex-1">{p.desc}</p>
            <a
              href={p.href}
              className="mt-5 text-sm font-semibold transition-colors hover:opacity-80"
              style={{ color: p.badgeColor }}
            >
              {p.badge === 'Enterprise' ? 'Contactar →' : 'Ir al producto →'}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section id="features" className="py-24 px-6" style={{ backgroundColor: '#0F0F10' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Todo lo que necesitás, integrado</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Dejá los cuadernos. GeoCampo centraliza todo el manejo de tu campo en una sola herramienta.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-colors"
              style={{ backgroundColor: '#1A1A1B' }}
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="how" className="py-24 px-6 max-w-4xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Empezar es simple</h2>
        <p className="text-white/50 text-lg">Configurá tu campo en 5 minutos, sin instalación.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {HOW_IT_WORKS.map((s) => (
          <div key={s.step} className="flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-4"
              style={{ backgroundColor: 'rgba(222,255,154,0.08)', border: '1px solid rgba(222,255,154,0.2)' }}
            >
              {s.icon}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#DEFF9A' }}>
              Paso {s.step}
            </p>
            <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6" style={{ backgroundColor: '#0F0F10' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Precios simples y transparentes</h2>
          <p className="text-white/50 text-lg">Comenzá gratis 14 días. Sin tarjeta de crédito. Cancelá cuando quieras.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${plan.highlighted ? 'md:-mt-4 md:mb-4' : ''}`}
              style={{
                borderColor:     plan.highlighted ? 'rgba(222,255,154,0.5)' : 'rgba(255,255,255,0.1)',
                backgroundColor: plan.highlighted ? '#1A1F0A' : '#1A1A1B',
              }}
            >
              {plan.highlighted && (
                <div className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(222,255,154,0.8)' }}>
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
              <a
                href={plan.href}
                className={`text-center rounded-xl py-3 text-sm font-bold transition-all ${
                  plan.highlighted ? 'hover:opacity-90' : 'border border-white/20 hover:border-white/40 hover:bg-white/5'
                }`}
                style={plan.highlighted ? { backgroundColor: '#DEFF9A', color: '#0A0A0B' } : { color: '#fff' }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="text-center text-white/30 text-sm mt-8">
          ¿Necesitás factura? ¿Más de 5 usuarios?{' '}
          <a href="mailto:hola@geocampo.app" className="underline hover:text-white/60 transition-colors">
            Escribinos
          </a>.
        </p>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section id="testimonials" className="py-24 px-6 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Lo que dicen los productores</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#1A1A1B' }}>
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <span key={i} style={{ color: '#DEFF9A' }}>★</span>
              ))}
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: 'rgba(222,255,154,0.1)', color: '#DEFF9A' }}
              >
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
      <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
        Tu campo merece{' '}
        <span style={{ color: '#DEFF9A' }}>tecnología de punta</span>
      </h2>
      <p className="text-white/50 text-lg mb-4">
        Empezá gratis hoy. 14 días sin tarjeta. Configurá tu estancia en 5 minutos.
      </p>
      <p className="text-white/30 text-sm mb-10">Funciona en computadora, tablet y celular. Offline y en la nube.</p>
      <a
        href={`${APP_URL}/setup`}
        className="inline-block rounded-2xl px-10 py-5 font-bold text-lg transition-all hover:opacity-90 hover:scale-105"
        style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}
      >
        Crear mi estancia gratis →
      </a>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 py-12 px-6" style={{ backgroundColor: '#0A0A0B' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🌿</span>
              <span className="font-bold text-white text-lg">GeoCampo</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              Plataforma SaaS de gestión ganadera. Offline-first, multi-estancia, con IA.
            </p>
            <p className="text-white/20 text-xs mt-3">Hecho en Paraguay 🇵🇾 / Argentina 🇦🇷</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="text-white/60 font-semibold mb-3 uppercase text-xs tracking-wider">Producto</p>
              <ul className="space-y-2 text-white/40">
                <li><a href="#features" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing"  className="hover:text-white transition-colors">Precios</a></li>
                <li><a href={`${APP_URL}/estancia-las-pampas`} className="hover:text-white transition-colors">Demo en vivo</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white/60 font-semibold mb-3 uppercase text-xs tracking-wider">Empresa</p>
              <ul className="space-y-2 text-white/40">
                <li><a href="mailto:hola@geocampo.app"   className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="mailto:ventas@geocampo.app" className="hover:text-white transition-colors">Ventas</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white/60 font-semibold mb-3 uppercase text-xs tracking-wider">Legal</p>
              <ul className="space-y-2 text-white/40">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacidad</a></li>
                <li><a href="/terms"   className="hover:text-white transition-colors">Términos</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-white/30 text-xs">
          <p>© {year} GeoCampo. Todos los derechos reservados.</p>
          <p>Construido con Next.js · Supabase · Mapbox</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main style={{ backgroundColor: '#0A0A0B' }}>
      <Nav />
      <Hero />
      <Stats />
      <Products />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
