import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BasketballIcon } from '../icons/Sports';

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'register') await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      // AuthProvider flips to the app automatically once user is set.
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setBusy(false);
    }
  };

  const inputCls =
    'w-full border rounded-field px-3.5 py-3 bg-surface text-[14px] font-semibold outline-none placeholder:text-faint placeholder:font-normal focus:border-green';

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 max-w-md mx-auto">
      <div className="flex flex-col items-center mb-8">
        <span className="w-16 h-16 rounded-[20px] bg-green flex items-center justify-center">
          <BasketballIcon size={32} className="text-white" />
        </span>
        <h1 className="text-[28px] font-extrabold mt-4">Pick Up</h1>
        <p className="text-[14px] text-muted mt-1 text-center">
          Find a pickup game near you — and actually show up.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === 'register' && (
          <input
            className={inputCls}
            style={{ borderWidth: 1.5, borderColor: '#e4eae4' }}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        )}
        <input
          className={inputCls}
          style={{ borderWidth: 1.5, borderColor: '#e4eae4' }}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className={inputCls}
          style={{ borderWidth: 1.5, borderColor: '#e4eae4' }}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          required
        />

        {error && <p className="text-[13px] text-[#a23b34] font-semibold">{error}</p>}

        <button className="btn-primary mt-1" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
        className="text-[13.5px] text-muted mt-5 font-semibold"
      >
        {mode === 'login' ? (
          <>New here? <span className="text-green font-bold">Create an account</span></>
        ) : (
          <>Already have an account? <span className="text-green font-bold">Sign in</span></>
        )}
      </button>

      {mode === 'login' && (
        <p className="text-[12px] text-faint text-center mt-6">
          Try the demo: <span className="font-semibold">mia@demo.app</span> / <span className="font-semibold">pickup123</span>
        </p>
      )}
    </div>
  );
};
