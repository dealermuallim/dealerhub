'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(fd.get('email') || ''),
          password: String(fd.get('password') || ''),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Invalid email or password.');
        setPending(false);
        return;
      }
      router.replace('/admin');
      router.refresh();
    } catch {
      setError('Unable to sign in.');
      setPending(false);
    }
  }

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? (
        <p className="adm-muted" style={{ color: '#b91c1c', margin: 0 }}>
          {error}
        </p>
      ) : null}
      <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}