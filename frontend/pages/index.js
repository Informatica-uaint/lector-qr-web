import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import {
  FiRefreshCw,
  FiClock,
  FiWifi,
  FiCheckCircle,
  FiAlertTriangle,
  FiChevronDown,
  FiUsers
} from 'react-icons/fi';
import logger from '../utils/clientLogger';

const FALLBACK_API =
  process.env.NODE_ENV === 'production'
    ? 'https://api.lector.lab.informaticauaint.com/api'
    : 'http://localhost:3001/api';

const READER_LANDING_URL =
  process.env.NEXT_PUBLIC_READER_LANDING_URL || 'https://acceso.informaticauaint.com';

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
  const [assistantsCount, setAssistantsCount] = useState(null);
  const [assistantsConnected, setAssistantsConnected] = useState(false);
  const [systemPanelOpen, setSystemPanelOpen] = useState(false);
  const refreshTimer = useRef(null);
  const assistantsTimer = useRef(null);

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

  const fetchAssistantsStatus = async () => {
    try {
      const response = await fetch(`${apiBase}/door/assistants-status`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo obtener estado de ayudantes');
      }
      setAssistantsCount(typeof data.count === 'number' ? data.count : 0);
      setAssistantsConnected(true);
    } catch (e) {
      logger.error('Error obteniendo ayudantes presentes', e);
      setAssistantsConnected(false);
      setAssistantsCount(null);
    }
  };

  useEffect(() => {
    fetchToken();
    fetchAssistantsStatus();
    assistantsTimer.current = setInterval(fetchAssistantsStatus, 20000);
    return () => {
      setToken('');
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (assistantsTimer.current) clearInterval(assistantsTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remainingSeconds = useMemo(() => {
    if (!nextRefresh) return null;
    const diff = Math.max(nextRefresh - Date.now(), 0);
    return Math.ceil(diff / 1000);
  }, [nextRefresh, token]);

  const connectionOk = !error && !!token;
  const safeAssistantsCount = typeof assistantsCount === 'number' ? assistantsCount : 0;
  const isOpenGreen = safeAssistantsCount >= 2;
  const isOpenYellow = safeAssistantsCount === 1;
  const StatusIcon = isOpenGreen ? FiCheckCircle : FiAlertTriangle;
  const statusBadgeClass = isOpenGreen
    ? 'bg-green-500/20 text-green-100 border border-green-500/30'
    : isOpenYellow
      ? 'bg-amber-500/20 text-amber-100 border border-amber-500/30'
      : 'bg-red-500/20 text-red-100 border border-red-500/30';
  const statusLabel = isOpenGreen ? 'Abierto' : isOpenYellow ? 'abierto' : 'Cerrado';
  const qrValue = token ? `${READER_LANDING_URL}?readerToken=${encodeURIComponent(token)}` : '';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white px-6 py-8 overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col gap-6 h-full">
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
          <div className={`px-5 py-3 rounded-xl font-semibold text-base flex items-center gap-3 shadow border ${statusBadgeClass}`}>
            <StatusIcon className="text-xl" />
            <div className="leading-tight">
              <p className="capitalize">{statusLabel}</p>
              <p className="text-xs text-white/70 font-normal">
                {assistantsConnected ? `${safeAssistantsCount} ayudante${safeAssistantsCount === 1 ? '' : 's'} dentro` : 'Sin datos de ayudantes'}
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 h-[calc(100vh-180px)]">
          {/* QR dinámico */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-xl lg:sticky lg:top-6 h-full flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <FiClock className="text-indigo-300" />
              QR Dinámico de Acceso
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {stationId && (
                <span className="text-sm text-white/80 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                  Estación lector web: {stationId}
                </span>
              )}
              <button
                onClick={fetchToken}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                <FiRefreshCw />
                Refrescar ahora
              </button>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 h-full max-h-full">
            {error && (
              <div className="flex items-center gap-2 text-amber-200 bg-amber-900/40 border border-amber-700 rounded-lg px-4 py-2">
                <FiAlertTriangle />
                <span>{error}</span>
              </div>
            )}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              {loading && !token && (
                <p className="text-slate-300 w-full h-full flex items-center justify-center text-lg">Generando...</p>
              )}
              {token && (
                <div className="w-full h-full aspect-square max-w-[calc(100vw-420px)] max-h-[calc(100vh-260px)]">
                  <QRCode
                    value={qrValue}
                    size={720}
                    fgColor="#0f172a"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Panel derecho */}
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 pb-1">
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

            {/* Estado */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 shadow-lg">
              <button
                type="button"
                onClick={() => setSystemPanelOpen(!systemPanelOpen)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <FiWifi className="text-green-300" />
                  Estado del Sistema
                </div>
                <FiChevronDown
                  className={`transition-transform duration-200 ${systemPanelOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {systemPanelOpen && (
                <div className="space-y-3 text-sm mt-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-white/80">
                      <FiUsers className="text-indigo-200" />
                      <span>Ayudantes dentro</span>
                    </div>
                    <span className="text-white font-semibold">
                      {typeof assistantsCount === 'number' ? assistantsCount : 'Sin datos'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Conectado al backend</span>
                    <span className={connectionOk ? 'text-green-300 font-semibold' : 'text-red-300 font-semibold'}>
                      {connectionOk ? 'Sí' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Expira en</span>
                    <span className="text-indigo-200 font-semibold">
                      {remainingSeconds ? `${remainingSeconds}s` : `${expiresIn}s`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
