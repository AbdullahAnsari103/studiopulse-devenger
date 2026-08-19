import { SignUp } from "@clerk/clerk-react";
import { Users, Sparkles, Shield, ArrowRight, Check } from "lucide-react";
import { CosmicNebulaBackground } from "../components/blocks/galaxy-interactive-hero-section";

export default function SignUpPage() {
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
        <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-600/[0.08] rounded-full blur-[180px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-indigo-500/[0.05] rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04]" />
        
        {/* Top: Logo */}
        <div className="relative z-10 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <a href="/" className="flex items-center gap-2.5 group" id="signup-logo-left">
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
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] font-bold text-purple-300/80 tracking-[0.2em] uppercase">Free Forever Plan Available</span>
            </div>
          </div>
          
          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-[1.15] tracking-tight mb-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}>
            Start growing your<br />
            <span className="text-gradient-purple">creator business.</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
            Join 10,000+ professional creators who use Studio Pulse to manage analytics, maximize revenue, and scale their brand.
          </p>

          {/* Value props with checkmarks */}
          <div className="space-y-3.5 mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.65s', animationFillMode: 'forwards' }}>
            {[
              { text: "Connect YouTube, TikTok, Instagram & more in ", highlight: "2 minutes" },
              { text: "Get ", highlight: "AI-powered", suffix: " growth insights and content scheduling" },
              { text: "Track sponsorship ", highlight: "revenue", suffix: " across all channels" },
              { text: "No credit card required — ", highlight: "free forever", suffix: " tier" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 group" style={{ animationDelay: `${0.7 + i * 0.1}s` }}>
                <div className="w-5 h-5 rounded-md bg-purple-500/15 border border-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-purple-500/25 transition-colors duration-200">
                  <Check className="w-3 h-3 text-purple-400" />
                </div>
                <span className="text-gray-400 text-xs leading-relaxed">
                  {item.text}<span className="text-white font-semibold">{item.highlight}</span>{item.suffix || ''}
                </span>
              </div>
            ))}
          </div>

          {/* Social proof counter */}
          <div className="flex items-center gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.9s', animationFillMode: 'forwards' }}>
            <div className="flex -space-x-2">
              {['AM', 'SC', 'DP', 'JK'].map((initials, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#0c0618]" style={{ zIndex: 4 - i }}>
                  {initials}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-400" />
                <span className="text-white text-xs font-bold">10,247</span>
                <span className="text-gray-500 text-xs">creators joined</span>
              </div>
              <div className="text-[9px] text-gray-600">+412 this week</div>
            </div>
          </div>
        </div>

        {/* Bottom: Trust */}
        <div className="relative z-10 flex items-center gap-3 text-[10px] text-gray-600 opacity-0 animate-fade-in" style={{ animationDelay: '1.1s', animationFillMode: 'forwards' }}>
          <Shield className="w-3.5 h-3.5 text-green-400/50" />
          <span>SOC 2 compliant · 256-bit encryption · GDPR ready</span>
        </div>
      </div>

      {/* ─── Right Panel: Sign Up Form ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 py-8 sm:py-12 relative z-10 min-h-screen lg:min-h-0">
        {/* Subtle ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[500px] h-[250px] sm:h-[300px] bg-purple-600/[0.04] rounded-full blur-[120px] pointer-events-none" />
        
        {/* Mobile-only header */}
        <div className="lg:hidden w-full max-w-[420px] mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <a href="/" className="flex items-center gap-2 mb-5 group" id="signup-logo-mobile">
            <img src="/image.png" alt="Studio Pulse" className="w-9 h-9 object-contain" />
            <span className="text-white font-bold text-lg tracking-tight">
              Studio<span className="text-purple-400">Pulse</span>
            </span>
          </a>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-1.5">Create your free account</h2>
          <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">Join 10,000+ creators managing their business with Studio Pulse</p>
        </div>

        <div className="relative z-10 w-full max-w-[420px] opacity-0 animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          {/* Heading above the card on desktop */}
          <div className="text-center mb-6 hidden lg:block">
            <h2 className="text-xl font-bold text-white mb-1">Create your free account</h2>
            <p className="text-gray-500 text-sm">Setup takes less than 2 minutes</p>
          </div>

          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
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
          
          {/* Mobile-only feature highlights */}
          <div className="lg:hidden flex flex-wrap justify-center gap-x-4 gap-y-2 mt-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
            {['Free forever', 'No credit card', '2 min setup'].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <Check className="w-3 h-3 text-green-400/60" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom links */}
        <div className="relative z-10 mt-6 sm:mt-8 text-center opacity-0 animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
          <p className="text-gray-600 text-xs">
            Already have an account?{" "}
            <a href="/sign-in" className="text-purple-400 hover:text-purple-300 font-medium transition-colors inline-flex items-center gap-1">
              Sign in <ArrowRight className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
