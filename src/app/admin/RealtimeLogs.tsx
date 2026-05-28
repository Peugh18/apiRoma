'use client'

import { useEffect, useState } from 'react';
import { getRecentLogs } from './actions';

export default function RealtimeLogs({ initialLogs }: { initialLogs: any[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Poll the server action every 3 seconds
    const intervalId = setInterval(async () => {
      try {
        setIsRefreshing(true);
        const latestLogs = await getRecentLogs();
        setLogs(latestLogs);
      } catch (error) {
        console.error('Error fetching realtime logs:', error);
      } finally {
        setIsRefreshing(false);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <h2 className="text-xl font-semibold text-emerald-400">Mensajes Recientes</h2>
        <div className="flex items-center gap-2">
          {isRefreshing && <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>}
          <span className="text-xs text-zinc-500">En vivo</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/50 text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Hora</th>
              <th className="px-6 py-3 font-medium">Dirección</th>
              <th className="px-6 py-3 font-medium">Teléfono</th>
              <th className="px-6 py-3 font-medium">Mensaje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {logs.length > 0 ? logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                <td className="px-6 py-4 text-zinc-300 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                    log.direction === 'inbound' 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {log.direction === 'inbound' ? 'Entrante' : 'Saliente'}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-300 whitespace-nowrap">{log.sender_phone}</td>
                <td className="px-6 py-4 text-zinc-300">{log.message_body}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                  No hay mensajes registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
