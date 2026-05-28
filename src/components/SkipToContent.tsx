export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="fixed left-4 top-4 z-[1000] -translate-y-24 rounded-[10px] bg-orange px-4 py-3 text-[14px] font-bold text-white opacity-0 shadow-orange-glow transition focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/70"
    >
      Skip to content
    </a>
  );
}
