'use server'

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(prevState: any, formData: FormData) {
  const username = formData.get('username');
  const password = formData.get('password');

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set('auth_token', 'roma_admin_logged_in', { httpOnly: true, path: '/' });
  } else {
    return { error: 'Credenciales inválidas' };
  }
  
  redirect('/admin');
}
