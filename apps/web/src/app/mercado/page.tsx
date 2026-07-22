'use client';

/**
 * /mercado — Market Intelligence Dashboard
 *
 * Real-time data fetched client-side (no API keys required):
 *   - 7-day weather forecast: Open-Meteo API (free, CORS-enabled)
 *   - Currency rates USD → PYG / ARS / BRL: Frankfurter API (free)
 *   - ARS dollar variants (oficial, blue, MEP, tarjeta):
 *       ArgentinaDatos API (free, community-maintained)
 *   - Cattle market categories with links to official price sources
 *
 * Farm coordinates from FarmDataContext.DEMO_FARM.location
 * are used to geolocalise the weather forecast automatically.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFarmData } from '@/lib/FarmDataContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayForecast {
  date:     string;        // YYYY-MM-DD
  code:     number;        // WMO weather code
  tMax:     number;
  tMin:     number;
  precip:   number;        // mm
}

interface FxRates {
  PYG: number | null;
  ARS: number | null;
  BRL: number | null;
}

interface ArsDollar {
  casa:  string;
  nombre: string;
  compra: number | null;
  venta:  number | null;
}

// ─── WMO weather code helpers ─────────────────────────────────────────────────

function wmoInfo(code: number): { label: string; icon: string; rain: boolean } {
  if (code === 0)               return { label: 'Despejado',    icon: '☀️',  rain: false };
  if (code <= 2)                return { label: 'Mayorm. desp.', icon: '🌤',  rain: false };
  if (code === 3)               return { label: 'Nublado',      icon: '☁️',  rain: false };
  if (code <= 48)               return { label: 'Neblina',      icon: '🌫',  rain: false };
  if (code <= 55)               return { label: 'Llovizna',     icon: '🌦',  rain: true  };
  if (code <= 67)               return { label: 'Lluvia',       icon: '🌧',  rain: true  };
  if (code <= 77)               return { label: 'Nieve',        icon: '❄️',  rain: true  };
  if (code <= 82)               return { label: 'Chubascos',    icon: '🌦',  rain: true  };
  return                               { label: 'Tormenta',     icon: '⛈',  rain: true  };
}

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function dayLabel(dateStr: string, i: number): string {
  if (i === 0) return 'Hoy';
  if (i === 1) return 'Mañana';
  const d = new Date(dateStr + 'T12:00:00');
  return DAYS_ES[d.getDay()];
}

// ─── Cattle categories ────────────────────────────────────────────────────────

const CATTLE_CATEGORIES = [
  { key: 'ternero',   label: 'Ternero/a',        desc: 'Destete, < 1 año' },
  { key: 'novillo',   label: 'Novillo',           desc: '1-3 años, engorde' },
  { key: 'vaquillona',label: 'Vaquillona',        desc: 'Hembra joven, cría' },
  { key: 'gordo_m',   label: 'Novillo gordo',     desc: 'Listo para faena' },
  { key: 'gordo_f',   label: 'Vaca gorda',        desc: 'Lista para faena' },
  { key: 'cria',      label: 'Vaca de cría',      desc: 'Reproductora' },
  { key: 'toro',      label: 'Toro',              desc: 'Reproductor' },
  { key: 'descarte',  label: 'Vaca de descarte',  desc: 'Salida de rodeo' },
];

const MARKET_LINKS = [
  { country: '🇵🇾 Paraguay', name: 'BVAP',    url: 'https://www.bvap.com.py' },
  { country: '🇦🇷 Argentina', name: 'Liniers', url: 'https://www.mercadodeliniers.com.ar' },
  { country: '🇧🇷 Brasil',    name: 'CEPEA',   url: 'https://www.cepea.esalq.usp.br/br/indicador/boi-gordo.aspx' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MercadoPage() {
  const { DEMO_FARM, farmSlug } = useFarmData();
  const [lon, lat] = DEMO_FARM.location;   // [lng, lat] from data.ts

  const [weather,      setWeather]      = useState<DayForecast[] | null>(null);
  const [weatherErr,   setWeatherErr]   = useState(false);
  const [fx,           setFx]           = useState<FxRates | null>(null);
  const [fxErr,        setFxErr]        = useState(false);
  const [arsDollars,   setArsDollars]   = useState<ArsDollar[] | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    void (async () => {
      // ── Weather ────────────────────────────────────────────────
      try {
        const url = `https://api.open-meteo.com/v1/forecast`
          + `?latitude=${lat}&longitude=${lon}`
          + `&daily=weathercode,precipitation_sum,temperature_2m_max,temperature_2m_min`
          + `&timezone=auto&forecast_days=7`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('weather');
        const json = await res.json() as {
          daily: {
            time: string[];
            weathercode: number[];
            precipitation_sum: number[];
            temperature_2m_max: number[];
            temperature_2m_min: number[];
          };
        };
        const days: DayForecast[] = json.daily.time.map((date, i) => ({
          date,
          code:    json.daily.weathercode[i],
          tMax:    Math.round(json.daily.temperature_2m_max[i]),
          tMin:    Math.round(json.daily.temperature_2m_min[i]),
          precip:  Math.round(json.daily.precipitation_sum[i] * 10) / 10,
        }));
        setWeather(days);
      } catch {
        setWeatherErr(true);
      }

      // ── FX rates ───────────────────────────────────────────────
      try {
        const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=PYG,ARS,BRL');
        if (!res.ok) throw new Error('fx');
        const json = await res.json() as { rates: Record<string, number> };
        setFx({ PYG: json.rates.PYG ?? null, ARS: json.rates.ARS ?? null, BRL: json.rates.BRL ?? null });
      } catch {
        setFxErr(true);
      }

      // ── ARS dollar variants ────────────────────────────────────
      try {
        const res = await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolares');
        if (res.ok) {
          const json = await res.json() as ArsDollar[];
          // Keep only the most relevant types
          const KEEP = ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'tarjeta'];
          setArsDollars(json.filter((d) => KEEP.includes(d.casa?.toLowerCase())).slice(0, 6));
        }
      } catch {
        // non-critical — FX section still shows Frankfurter data
      }

      setLoading(false);
    })();
  }, [lat, lon]);

  const backHref = farmSlug ? `/${farmSlug}` : '/';

  return (
    <div className="min-h-screen bg-charcoal text-white">

      {/* Header */}
      <div className="border-b border-surface2 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={backHref} className="text-muted hover:text-white transition-colors text-sm">← Campo</Link>
          <h1 className="text-lg font-bold">🌤 Mercado & Clima</h1>
        </div>
        <p className="text-muted text-xs">{DEMO_FARM.name}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <span className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

          {/* ── Weather ──────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              Pronóstico 7 días
              <span className="text-muted/50 font-normal ml-2 normal-case">
                · {lat.toFixed(2)}, {lon.toFixed(2)}
              </span>
            </h2>

            {weatherErr ? (
              <p className="text-muted text-sm">No se pudo cargar el pronóstico. Verificá tu conexión.</p>
            ) : weather ? (
              <div className="grid grid-cols-7 gap-2">
                {weather.map((day, i) => {
                  const info = wmoInfo(day.code);
                  return (
                    <div
                      key={day.date}
                      className={`rounded-2xl border px-3 py-4 flex flex-col items-center gap-2 ${
                        i === 0 ? 'border-lime/30 bg-lime/5' : 'border-surface2'
                      }`}
                      style={i !== 0 ? { backgroundColor: '#111112' } : undefined}
                    >
                      <p className="text-white text-xs font-semibold">{dayLabel(day.date, i)}</p>
                      <span className="text-2xl" title={info.label}>{info.icon}</span>
                      <p className={`text-xs font-medium ${info.rain ? 'text-blue-300' : 'text-muted'}`}>
                        {info.label}
                      </p>
                      <div className="text-center">
                        <p className="text-white text-sm font-bold">{day.tMax}°</p>
                        <p className="text-muted text-xs">{day.tMin}°</p>
                      </div>
                      {day.precip > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-blue-300 text-xs">💧</span>
                          <span className="text-blue-300 text-xs">{day.precip} mm</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>

          {/* ── Currency ─────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              Tipo de cambio — 1 USD
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FxCard
                flag="🇵🇾" currency="PYG" label="Guaraní"
                value={fx?.PYG ?? null} error={fxErr}
                format={(v) => v.toLocaleString('es-PY', { maximumFractionDigits: 0 })}
              />
              <FxCard
                flag="🇦🇷" currency="ARS" label="Peso argentino (oficial)"
                value={fx?.ARS ?? null} error={fxErr}
                format={(v) => v.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
              />
              <FxCard
                flag="🇧🇷" currency="BRL" label="Real brasileño"
                value={fx?.BRL ?? null} error={fxErr}
                format={(v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              />
            </div>

            {/* ARS dollar types */}
            {arsDollars && arsDollars.length > 0 && (
              <div className="mt-4 rounded-2xl border border-surface2 overflow-hidden" style={{ backgroundColor: '#111112' }}>
                <p className="text-muted text-xs uppercase tracking-wider px-5 py-3 border-b border-surface2">
                  🇦🇷 Dólar en Argentina — variantes
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3">
                  {arsDollars.map((d) => (
                    <div key={d.casa} className="px-5 py-3 border-b border-r border-surface2 last:border-r-0">
                      <p className="text-muted text-xs capitalize mb-0.5">{d.nombre ?? d.casa}</p>
                      <p className="text-white font-bold text-sm">
                        {d.venta != null
                          ? `$ ${d.venta.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
                          : '—'}
                        <span className="text-muted text-xs font-normal ml-1">venta</span>
                      </p>
                      {d.compra != null && (
                        <p className="text-muted text-xs">
                          $ {d.compra.toLocaleString('es-AR', { maximumFractionDigits: 2 })} compra
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-muted text-xs mt-3">
              Fuentes: <a href="https://frankfurter.app" target="_blank" rel="noopener" className="text-lime/60 hover:text-lime">Frankfurter</a>
              {arsDollars && (
                <> · <a href="https://argentinadatos.com" target="_blank" rel="noopener" className="text-lime/60 hover:text-lime">ArgentinaDatos</a></>
              )}
              {' '}— Tasas orientativas, actualizadas al cargar la página.
            </p>
          </section>

          {/* ── Cattle market ────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-1">
              Categorías de hacienda
            </h2>
            <p className="text-muted text-xs mb-4">
              Consultá los precios del día en los mercados oficiales ↓
            </p>

            <div className="rounded-2xl border border-surface2 overflow-hidden" style={{ backgroundColor: '#111112' }}>
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 px-5 py-2.5 border-b border-surface2 bg-surface2/30">
                <p className="col-span-4 text-muted text-xs uppercase tracking-wider">Categoría</p>
                <p className="col-span-5 text-muted text-xs uppercase tracking-wider">Descripción</p>
                <p className="col-span-3 text-muted text-xs uppercase tracking-wider text-right">Ref. precio</p>
              </div>
              {CATTLE_CATEGORIES.map((cat, i) => (
                <div
                  key={cat.key}
                  className={`grid grid-cols-12 gap-2 px-5 py-3 items-center ${
                    i < CATTLE_CATEGORIES.length - 1 ? 'border-b border-surface2' : ''
                  }`}
                >
                  <p className="col-span-4 text-white text-sm font-medium">{cat.label}</p>
                  <p className="col-span-5 text-muted text-xs">{cat.desc}</p>
                  <div className="col-span-3 text-right">
                    <a
                      href={MARKET_LINKS[0].url}
                      target="_blank"
                      rel="noopener"
                      className="text-lime/60 hover:text-lime text-xs transition-colors"
                    >
                      Ver precio →
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Market source links */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MARKET_LINKS.map((m) => (
                <a
                  key={m.url}
                  href={m.url}
                  target="_blank"
                  rel="noopener"
                  className="rounded-xl border border-surface2 px-4 py-3 flex items-center gap-3 hover:border-lime/30 transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <span className="text-xl">{m.country.split(' ')[0]}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{m.name}</p>
                    <p className="text-muted text-xs">{m.country.split(' ').slice(1).join(' ')} · Mercado oficial</p>
                  </div>
                </a>
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FxCard({
  flag, currency, label, value, error, format,
}: {
  flag: string; currency: string; label: string;
  value: number | null; error: boolean;
  format: (v: number) => string;
}) {
  return (
    <div className="rounded-2xl border border-surface2 px-5 py-4" style={{ backgroundColor: '#111112' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{flag}</span>
        <div>
          <p className="text-white font-bold text-sm leading-none">{currency}</p>
          <p className="text-muted text-xs">{label}</p>
        </div>
      </div>
      {error ? (
        <p className="text-muted text-sm">Sin conexión</p>
      ) : value != null ? (
        <p className="text-lime font-black text-2xl leading-none">{format(value)}</p>
      ) : (
        <p className="text-muted text-sm">Cargando…</p>
      )}
    </div>
  );
}
