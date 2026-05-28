import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SettingsForm from './SettingsForm';
import RealtimeLogs from './RealtimeLogs';
import { getRecentLogs } from './actions';

async function getSettings() {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();
  
  console.log('Settings fetched from DB:', JSON.stringify(data, null, 2));
  
  if (error) {
    console.error('Error fetching settings:', error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  if (cookieStore.get('auth_token')?.value !== 'roma_admin_logged_in') {
    redirect('/login');
  }

  const logs = await getRecentLogs();
  const { data: settings, error: settingsError } = await getSettings();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Panel de Control</h1>
            <p className="text-zinc-400 mt-1">Gestiona la configuración de tu bot de WhatsApp y visualiza los mensajes.</p>
          </div>
          <div>
             <a href="/" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-sm font-medium">
               Ir al Sitio
             </a>
          </div>
        </header>

        {settings ? (
          <SettingsForm initialData={settings} />
        ) : (
          <div className="bg-zinc-900/50 border border-yellow-500/20 p-6 rounded-xl text-yellow-500 text-sm">
            <strong>Alerta de Base de Datos:</strong> {settingsError ? settingsError : 'Necesitas ejecutar el script `supabase/settings_update.sql` en tu editor SQL de Supabase para crear la tabla `app_settings`.'}
          </div>
        )}

        {/* Realtime Logs Table */}
        <RealtimeLogs initialLogs={logs} />

      </div>
    </div>
  );
}
