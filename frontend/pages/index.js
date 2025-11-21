import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { FiRefreshCw, FiClock, FiAlertTriangle } from 'react-icons/fi';
import logger from '../utils/clientLogger';

const FALLBACK_API =
  process.env.NODE_ENV === 'production'
    ? 'https://api.lector.lab.informaticauaint.com/api'
    : 'http://localhost:3001/api';

const TOKEN_REFRESH_BUFFER_MS = 3000;

function getBackendURL() {
  const apiBaseEnv = process.env.API_BASE_URL;
  if (apiBaseEnv) return apiBaseEnv.endsWith('/api') ? apiBaseEnv : `${apiBaseEnv}/api`;
  return FALLBACK_API;
}

export default function ReaderTokenDisplay() {
  const [token, setToken] = useState('');
  const [expiresIn, setExpiresIn] = useState(60);
  const [stationId, setStationId] = useState('');
  const [error, setError] = useState('');
  const [nextRefresh, setNextRefresh] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  const apiBase = useMemo(() => getBackendURL(), []);

  const fetchToken = async () => {
    setError('');
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/reader/token`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo generar el token');
      }
      setToken(data.token);
      setStationId(data.stationId);
      setExpiresIn(data.expiresIn);
      const refreshMs = Math.max((data.expiresIn * 1000) - TOKEN_REFRESH_BUFFER_MS, 5000);
      setNextRefresh(Date.now() + refreshMs);
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
      refreshTimer.current = setTimeout(fetchToken, refreshMs);
    } catch (e) {
      logger.error('Error obteniendo token del lector', e);
      setError(e.message);
      setToken('');
      setNextRefresh(null);
      // Reintento simple después de 5s
      refreshTimer.current = setTimeout(fetchToken, 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
    return () => {
      setToken('');
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remainingSeconds = useMemo(() => {
    if (!nextRefresh) return null;
    const diff = Math.max(nextRefresh - Date.now(), 0);
    return Math.ceil(diff / 1000);
  }, [nextRefresh, token]);

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-3xl w-full">
        <header className="text-center mb-8">
          <p className="text-sm text-slate-300 uppercase tracking-wide">Lector - QR dinámico</p>
          <h1 className="text-3xl font-semibold mt-2">Muestra este código para ingresar</h1>
          {stationId && <p className="text-sm text-slate-400 mt-1">Estación: {stationId}</p>}
        </header>

        <section className="bg-slate-800 rounded-2xl shadow-xl p-6 flex flex-col items-center gap-4">
          {loading && !token && <p className="text-slate-300">Generando código...</p>}
          {error && (
            <div className="flex items-center gap-2 text-amber-300 bg-amber-900/40 border border-amber-700 rounded-lg px-4 py-2">
              <FiAlertTriangle />
              <span>{error}</span>
            </div>
          )}
          {token && (
            <>
              <div className="bg-white p-4 rounded-xl">
                <QRCode value={token} size={280} fgColor="#0f172a" />
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <FiClock />
                <span>{remainingSeconds ? `Se renueva en ${remainingSeconds}s` : `Expira en ${expiresIn}s`}</span>
                <button
                  onClick={fetchToken}
                  className="flex items-center gap-2 text-indigo-300 hover:text-indigo-100 transition"
                  aria-label="Regenerar código"
                >
                  <FiRefreshCw />
                  Refrescar ahora
                </button>
              </div>
            </>
          )}
          {!token && !loading && !error && (
            <p className="text-slate-300">Aguardando token del backend...</p>
          )}
        </section>

        <section className="mt-6 text-center text-slate-400 text-sm">
          <p>El usuario abrirá la app móvil y escaneará este QR para validar su ingreso.</p>
        </section>
      </div>
    </main>
  );
}
