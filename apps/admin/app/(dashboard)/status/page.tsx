'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Database, Server, Globe, MonitorCheck, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Clock, HardDrive,
} from 'lucide-react';
import clsx from 'clsx';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface BackendHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: 'up' | 'down'; latencyMs?: number };
    memory: { status: 'ok' | 'warning'; heapUsedMB: number; heapTotalMB: number; rssMB: number };
  };
}

interface ServiceCheck {
  name: string;
  url: string;
  status: 'up' | 'down';
  latencyMs: number;
  data?: BackendHealth | Record<string, unknown> | null;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceCheck[];
}

interface ServiceStatus {
  name: string;
  url: string;
  status: 'loading' | 'healthy' | 'degraded' | 'unhealthy' | 'unreachable';
  latencyMs?: number;
  data?: BackendHealth | Record<string, unknown> | null;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const statusConfig = {
  loading:     { icon: RefreshCw,      color: 'text-gray-400',  bg: 'bg-gray-50',   label: 'Checking...' },
  healthy:     { icon: CheckCircle2,   color: 'text-green-600', bg: 'bg-green-50',   label: 'Healthy' },
  degraded:    { icon: AlertTriangle,  color: 'text-amber-600', bg: 'bg-amber-50',   label: 'Degraded' },
  unhealthy:   { icon: XCircle,        color: 'text-red-600',   bg: 'bg-red-50',     label: 'Unhealthy' },
  unreachable: { icon: XCircle,        color: 'text-red-600',   bg: 'bg-red-50',     label: 'Unreachable' },
};

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Backend API', url: '', status: 'loading' },
    { name: 'Website', url: '', status: 'loading' },
    { name: 'Admin Dashboard', url: '', status: 'loading' },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const checkAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const data: HealthResponse = await res.json();

      const results: ServiceStatus[] = data.services.map((svc) => ({
        name: svc.name,
        url: svc.url,
        status: svc.status === 'up' ? 'healthy' : 'unreachable',
        latencyMs: svc.latencyMs,
        data: svc.data,
      }));

      setServices(results);
    } catch {
      // If the health endpoint itself fails, mark everything as unreachable
      setServices((prev) => prev.map((s) => ({ ...s, status: 'unreachable' as const })));
    }
    setLastChecked(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    checkAll();
    const interval = setInterval(checkAll, 30000);
    return () => clearInterval(interval);
  }, [checkAll]);

  const overallStatus = services.some((s) => s.status === 'loading')
    ? 'loading'
    : services.every((s) => s.status === 'healthy')
      ? 'healthy'
      : services.some((s) => s.status === 'unhealthy' || s.status === 'unreachable')
        ? 'unhealthy'
        : 'degraded';

  const overall = statusConfig[overallStatus];
  const OverallIcon = overall.icon;

  const backendData = services[0]?.data as BackendHealth | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Status</h1>
          <p className="text-gray-500 mt-1 text-sm">Real-time health of all Origin platform services.</p>
        </div>
        <button
          onClick={checkAll}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Overall status banner */}
      <div className={clsx('rounded-xl border p-5 flex items-center gap-4', overall.bg,
        overallStatus === 'healthy' ? 'border-green-200' :
        overallStatus === 'degraded' ? 'border-amber-200' :
        overallStatus === 'unhealthy' ? 'border-red-200' :
        'border-gray-200'
      )}>
        <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center', overall.bg)}>
          <OverallIcon size={24} className={clsx(overall.color, overallStatus === 'loading' && 'animate-spin')} />
        </div>
        <div>
          <div className={clsx('text-lg font-bold', overall.color)}>{overall.label}</div>
          <div className="text-sm text-gray-500">
            {overallStatus === 'healthy'
              ? 'All systems operational'
              : overallStatus === 'degraded'
                ? 'Some services are experiencing issues'
                : overallStatus === 'unhealthy'
                  ? 'Critical services are down'
                  : 'Checking service status...'}
          </div>
        </div>
        {lastChecked && (
          <div className="ml-auto text-xs text-gray-400">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {services.map((svc) => {
          const cfg = statusConfig[svc.status];
          const Icon = cfg.icon;
          return (
            <div key={svc.name} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', cfg.bg)}>
                    {svc.name === 'Backend API' ? <Server size={20} className={cfg.color} /> :
                     svc.name === 'Website' ? <Globe size={20} className={cfg.color} /> :
                     <MonitorCheck size={20} className={cfg.color} />}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{svc.name}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[180px]">{svc.url}</div>
                  </div>
                </div>
                <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                  <Icon size={12} className={svc.status === 'loading' ? 'animate-spin' : ''} />
                  {cfg.label}
                </span>
              </div>
              {svc.latencyMs !== undefined && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={12} />
                  Response: {svc.latencyMs}ms
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Backend details */}
      {backendData?.checks && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Database */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center',
                backendData.checks.database.status === 'up' ? 'bg-green-50' : 'bg-red-50'
              )}>
                <Database size={20} className={backendData.checks.database.status === 'up' ? 'text-green-600' : 'text-red-600'} />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">PostgreSQL Database</div>
                <div className="text-xs text-gray-400">Supabase</div>
              </div>
              <span className={clsx('ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                backendData.checks.database.status === 'up'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-600'
              )}>
                {backendData.checks.database.status === 'up' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {backendData.checks.database.status === 'up' ? 'Connected' : 'Down'}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              {backendData.checks.database.latencyMs !== undefined && (
                <div className="flex justify-between text-gray-500">
                  <span>Query latency</span>
                  <span className="font-mono text-gray-900">{backendData.checks.database.latencyMs}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Memory & Uptime */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center',
                backendData.checks.memory.status === 'ok' ? 'bg-blue-50' : 'bg-amber-50'
              )}>
                <HardDrive size={20} className={backendData.checks.memory.status === 'ok' ? 'text-blue-600' : 'text-amber-600'} />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Server Resources</div>
                <div className="text-xs text-gray-400">v{backendData.version}</div>
              </div>
              <span className={clsx('ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                backendData.checks.memory.status === 'ok'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-amber-50 text-amber-600'
              )}>
                <Activity size={12} />
                {backendData.checks.memory.status === 'ok' ? 'Normal' : 'High Memory'}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Uptime</span>
                <span className="font-mono text-gray-900">{formatUptime(backendData.uptime)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Heap used</span>
                <span className="font-mono text-gray-900">{backendData.checks.memory.heapUsedMB} MB</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Heap total</span>
                <span className="font-mono text-gray-900">{backendData.checks.memory.heapTotalMB} MB</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>RSS</span>
                <span className="font-mono text-gray-900">{backendData.checks.memory.rssMB} MB</span>
              </div>
              {/* Memory bar */}
              <div className="mt-2">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all',
                      backendData.checks.memory.status === 'ok' ? 'bg-blue-500' : 'bg-amber-500'
                    )}
                    style={{ width: `${Math.min(100, (backendData.checks.memory.heapUsedMB / backendData.checks.memory.heapTotalMB) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>{backendData.checks.memory.heapUsedMB} MB used</span>
                  <span>{backendData.checks.memory.heapTotalMB} MB allocated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-refresh notice */}
      <div className="text-center text-xs text-gray-400 pb-4">
        Auto-refreshes every 30 seconds
      </div>
    </div>
  );
}
