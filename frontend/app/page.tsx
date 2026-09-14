"use client";

import { useState, useEffect } from "react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Screenshots", href: "#screenshots" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Download", href: "#download" },
];

const FEATURES = [
  {
    icon: "💼",
    title: "Expense Tracker",
    desc: "Log and categorize every rupee you spend. Filter by date, category, or amount. Never lose track of your outflows.",
    color: "from-violet-600/20 to-violet-900/5",
    border: "border-violet-500/20",
    iconBg: "bg-violet-500/10",
  },
  {
    icon: "📊",
    title: "Income & Payments",
    desc: "Record all income sources and client payments. See your earnings month over month with beautiful summaries.",
    color: "from-sky-600/20 to-sky-900/5",
    border: "border-sky-500/20",
    iconBg: "bg-sky-500/10",
  },
  {
    icon: "🏦",
    title: "Loan Manager",
    desc: "Track borrowed amounts, interest additions, repayments and outstanding balance. Create custom loan groups with total KPIs.",
    color: "from-rose-600/20 to-rose-900/5",
    border: "border-rose-500/20",
    iconBg: "bg-rose-500/10",
  },
  {
    icon: "⏱️",
    title: "Work Log",
    desc: "Log billable hours per client, project, and date. Automatically calculate earnings. Link work entries to payments.",
    color: "from-amber-600/20 to-amber-900/5",
    border: "border-amber-500/20",
    iconBg: "bg-amber-500/10",
  },
  {
    icon: "🗂️",
    title: "Custom Loan Groups",
    desc: "Organize loans into personal, business, or family groups. Each group shows its own KPIs: borrowed, outstanding, and progress bar.",
    color: "from-emerald-600/20 to-emerald-900/5",
    border: "border-emerald-500/20",
    iconBg: "bg-emerald-500/10",
  },
  {
    icon: "📶",
    title: "Works 100% Offline",
    desc: "All your data is stored locally using SQLite. No internet required after install. Syncs when your server is available.",
    color: "from-teal-600/20 to-teal-900/5",
    border: "border-teal-500/20",
    iconBg: "bg-teal-500/10",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Download & Install",
    desc: "Download the APK and install it on your Android device. No Play Store account required.",
    icon: "⬇️",
  },
  {
    step: "02",
    title: "Set Up Your Profile",
    desc: "Enter your name, currency preference, and connect to your personal finance server (optional).",
    icon: "👤",
  },
  {
    step: "03",
    title: "Start Tracking",
    desc: "Add your loans, log expenses, record income, and track work hours — all from one clean interface.",
    icon: "🚀",
  },
  {
    step: "04",
    title: "View KPI Dashboards",
    desc: "Your dashboard auto-calculates totals, progress bars, and trends so you always know where you stand.",
    icon: "📈",
  },
];

