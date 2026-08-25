import React, { useState } from 'react';
import { supabase } from './supabase';
import { ShieldCheck, Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Redirigir siempre al dominio actual (Netlify o localhost)
        const redirectUrl = window.location.origin;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) throw error;

        // Si la sesión se crea inmediatamente (si confirm email está desactivado en Supabase)
        if (data.session) {
          if (onAuthSuccess) onAuthSuccess(data.session);
          return;
        }

        setSuccessMsg(
          '¡Cuenta creada exitosamente! 📧 Se ha enviado un correo de verificación. Por favor revisa tu bandeja de entrada para activar tu cuenta antes de iniciar sesión.'
        );
        setEmail('');
        setPassword('');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          if (onAuthSuccess) onAuthSuccess(data.session);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      let msg = err.message || 'Ocurrió un error inesperado.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Correo o contraseña incorrectos.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Por favor verifica tu correo electrónico antes de ingresar.';
      } else if (msg.includes('User already registered')) {
        msg = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
      } else if (msg.includes('Password should be at least')) {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (msg.toLowerCase().includes('rate limit')) {
        msg = '⚠️ Límite de envíos de correo alcanzado temporalmente en Supabase. Espera unos minutos antes de intentar registrar otra cuenta o desactiva "Confirm email" en el panel de Supabase.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center bg-slate-900 min-h-screen text-slate-100 font-sans p-4">
      <div className="w-full max-w-md bg-slate-950 rounded-2xl p-6 shadow-2xl border border-slate-800 space-y-6">

        {/* Logo & Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-sky-500/20">
            <ShieldCheck size={28} />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Control de Certeza</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Mi Realidad</h1>
          </div>
          <p className="text-xs text-slate-400">
            {mode === 'login'
              ? 'Ingresa tus credenciales para acceder a tus finanzas.'
              : 'Crea tu cuenta para tomar el control de tu dinero.'}
          </p>
        </div>

        {/* Toggle Login / SignUp */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              mode === 'login'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              mode === 'signup'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 leading-relaxed">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-sm bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full text-sm bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 mt-2"
          >
            {loading ? (
              <span>Cargando...</span>
            ) : mode === 'login' ? (
              <>
                <span>Ingresar</span>
                <LogIn size={16} />
              </>
            ) : (
              <>
                <span>Registrarme</span>
                <UserPlus size={16} />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-500 pt-2 border-t border-slate-900">
          {mode === 'login' ? (
            <>
              ¿No tienes una cuenta aún?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-sky-400 font-semibold hover:underline"
              >
                Regístrate gratis
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sky-400 font-semibold hover:underline"
              >
                Inicia sesión aquí
              </button>
            </>
          )}
        </p>

      </div>
    </div>
  );
}
