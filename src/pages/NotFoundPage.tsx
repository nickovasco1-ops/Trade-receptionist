import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 font-body bg-navy">
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm text-center">
        <div className="flex justify-center mb-10">
          <Logo className="h-8 w-auto" />
        </div>

        <p className="font-mono text-[13px] text-orange-soft tracking-widest mb-4">404</p>

        <h1 className="font-display text-[32px] font-bold text-offwhite tracking-tight leading-tight mb-3">
          Page not found
        </h1>
        <p className="text-[15px] text-offwhite/40 font-body leading-relaxed mb-8">
          That URL doesn't exist. Head back to the homepage or sign in to your dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-btn font-semibold text-[14px] text-white font-body bg-gradient-to-r from-orange to-orange-glow shadow-orange-glow hover:shadow-orange-glow-lg hover:-translate-y-0.5 transition-all duration-300 ease-mechanical"
          >
            Back to homepage
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-btn font-semibold text-[14px] text-offwhite/70 font-body bg-white/[0.06] shadow-ring-default hover:bg-white/[0.10] hover:shadow-ring-strong hover:-translate-y-0.5 transition-all duration-300 ease-mechanical"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
