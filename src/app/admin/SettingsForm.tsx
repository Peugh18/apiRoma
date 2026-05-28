'use client'

import { useActionState } from 'react';
import { saveSettings } from './actions';

export default function SettingsForm({ initialData }: { initialData: any }) {
  const [state, formAction, isPending] = useActionState(saveSettings, null);

  return (
    <form action={formAction} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-emerald-400">Configuraciones del Sistema</h2>
        {state?.success && <span className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-md">{state.success}</span>}
        {state?.error && <span className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-md">{state.error}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Token de Verificación (Webhook)</label>
          <input name="whatsapp_verify_token" defaultValue={initialData?.whatsapp_verify_token} required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-zinc-300" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Número de Teléfono</label>
          <input name="meta_phone_number" defaultValue={initialData?.meta_phone_number} required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-zinc-300" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">ID de Teléfono</label>
          <input name="meta_phone_id" defaultValue={initialData?.meta_phone_id} required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-zinc-300" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">ID de Cuenta de WhatsApp Business</label>
          <input name="meta_business_account_id" defaultValue={initialData?.meta_business_account_id} required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-zinc-300" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">ID de Aplicación</label>
          <input name="meta_app_id" defaultValue={initialData?.meta_app_id} required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-zinc-300" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Token de Acceso de Meta</label>
          <input name="meta_access_token" type="password" defaultValue={initialData?.meta_access_token} required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-zinc-300 font-mono" />
        </div>
      </div>

      <div className="pt-4 flex justify-end border-t border-zinc-800 mt-6">
        <button 
          type="submit" 
          disabled={isPending}
          className="mt-4 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
        >
          {isPending ? 'Guardando...' : 'Guardar Configuraciones'}
        </button>
      </div>
    </form>
  );
}
