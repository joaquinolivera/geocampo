# 04 - Master Technical Architecture (GeoCampo)

## 1. Stack Tecnológico

Frontend: Expo (React Native + Web). Backend: Supabase (PostGIS). Sync: PowerSync (Offline-first).

## 2. Manifiesto del Proyecto (Normas de Karpaty)

- El código es una deuda: usar librerías estándar.

- Datos primero: PostGIS y GeoJSON son la base.

- TDD: Test-driven development obligatorio.

- Feedback corto: Debugging sistemático en desarrollo.

## 3. Infraestructura

Configuración de servicios: Sentinel Hub (Satélites), Mapbox (GIS) y Sentry (Monitoreo).