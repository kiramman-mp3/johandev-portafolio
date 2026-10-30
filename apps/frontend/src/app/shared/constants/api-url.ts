/**
 * URL base del backend para llamadas a la API.
 * 
 * Modos de resolución:
 * 1. Configuración dinámica en runtime: window.__API_URL__ o localStorage.getItem('api_url')
 * 2. Desarrollo local (localhost / 127.0.0.1 / IPs privadas):
 *    - Apunta por defecto a http://<host actual>:4000 (backend Express local, también desde la red local)
 *    - Si deseas probar el backend remoto en local: localStorage.setItem('use_remote_api', 'true')
 * 3. Despliegue unificado en Vercel (Frontend + Backend en un solo dominio):
 *    - Detecta automáticamente *.vercel.app o dominio personalizado en producción
 *      y consume `${window.location.origin}/api` (mismo origen, sin CORS ni latencia externa).
 * 4. Fallback: DEFAULT_REMOTE_API
 */

export const DEFAULT_REMOTE_API = 'https://personalportafolio-production.up.railway.app';

export function getBaseApiUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Configuración dinámica en runtime (inyectada en window o guardada en localStorage)
    const customApi = (window as any).__API_URL__ || localStorage.getItem('api_url');
    if (customApi) {
      return customApi.replace(/\/$/, '');
    }

    const hostname = window.location.hostname;

    // 2. Desarrollo local (localhost / 127.0.0.1 / IPs privadas de red local)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      if (localStorage.getItem('use_remote_api') === 'true') {
        return DEFAULT_REMOTE_API;
      }
      // Mismo host que el frontend: así un móvil en la red local llega a la API del PC
      return `http://${hostname}:4000`;
    }

    // 3. Despliegue unificado en Vercel (mismo dominio *.vercel.app o dominio personalizado)
    return `${window.location.origin}/api`;
  }

  // Fallback para SSR o producción externa
  return DEFAULT_REMOTE_API;
}
