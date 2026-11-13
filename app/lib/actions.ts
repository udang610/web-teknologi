'use server';

import postgres from 'postgres';
import bcrypt from 'bcrypt';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

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
  } catch (error) {
    console.error('Auth error:', error);
    return 'Gagal terhubung ke database. Pastikan POSTGRES_URL di Vercel sudah benar.';
  }

  redirect('/dashboard');
}

export async function logOut() {
  const cookieStore = await cookies();
  cookieStore.delete('session_user');
  redirect('/');
}
