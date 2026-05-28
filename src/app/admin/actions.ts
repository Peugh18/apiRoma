'use server'

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function saveSettings(prevState: any, formData: FormData) {
  const settings = {
    id: 1,
    meta_phone_number: formData.get('meta_phone_number') as string,
    meta_phone_id: formData.get('meta_phone_id') as string,
    meta_business_account_id: formData.get('meta_business_account_id') as string,
    meta_app_id: formData.get('meta_app_id') as string,
    meta_access_token: formData.get('meta_access_token') as string,
    whatsapp_verify_token: formData.get('whatsapp_verify_token') as string,
  };

  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert(settings);

  if (error) {
    console.error('Error saving settings:', error);
    return { error: 'Error al actualizar las configuraciones.' };
  }

  revalidatePath('/admin');
  return { success: '¡Configuraciones guardadas exitosamente!' };
}

export async function getRecentLogs() {
  const { data, error } = await supabaseAdmin
    .from('chat_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('Error fetching logs:', error);
    return [];
  }
  return data || [];
}
