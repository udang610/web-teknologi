'use server';

import postgres from 'postgres';
import bcrypt from 'bcrypt';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

function getSql() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('Variabel POSTGRES_URL tidak ditemukan di Environment Variables Vercel.');
  }
  return postgres(url, {
    ssl: 'require',
    connect_timeout: 10,
  });
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return 'Silakan masukkan email dan kata sandi.';
  }

  try {
    const sql = getSql();
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    const user = users[0];

    if (!user) {
      return 'Email atau kata sandi tidak ditemukan.';
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return 'Kata sandi yang Anda masukkan salah.';
    }

    const cookieStore = await cookies();
    cookieStore.set('session_user', user.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch (error: any) {
    console.error('Auth error:', error);
    return `Gagal terhubung ke database: ${error?.message || error}`;
  }

  redirect('/dashboard');
}

export async function logOut() {
  const cookieStore = await cookies();
  cookieStore.delete('session_user');
  redirect('/');
}
