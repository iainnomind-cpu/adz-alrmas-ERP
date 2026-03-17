import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center relative overflow-hidden">
      {/* Background Decorators - Make it redder */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Un gradiente base más rojizo y oscuro en la luz ambiental */}
        <div className="absolute top-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/30 via-slate-950 to-slate-950" />
        {/* Glows más intensos */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-red-600/30 blur-[130px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-red-800/30 blur-[130px]" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="flex flex-col items-center justify-center mb-6 px-4">
          {/* Contenedor del logo con borde más delgado (p-2) y más integrado */}
          <div className="bg-white p-2 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.25)] mb-4 ring-1 ring-red-100/10">
            {/* Logo más pequeño (w-32) para no desplazar tanto las credenciales */}
            <img 
              src="/logo.png" 
              alt="ADZ Alarmas Logo" 
              className="w-32 h-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.querySelector('.fallback-text')?.classList.remove('hidden');
              }}
            />
            <div className="fallback-text hidden text-2xl font-black text-red-600 tracking-tighter px-4 py-2">
              ADZ<span className="text-slate-800">ALARMAS</span>
            </div>
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
            Bienvenido de nuevo
          </h2>
          <p className="mt-2 text-center text-sm text-slate-300">
            Sistema de Gestión y Control ADZ
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl sm:rounded-2xl shadow-2xl border border-red-500/10 sm:px-10 px-6 py-8 mx-4 sm:mx-0 relative">
          {/* Brillo interior sutil en el formulario */}
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 pointer-events-none" />
          
          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Correo Electrónico
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-red-500/50 transition-all sm:text-sm"
                  placeholder="admin@adzalarmas.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-red-500/50 transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-white/10 bg-slate-800 rounded transition-all"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-300">
                  Recordarme
                </label>
              </div>
              
              <div className="text-sm">
                <a href="#" className="font-medium text-red-400 hover:text-red-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-900 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <ShieldCheck className="h-5 w-5 text-red-300 group-hover:text-red-200 transition-colors" aria-hidden="true" />
                </span>
                {loading ? 'Verificando credenciales...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
