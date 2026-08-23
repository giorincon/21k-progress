# 21K Progress

**Tu camino hacia los 21,1 km**

MVP web mobile-first para registrar, analizar y visualizar la preparación de una media maratón. Está pensado para ingreso manual rápido y para evolucionar posteriormente hacia Garmin, Strava, Apple Health, Coros, Polar, GPX y FIT.

## Qué funciona en este MVP

- Dashboard con objetivo 21,1 km, días restantes, mayor fondo, kilometraje semanal, 28 días y ritmo reciente.
- Registro de carrera y gimnasio en menos de 30 segundos.
- Edición y eliminación de actividades.
- Cálculo automático de ritmo min/km y velocidad km/h.
- Campos avanzados: FC, RPE, inclinación, desnivel, superficie, cadencia, calorías, sueño, molestias, sensación y notas.
- Registro de ejercicios de gimnasio con series, repeticiones, peso y grupo muscular.
- Kilometraje semanal y evolución histórica.
- Promedios móviles de 7, 28 y 42 días.
- Fondo semanal y progreso hacia 21,1 km.
- Evolución del ritmo con filtros por tipo.
- Carga de sesión = minutos × RPE.
- Calendario mensual.
- Distribución de entrenamiento.
- Heatmap de consistencia.
- Curva de rendimiento 1 / 3 / 5 / 10 / 15 / 21,1 km.
- Comparación automática con un entrenamiento previo de distancia similar.
- Proyección de media maratón mediante fórmula de Riegel.
- Insights automáticos basados únicamente en datos registrados.
- Modo claro / oscuro.
- Exportación CSV y JSON.
- 10 semanas de datos demo creíbles desde el primer arranque.
- Supabase Auth + PostgreSQL + RLS preparados para sincronización multidispositivo.
- GitHub Pages preparado mediante GitHub Actions.

## 1. Probarlo localmente

Necesitas Node.js 22 o superior.

```bash
npm install
npm run dev
```

Después abre `http://localhost:3000`.

Sin Supabase la aplicación funciona en **modo demo/local** y guarda cambios en `localStorage`.

## 2. Crear Supabase

Recomendado: crea un proyecto independiente llamado `21k-progress`.

En **SQL Editor** pega y ejecuta todo el archivo:

```text
supabase-schema.sql
```

El script crea:

- `runner_profiles`
- `runner_workouts`
- índices
- Row Level Security
- políticas para que cada usuario solo pueda leer/modificar sus propios datos

## 3. Configurar autenticación

En Supabase:

1. Authentication → Sign In / Providers → Email → Enabled.
2. Authentication → URL Configuration.
3. Para desarrollo local añade:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/**`
4. Para GitHub Pages, si el repositorio se llama `21k-progress`, añade:
   - `https://TU_USUARIO.github.io/21k-progress/`
   - `https://TU_USUARIO.github.io/21k-progress/**`

La aplicación usa Magic Link/OTP por correo.

## 4. Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Completa solo:

```text
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

**Nunca uses una `secret key` o `service_role` en el navegador.**

## 5. Publicar en GitHub Pages

1. Crea un repositorio público: `21k-progress`.
2. Sube todo este proyecto a la rama `main`.
3. GitHub → Settings → Secrets and variables → Actions.
4. Crea dos Repository secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. GitHub → Settings → Pages.
6. En Source selecciona **GitHub Actions**.
7. Haz un nuevo push/commit a `main`.
8. Abre Actions → `Deploy 21K Progress to GitHub Pages`.
9. Cuando termine en verde, la app estará en:

```text
https://TU_USUARIO.github.io/21k-progress/
```

El `next.config.mjs` detecta automáticamente el nombre del repositorio en GitHub Actions y configura el `basePath` correcto.

## 6. Primera sincronización

Con Supabase configurado:

1. Abre la app.
2. Introduce tu correo en el banner superior.
3. Pulsa **Enviar enlace**.
4. Abre el Magic Link recibido.
5. Registra o edita una actividad.
6. Abre la misma app en otro dispositivo e inicia sesión con el mismo correo.
7. Pulsa **Sincronizar**.

## Cálculos principales

### Ritmo

`duración en segundos / distancia km`

Ejemplo: 8 km en 48:00 → **6:00/km**.

### Velocidad

`distancia / horas`

8 km en 48 min → **10,0 km/h**.

### Carga de sesión

`minutos × RPE`

60 min × RPE 5 → **300 puntos**.

### Proyección 21,1 km

Riegel:

`T2 = T1 × (D2 / D1)^1.06`

La aplicación la presenta como **estimación**, no como garantía ni consejo médico.

## Privacidad

- Datos privados por defecto.
- RLS en Supabase.
- Sin publicación automática.
- Sin venta de datos.
- Exportación CSV y JSON local.

## Verificación realizada

Se comprobaron por prueba automatizada de funciones puras:

- 8 km / 48:00 → `6:00/km`.
- 8 km / 48:00 → `10 km/h`.
- Conversión de duración `2:06:00`.
- Riegel para 10 km en 60 min → ~`2:12:23` para 21,0975 km.
- Semana lunes–domingo: suma correcta de kilometraje.
- Transpilación sintáctica de todos los archivos TypeScript/TSX.

> En este entorno no fue posible descargar las dependencias npm para ejecutar un build completo de Next.js. El workflow incluido hace el build real en GitHub Actions al publicarlo.
