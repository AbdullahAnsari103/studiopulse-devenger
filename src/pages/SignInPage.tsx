import { SignIn } from "@clerk/clerk-react";
import { BarChart3, Shield, Zap, TrendingUp, Star } from "lucide-react";
import { CosmicNebulaBackground } from "../components/blocks/galaxy-interactive-hero-section";

const features = [
  { icon: <BarChart3 className="w-4 h-4" />, title: "Unified Analytics", desc: "All platforms, one view" },
  { icon: <TrendingUp className="w-4 h-4" />, title: "AI Growth Engine", desc: "Data-backed recommendations" },
  { icon: <Shield className="w-4 h-4" />, title: "Revenue Tracking", desc: "Every dollar accounted for" },
  { icon: <Zap className="w-4 h-4" />, title: "Smart Alerts", desc: "Never miss a viral moment" },
];

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#060610] flex flex-col lg:flex-row overflow-hidden relative">
      {/* Cosmic Nebula Background floating behind */}
      <div className="absolute inset-0 z-0 opacity-40 lg:opacity-75 pointer-events-none">
        <CosmicNebulaBackground />
      </div>

      {/* ─── Left Panel: Visual Storytelling (Desktop) ─── */}
      <div className="hidden lg:flex lg:w-[48%] relative flex-col items-start justify-between p-10 xl:p-14 overflow-hidden z-10">
        {/* Ambient backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0618]/30 via-[#0d0820]/25 to-[#060610]/30 backdrop-blur-md" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/[0.08] rounded-full blur-[180px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/[0.06] rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04]" />
        
        {/* Top: Logo */}
        <div className="relative z-10 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <a href="/" className="flex items-center gap-2.5 group" id="signin-logo-left">
            <img src="/image.png" alt="Studio Pulse" className="w-9 h-9 object-contain" />
            <span className="text-white font-bold text-lg tracking-tight">
              Studio<span className="text-purple-400">Pulse</span>
            </span>
          </a>
        </div>

        {/* Center: Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center -mt-4">
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
            <div className="inline-flex items-center gap-2 bg-purple-500/[0.08] border border-purple-500/15 rounded-full px-3.5 py-1 mb-6 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold text-purple-300/80 tracking-[0.2em] uppercase">10,000+ Active Creators</span>
            </div>
          </div>
          
          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-[1.15] tracking-tight mb-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}>
            Welcome back to your <span className="text-gradient-purple">command center.</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
            Pick up where you left off. Your analytics, revenue, and AI insights are waiting.
          </p>

          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-3 mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.65s', animationFillMode: 'forwards' }}>
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3.5 py-3 hover:bg-white/[0.04] hover:border-purple-500/15 transition-all duration-300 group">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-200">
                  {f.icon}
                </div>
                <div>
                  <div className="text-[11px] text-white font-semibold">{f.title}</div>
                  <div className="text-[9px] text-gray-500">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Mini testimonial */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 max-w-sm opacity-0 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
            <div className="flex gap-0.5 mb-2.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
            </div>
            <p className="text-gray-300 text-xs leading-relaxed mb-3 italic">
              "I went from spending 2 hours checking 5 dashboards to 10 minutes on Studio Pulse. Game changer."
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white">AM</div>
              <div>
                <div className="text-white text-[11px] font-medium">Arjun Mehta</div>
                <div className="text-gray-500 text-[9px]">YouTube · 1.2M subs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Trust */}
        <div className="relative z-10 flex items-center gap-3 text-[10px] text-gray-600 opacity-0 animate-fade-in" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
          <Shield className="w-3.5 h-3.5 text-green-400/50" />
          <span>SOC 2 compliant · 256-bit encryption · GDPR ready</span>
        </div>
      </div>

      {/* ─── Right Panel: Sign In Form ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 py-8 sm:py-12 relative z-10 min-h-screen lg:min-h-0">
        {/* Subtle ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[500px] h-[250px] sm:h-[300px] bg-purple-600/[0.04] rounded-full blur-[120px] pointer-events-none" />
        
        {/* Mobile-only header */}
        <div className="lg:hidden w-full max-w-[420px] mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <a href="/" className="flex items-center gap-2 mb-5 group" id="signin-logo-mobile">
            <img src="/image.png" alt="Studio Pulse" className="w-9 h-9 object-contain" />
            <span className="text-white font-bold text-lg tracking-tight">
              Studio<span className="text-purple-400">Pulse</span>
            </span>
          </a>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-1.5">Welcome back</h2>
          <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">Sign in to continue managing your creator business</p>
        </div>

        <div className="relative z-10 w-full max-w-[420px] opacity-0 animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          {/* Heading above the card on desktop */}
          <div className="text-center mb-6 hidden lg:block">
            <h2 className="text-xl font-bold text-white mb-1">Sign in to your account</h2>
            <p className="text-gray-500 text-sm">Continue managing your creator empire</p>
          </div>

          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-[#0e0e1c]/90 border border-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl rounded-2xl",
                headerTitle: "text-white text-lg font-bold",
                headerSubtitle: "text-gray-400 text-sm",
                socialButtonsBlockButton: "bg-white/[0.04] border-white/[0.08] text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200 rounded-xl",
                socialButtonsBlockButtonText: "text-gray-200 font-medium text-sm",
                formFieldLabel: "text-gray-300 text-xs font-medium",
                formFieldInput: "bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 focus:border-purple-500/50 focus:ring-purple-500/10 rounded-xl transition-all duration-200",
                formButtonPrimary: "bg-gradient-to-r from-[#8200DB] to-[#6d28d9] hover:from-[#7000c0] hover:to-[#5b21b6] text-white shadow-none font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_25px_rgba(130,0,219,0.3)]",
                footerActionLink: "text-purple-400 hover:text-purple-300 font-medium",
                identityPreviewEditButton: "text-purple-400 hover:text-purple-300",
                formFieldAction: "text-purple-400 hover:text-purple-300 text-xs font-medium",
                dividerLine: "bg-white/[0.06]",
                dividerText: "text-gray-500 text-xs",
                otpCodeFieldInput: "bg-white/[0.04] border-white/[0.08] text-white rounded-xl",
                footer: "hidden",
              },
            }}
          />
        </div>

        {/* Bottom links */}
        <div className="relative z-10 mt-6 sm:mt-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
          <p className="text-gray-600 text-xs">
            Don't have an account?{" "}
            <a href="/sign-up" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">Create one free</a>
          </p>
        </div>
      </div>
    </div>
  );
}
