import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { FiRefreshCw, FiClock, FiWifi, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
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
      const refreshMs = Math.max(data.expiresIn * 1000 - TOKEN_REFRESH_BUFFER_MS, 5000);
      setNextRefresh(Date.now() + refreshMs);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(fetchToken, refreshMs);
    } catch (e) {
      logger.error('Error obteniendo token del lector', e);
      setError(e.message);
      setToken('');
      setNextRefresh(null);
      refreshTimer.current = setTimeout(fetchToken, 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
    return () => {
      setToken('');
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remainingSeconds = useMemo(() => {
    if (!nextRefresh) return null;
    const diff = Math.max(nextRefresh - Date.now(), 0);
    return Math.ceil(diff / 1000);
  }, [nextRefresh, token]);

  const connectionOk = !error && !!token;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white px-6 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <img
              src="/assets/informaticauaint-logo.png"
              alt="Informática UAI"
              className="h-12 w-12 rounded-lg border border-white/20 bg-white"
            />
            <div>
              <p className="text-sm text-white/70 uppercase tracking-wide">QR Lector Laboratorio</p>
              <h1 className="text-2xl font-bold text-white">Universidad Adolfo Ibáñez - Informática UAI</h1>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 ${
            connectionOk ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'
          }`}>
            {connectionOk ? <FiCheckCircle /> : <FiAlertTriangle />}
            {connectionOk ? 'Conectado' : 'Sin conexión'}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* QR dinámico */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <FiClock className="text-indigo-300" />
                QR Dinámico de Acceso
              </div>
              {stationId && (
                <span className="text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full">
                  Estación: {stationId}
                </span>
              )}
            </div>

            <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-6 flex flex-col lg:flex-row items-center gap-6">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                {loading && !token && <p className="text-slate-500 w-72 h-72 flex items-center justify-center">Generando...</p>}
                {token && <QRCode value={token} size={260} fgColor="#0f172a" />}
              </div>

              <div className="flex-1 w-full space-y-3">
                {error && (
                  <div className="flex items-center gap-2 text-amber-200 bg-amber-900/40 border border-amber-700 rounded-lg px-4 py-2">
                    <FiAlertTriangle />
                    <span>{error}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <FiClock />
                  <span>{remainingSeconds ? `Se renueva en ${remainingSeconds}s` : `Expira en ${expiresIn}s`}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={fetchToken}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
                  >
                    <FiRefreshCw />
                    Refrescar ahora
                  </button>
                </div>
                <p className="text-sm text-white/60">
                  Muestra este código en la estación para que el usuario lo escanee con la app HorariosLabInf.
                </p>
              </div>
            </div>
          </section>

          {/* Panel derecho */}
          <div className="flex flex-col gap-4">
            {/* Estado */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <FiWifi className="text-green-300" />
                  Estado del Sistema
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Backend:</span>
                  <span className={connectionOk ? 'text-green-300 font-semibold' : 'text-red-300 font-semibold'}>
                    {connectionOk ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">QR dinámico:</span>
                  <span className={token ? 'text-green-300 font-semibold' : 'text-red-300 font-semibold'}>
                    {token ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Expira/renueva:</span>
                  <span className="text-indigo-200 font-semibold">
                    {remainingSeconds ? `${remainingSeconds}s` : `${expiresIn}s`}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Horarios */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 shadow-lg text-center">
              <h3 className="text-md font-semibold mb-3">Genera tu QR</h3>
              <div className="bg-white p-2 rounded-lg inline-block">
                <img
                  src="/assets/qr-acceso.png"
                  alt="QR HorariosLabInf"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <p className="text-xs text-white/70 mt-2">acceso.informaticauaint.com</p>
            </div>

            {/* QR Discord */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 shadow-lg text-center">
              <h3 className="text-md font-semibold mb-3">Únete a Discord</h3>
              <div className="bg-white p-2 rounded-lg inline-block">
                <img
                  src="/assets/qr-discord.png"
                  alt="QR Discord Informática UAI"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <p className="text-xs text-white/70 mt-2">Comunidad Informática UAI</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