const STATS = [
  { value: "100%", label: "Offline First" },
  { value: "4", label: "Finance Modules" },
  { value: "0₹", label: "Cost to You" },
  { value: "1-Day", label: "Smart Cache" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#081421]/90 backdrop-blur-xl border-b border-white/5 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-emerald-500/30">
              G
            </div>
            <span className="font-bold text-lg text-white tracking-tight">
              Gig Finances
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-slate-400 hover:text-white transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:block">
            <a
              href="#download"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/40 hover:-translate-y-0.5"
            >
              <span>📲</span>
              Download APK
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-slate-400 hover:text-white p-2"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0d1e2e]/95 backdrop-blur-xl border-b border-white/5">
          <div className="px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-slate-300 hover:text-white text-sm py-1"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#download"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full"
            >
              📲 Download APK
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[80px]" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-1.5 rounded-full mb-8 animate-fade-up">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse2" />
          Free & Open Source · Android App
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up animation-delay-100 text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
          Your Money.
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Your Rules.
          </span>
        </h1>

        <p className="animate-fade-up animation-delay-200 max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 leading-relaxed mb-10">
          Gig Finances is the all-in-one finance app built for freelancers and
          gig workers. Track loans, expenses, income, and work hours — all
          offline, all secure, all free.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-up animation-delay-300 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#download"
            className="group inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all duration-300 shadow-xl shadow-emerald-500/30 hover:shadow-emerald-400/50 hover:-translate-y-1"
          >
            <span className="text-xl">⬇️</span>
            Download for Android
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white font-medium px-6 py-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-200 hover:bg-white/5"
          >
            Explore Features
          </a>
        </div>

        {/* Stats Row */}
        <div className="animate-fade-up animation-delay-400 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
            >
              <div className="text-2xl font-black text-emerald-400 mb-1">{stat.value}</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium px-4 py-1.5 rounded-full mb-4">
            Everything you need
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Built for the way{" "}
            <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
              you work
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Every feature designed specifically for freelancers and gig workers.
            No bloat, just what you need.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative bg-gradient-to-br ${feature.color} border ${feature.border} rounded-3xl p-7 hover:border-opacity-50 transition-all duration-300 hover:-translate-y-1`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div
                className={`${feature.iconBg} w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5`}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScreenshotsSection() {
  const SCREENS = [
    { emoji: "🏠", title: "Dashboard", bg: "from-slate-800 to-slate-900" },
    { emoji: "🏦", title: "Loan Groups", bg: "from-indigo-900 to-slate-900" },
    { emoji: "💸", title: "Expenses", bg: "from-rose-900 to-slate-900" },
    { emoji: "⏱️", title: "Work Log", bg: "from-amber-900 to-slate-900" },
  ];

  return (
    <section id="screenshots" className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium px-4 py-1.5 rounded-full mb-4">
            Beautiful UI
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Designed to{" "}
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              delight
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Dark theme UI with gradient cards, live KPI tiles, and smooth
            animations — finance tracking has never looked this good.
          </p>
        </div>

        {/* Mock phone screens */}
        <div className="flex flex-wrap items-end justify-center gap-6">
          {SCREENS.map((screen, i) => (
            <div
              key={screen.title}
              className={`relative ${
                i === 1 || i === 2 ? "md:-mt-8" : ""
              } animate-float`}
              style={{ animationDelay: `${i * 1.5}s` }}
            >
              {/* Phone frame */}
              <div className="w-52 bg-slate-950 rounded-[2.5rem] p-2 shadow-2xl border border-white/10">
                <div className="bg-slate-900 rounded-[2rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="flex justify-between items-center px-5 pt-4 pb-2">
                    <span className="text-xs text-slate-400 font-medium">9:41</span>
                    <div className="w-16 h-4 bg-slate-950 rounded-full" />
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    </div>
                  </div>

                  {/* Screen content */}
                  <div className={`h-80 bg-gradient-to-b ${screen.bg} p-4`}>
                    {/* Header */}
                    <div className="mb-4">
                      <div className="text-xs text-slate-400 font-medium mb-0.5">Gig Finances</div>
                      <div className="text-white font-bold text-base">{screen.title}</div>
                    </div>

                    {/* Fake KPI cards */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[0, 1].map((j) => (
                        <div
                          key={j}
                          className="bg-white/5 rounded-xl p-2.5 border border-white/5"
                        >
                          <div className="w-8 h-1 bg-slate-600 rounded mb-2" />
                          <div className="w-14 h-3 bg-slate-500 rounded mb-1" />
                          <div className="w-10 h-2 bg-slate-600 rounded" />
                        </div>
                      ))}
                    </div>

                    {/* Fake list items */}
                    {[0, 1, 2].map((j) => (
                      <div
                        key={j}
                        className="bg-white/5 rounded-xl p-2.5 border border-white/5 mb-2 flex items-center gap-3"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="w-20 h-2 bg-slate-500 rounded mb-1" />
                          <div className="w-14 h-1.5 bg-slate-600 rounded" />
                        </div>
                        <div className="w-10 h-2 bg-emerald-500/50 rounded" />
                      </div>
                    ))}
                  </div>

                  {/* Bottom nav */}
                  <div className="flex justify-around items-center px-4 py-3 bg-slate-950 border-t border-white/5">
                    {["🏠", "📊", "🏦", "⏱️"].map((icon, k) => (
                      <div
                        key={k}
                        className={`text-sm ${k === i ? "opacity-100" : "opacity-30"}`}
                      >
                        {icon}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="text-center mt-3">
                <span className="text-xs text-slate-500 font-medium">{screen.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium px-4 py-1.5 rounded-full mb-4">
            Get started in minutes
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Simple as{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              1-2-3
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            No account creation, no cloud sign-up, no complicated setup.
            Download and start tracking in under a minute.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div className="absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent hidden lg:block" />

          {STEPS.map((step) => (
            <div key={step.step} className="relative text-center group">
              {/* Step circle */}
              <div className="relative inline-flex flex-col items-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center text-3xl mb-3 group-hover:border-emerald-500/40 transition-colors duration-300 relative z-10">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-emerald-500 tracking-widest">
                  STEP {step.step}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadSection() {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch("/download");
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error ||
            "APK is not available yet. Build the Android release and copy it to frontend/public/gig-finances.apk.",
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "GigFinances-v1.0.0.apk";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section id="download" className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse2" />
          Android APK · Free Download
        </div>

        <h2 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-6">
          Ready to take{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            control?
          </span>
        </h2>

        <p className="text-slate-400 text-xl mb-12 leading-relaxed">
          Download Gig Finances for free. Works on Android 8.0 and above.
          No internet required after install.
        </p>

        {/* Download card */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-10 mb-10">
          <div className="flex items-center justify-center gap-5 mb-8">
            {/* App icon placeholder */}
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-emerald-500/30">
              💼
            </div>
            <div className="text-left">
              <div className="text-2xl font-black text-white">Gig Finances</div>
              <div className="text-slate-400 text-sm mt-1">Version 1.0.0 · Android 8.0+</div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  Free
                </span>
                <span className="text-xs bg-sky-500/15 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  Offline First
                </span>
                <span className="text-xs bg-violet-500/15 text-violet-400 border border-violet-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  Open Source
                </span>
              </div>
            </div>
          </div>

          {/* Main download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`group w-full max-w-sm mx-auto flex items-center justify-center gap-3 font-bold text-lg px-8 py-5 rounded-2xl transition-all duration-300 shadow-xl ${
              downloaded
                ? "bg-green-500 text-white shadow-green-500/30"
                : downloading
                ? "bg-emerald-600 text-white cursor-wait shadow-emerald-500/20"
                : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 hover:shadow-emerald-400/50 hover:-translate-y-1"
            }`}
          >
            {downloaded ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Download Started!
              </>
            ) : downloading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Preparing Download...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download APK (Free)
              </>
            )}
          </button>

          {error ? (
            <p className="text-rose-400 text-sm mt-4 max-w-md mx-auto">{error}</p>
          ) : null}

          <p className="text-slate-500 text-sm mt-4">
            You may need to enable{" "}
            <span className="text-slate-300 font-medium">
              &quot;Install from Unknown Sources&quot;
            </span>{" "}
            in your Android settings.
          </p>
        </div>

        {/* Requirements */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { icon: "📱", title: "Android 8.0+", desc: "Oreo and above" },
            { icon: "💾", title: "~50 MB", desc: "Minimal storage" },
            { icon: "🔒", title: "No Tracking", desc: "Your data stays local" },
          ].map((req) => (
            <div
              key={req.title}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center"
            >
              <div className="text-2xl mb-2">{req.icon}</div>
              <div className="text-white font-semibold text-sm">{req.title}</div>
              <div className="text-slate-500 text-xs mt-0.5">{req.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-sm font-bold">
              G
            </div>
            <div>
              <div className="text-white font-bold text-sm">Gig Finances</div>
              <div className="text-slate-500 text-xs">Built for freelancers</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#download" className="hover:text-white transition-colors">Download</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
          </div>

          <div className="text-slate-500 text-sm text-center">
            © 2024 Gig Finances. Free & Open Source.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#081421]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ScreenshotsSection />
      <HowItWorksSection />
      <DownloadSection />
      <Footer />
    </main>
  );
}
