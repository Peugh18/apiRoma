export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-white">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Chatbot Roma API
        </h1>
        <p className="text-zinc-400 text-lg">
          Sistema automatizado de comunicación para WhatsApp Business impulsado por Next.js y Supabase.
        </p>
        <div className="pt-8">
          <a href="/admin" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-sm font-medium backdrop-blur-sm shadow-[0_0_15px_rgba(52,211,153,0.1)] hover:shadow-[0_0_25px_rgba(52,211,153,0.2)]">
            Acceder al Panel
          </a>
        </div>
      </div>
    </div>
  );
}
