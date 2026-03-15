import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
const logoIcon = "/favicon.png";

const features = [
  { icon: "💼", color: "rgba(232,117,42,0.12)", iconColor: "#E8752A", title: "إدارة العملاء", desc: "أضف وتابع عملاءك بسهولة. بيانات الاتصال، الحالة، الملاحظات، وسجل كامل للتعاملات." },
  { icon: "📄", color: "rgba(59,95,229,0.12)", iconColor: "#3B5FE5", title: "الفواتير والمدفوعات", desc: "أنشئ فواتير احترافية، تتبع المدفوعات، واحصل على تنبيهات للفواتير المتأخرة." },
  { icon: "🤝", color: "rgba(232,117,42,0.12)", iconColor: "#E8752A", title: "العقود والمستندات", desc: "أنشئ عقود من قوالب جاهزة أو مخصصة. تتبع حالة كل عقد من الإنشاء للتوقيع." },
  { icon: "✍️", color: "rgba(59,95,229,0.12)", iconColor: "#3B5FE5", title: "التوقيع الإلكتروني", desc: "وقّع مستنداتك إلكترونياً وأرسلها لعملائك للتوقيع. آمن وملزم قانونياً." },
  { icon: "📊", color: "rgba(232,117,42,0.12)", iconColor: "#E8752A", title: "المشاريع والمهام", desc: "أدر مشاريعك بفعالية مع تتبع التقدم، المهام، والميزانيات في مكان واحد." },
  { icon: "✦", color: "rgba(59,95,229,0.12)", iconColor: "#3B5FE5", title: "مساعد ذكاء اصطناعي", desc: "مساعد ذكي يساعدك في إنشاء المستندات، تحليل البيانات، واقتراح أفضل الحلول." },
];

const plans = [
  { planId: "free", name: "مجاني", desc: "للأفراد والمشاريع الصغيرة", price: "0", period: "ر.س/شهر", features: ["حتى 10 عملاء", "5 مستندات شهرياً", "فواتير أساسية", "دعم بالبريد"], cta: "ابدأ مجاناً", popular: false },
  { planId: "pro", name: "احترافي", desc: "للشركات الصغيرة والمتوسطة", price: "99", period: "ر.س/شهر", features: ["عملاء غير محدودين", "مستندات غير محدودة", "توقيع إلكتروني", "مساعد الذكاء الاصطناعي", "دعم أولوية"], cta: "ابدأ تجربة مجانية", popular: true },
  { planId: "business", name: "مؤسسي", desc: "للشركات الكبيرة", price: "تواصل معنا", period: "", features: ["كل مميزات الاحترافي", "API مخصص", "تخصيص كامل", "مدير حساب مخصص", "SLA مخصص"], cta: "تواصل معنا", popular: false },
];

const chartHeights = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100];
const chartColors = ['#E8752A', '#F5943E', '#3B5FE5', '#E8752A', '#F5943E', '#3B5FE5', '#E8752A', '#F5943E', '#3B5FE5', '#E8752A', '#F5943E', '#3B5FE5'];

function useAnimateOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function useCounterAnimation(target: number, suffix: string, trigger: boolean) {
  const [value, setValue] = useState("0" + suffix);
  useEffect(() => {
    if (!trigger) return;
    let current = 0;
    const step = target / 60;
    const interval = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(interval); }
      setValue(Math.floor(current).toLocaleString('ar-SA') + suffix);
    }, 25);
    return () => clearInterval(interval);
  }, [trigger, target, suffix]);
  return value;
}

export default function Landing() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chartAnimated, setChartAnimated] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const statsAnim = useAnimateOnScroll();
  const stat1 = useCounterAnimation(500, "+", statsAnim.visible);
  const stat2 = useCounterAnimation(15000, "+", statsAnim.visible);
  const stat3 = useCounterAnimation(8500, "+", statsAnim.visible);
  const stat4 = useCounterAnimation(98, "%", statsAnim.visible);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setChartAnimated(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleSubscribe = useCallback(async (planId: string) => {
    if (planId === "business") {
      window.location.href = "mailto:info@mostandoc.com";
      return;
    }
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    if (planId === "free") {
      window.location.href = "/dashboard";
      return;
    }
    setLoadingPlan(planId);
    try {
      const res = await apiRequest("POST", "/api/subscription/checkout", { plan: planId });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error("Checkout error:", e);
    } finally {
      setLoadingPlan(null);
    }
  }, [user]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="landing-page" dir="rtl">
      <style>{`
        .landing-page {
          --primary: #E8752A;
          --primary-dark: #D4691F;
          --primary-light: #F5943E;
          --secondary: #3B5FE5;
          --secondary-dark: #2A45B0;
          --accent: #F97316;
          --bg: #FFFFFF;
          --bg-light: #F9FAFB;
          --bg-card: #FFFFFF;
          --bg-warm: #FFF8F3;
          --text: #1A1A2E;
          --text-body: #1F2937;
          --text-muted: #6B7280;
          --border: #E5E7EB;
          --border-light: #F3F4F6;
          --gradient: linear-gradient(135deg, #E8752A, #F5943E);
          --gradient-blue: linear-gradient(135deg, #3B5FE5, #5B7BF5);
          --gradient-text: linear-gradient(135deg, #E8752A, #F97316);

          font-family: 'Tajawal', sans-serif;
          background: var(--bg);
          color: var(--text-body);
          overflow-x: hidden;
          line-height: 1.7;
          min-height: 100vh;
        }

        .landing-page * { box-sizing: border-box; }

        .landing-page .bg-grid {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image:
            radial-gradient(circle at 25% 25%, rgba(232, 117, 42, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(59, 95, 229, 0.05) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .landing-page .l-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }

        /* Navigation */
        .landing-page .l-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 16px 0;
          transition: all 0.3s;
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid transparent;
        }
        .landing-page .l-nav.scrolled { border-bottom-color: var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .landing-page .l-nav .l-container { display: flex; justify-content: space-between; align-items: center; }

        .landing-page .l-logo {
          display: flex; align-items: center; gap: 10px;
          font-size: 1.5rem; font-weight: 800;
          text-decoration: none; color: #1A1A2E; cursor: pointer;
        }
        .landing-page .l-logo img { width: 40px; height: 40px; border-radius: 12px; object-fit: cover; }

        .landing-page .l-nav-links {
          display: flex; align-items: center; gap: 32px; list-style: none; margin: 0; padding: 0;
        }
        .landing-page .l-nav-links a, .landing-page .l-nav-links button.nav-link {
          color: var(--text-muted); text-decoration: none; font-weight: 500;
          transition: color 0.3s; font-size: 0.95rem; background: none; border: none; cursor: pointer;
          font-family: 'Tajawal', sans-serif;
        }
        .landing-page .l-nav-links a:hover, .landing-page .l-nav-links button.nav-link:hover { color: #1A1A2E; }

        .landing-page .l-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 28px; border-radius: 12px;
          font-family: 'Tajawal', sans-serif; font-weight: 700; font-size: 1rem;
          text-decoration: none; transition: all 0.3s; cursor: pointer; border: none;
        }
        .landing-page .l-btn-primary {
          background: var(--gradient); color: white;
          box-shadow: 0 4px 20px rgba(232, 117, 42, 0.3);
          border-radius: 100px;
        }
        .landing-page .l-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(232, 117, 42, 0.4); }
        .landing-page .l-btn-outline {
          background: transparent; color: #1A1A2E; border: 1.5px solid var(--border);
          border-radius: 100px;
        }
        .landing-page .l-btn-outline:hover { border-color: var(--primary); background: rgba(232, 117, 42, 0.08); }
        .landing-page .l-btn-large { padding: 16px 40px; font-size: 1.15rem; border-radius: 100px; }

        /* Hero */
        .landing-page .l-hero {
          min-height: 100vh; display: flex; align-items: center; padding-top: 80px; position: relative;
        }
        .landing-page .l-hero-content {
          display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;
        }
        .landing-page .l-hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(232, 117, 42, 0.1); border: 1px solid rgba(232, 117, 42, 0.25);
          color: #E8752A; padding: 8px 20px;
          border-radius: 100px; font-size: 0.9rem; font-weight: 600; margin-bottom: 24px;
        }
        .landing-page .l-hero h1 { font-size: 3.5rem; font-weight: 900; line-height: 1.2; margin-bottom: 24px; color: #1A1A2E; }
        .landing-page .l-hero h1 .gradient-text {
          background: linear-gradient(135deg, #E8752A, #F97316); -webkit-background-clip: text;
          -webkit-text-fill-color: transparent; background-clip: text;
        }
        .landing-page .l-hero p { font-size: 1.2rem; color: var(--text-muted); margin-bottom: 40px; max-width: 500px; }
        .landing-page .l-hero-buttons { display: flex; gap: 16px; flex-wrap: wrap; }

        .landing-page .l-hero-visual { position: relative; }
        .landing-page .l-hero-mockup {
          width: 100%; border-radius: 20px; border: 1px solid var(--border);
          background: var(--bg-card); overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }
        .landing-page .l-mockup-header {
          display: flex; align-items: center; gap: 8px;
          padding: 16px 20px; background: #F9FAFB;
          border-bottom: 1px solid var(--border);
        }
        .landing-page .l-mockup-dot { width: 12px; height: 12px; border-radius: 50%; }
        .landing-page .l-mockup-dot.red { background: #ef4444; }
        .landing-page .l-mockup-dot.yellow { background: #f59e0b; }
        .landing-page .l-mockup-dot.green { background: #22c55e; }
        .landing-page .l-mockup-body { padding: 24px; }
        .landing-page .l-mockup-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
        .landing-page .l-mockup-stat {
          background: #F9FAFB; border: 1px solid var(--border);
          border-radius: 12px; padding: 16px;
        }
        .landing-page .l-mockup-stat .label { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }
        .landing-page .l-mockup-stat .value { font-size: 1.5rem; font-weight: 800; }
        .landing-page .l-mockup-stat .value.blue { color: #3B5FE5; }
        .landing-page .l-mockup-stat .value.purple { color: #E8752A; }
        .landing-page .l-mockup-stat .value.l-green { color: #22C55E; }
        .landing-page .l-mockup-stat .value.amber { color: #F5943E; }

        .landing-page .l-mockup-chart {
          background: #F9FAFB; border: 1px solid var(--border);
          border-radius: 12px; padding: 16px; height: 120px;
          display: flex; align-items: flex-end; gap: 8px;
        }
        .landing-page .l-chart-bar {
          flex: 1; border-radius: 6px 6px 0 0; min-height: 20px;
          transition: height 1s ease; opacity: 0.8;
        }
        .landing-page .l-hero-glow {
          position: absolute; width: 300px; height: 300px;
          background: linear-gradient(135deg, #E8752A, #F5943E);
          border-radius: 50%;
          filter: blur(120px); opacity: 0.1;
          top: 50%; right: -50px; transform: translateY(-50%); pointer-events: none;
        }

        /* Sections */
        .landing-page .l-section { padding: 120px 0; }
        .landing-page .l-section-header { text-align: center; margin-bottom: 64px; }
        .landing-page .l-section-header .badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(232, 117, 42, 0.1); color: #E8752A;
          padding: 6px 16px; border-radius: 100px; font-size: 0.85rem;
          font-weight: 600; margin-bottom: 16px;
        }
        .landing-page .l-section-header h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 16px; color: #1A1A2E; }
        .landing-page .l-section-header p { color: var(--text-muted); font-size: 1.15rem; max-width: 600px; margin: 0 auto; }

        .landing-page .l-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .landing-page .l-feature-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 16px; padding: 32px; transition: all 0.3s;
          position: relative; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
        }
        .landing-page .l-feature-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 3px; background: var(--gradient); opacity: 0; transition: opacity 0.3s;
        }
        .landing-page .l-feature-card:hover { border-color: rgba(232, 117, 42, 0.3); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .landing-page .l-feature-card:hover::before { opacity: 1; }
        .landing-page .l-feature-icon {
          width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; margin-bottom: 20px;
        }
        .landing-page .l-feature-card h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 12px; color: #1A1A2E; }
        .landing-page .l-feature-card p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.8; }

        /* Stats */
        .landing-page .l-stats-section {
          background: var(--bg-warm);
          border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
        }
        .landing-page .l-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; text-align: center; }
        .landing-page .l-stat-item .number {
          font-size: 3rem; font-weight: 900;
          color: #E8752A;
        }
        .landing-page .l-stat-item .label { color: var(--text-muted); font-size: 1rem; margin-top: 8px; }

        /* Pricing */
        .landing-page .l-pricing-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
          max-width: 1000px; margin: 0 auto;
        }
        .landing-page .l-pricing-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 20px; padding: 40px 32px; position: relative; transition: all 0.3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .landing-page .l-pricing-card.popular { border-color: #E8752A; transform: scale(1.05); box-shadow: 0 10px 40px rgba(232, 117, 42, 0.15); }
        .landing-page .l-pricing-card.popular .popular-badge {
          position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg, #E8752A, #F5943E); color: white; padding: 4px 20px;
          border-radius: 100px; font-size: 0.85rem; font-weight: 700; white-space: nowrap;
        }
        .landing-page .l-pricing-card h3 { font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; color: #1A1A2E; }
        .landing-page .l-pricing-card .price { font-size: 3rem; font-weight: 900; margin: 16px 0; color: #1A1A2E; }
        .landing-page .l-pricing-card .price span { font-size: 1rem; font-weight: 400; color: var(--text-muted); }
        .landing-page .l-pricing-features { list-style: none; margin: 24px 0 32px; padding: 0; }
        .landing-page .l-pricing-features li {
          padding: 8px 0; color: var(--text-muted);
          display: flex; align-items: center; gap: 10px;
        }
        .landing-page .l-pricing-features li::before { content: '✓'; color: #22c55e; font-weight: 700; }

        /* CTA */
        .landing-page .l-cta-section { text-align: center; padding: 120px 0; }
        .landing-page .l-cta-card {
          background: var(--bg-warm); border: 1px solid rgba(232, 117, 42, 0.15);
          border-radius: 24px; padding: 64px; position: relative; overflow: hidden;
        }
        .landing-page .l-cta-card::before {
          content: ''; position: absolute; top: -100px; left: 50%; transform: translateX(-50%);
          width: 400px; height: 400px; background: linear-gradient(135deg, #E8752A, #F5943E);
          border-radius: 50%; filter: blur(150px); opacity: 0.08; pointer-events: none;
        }
        .landing-page .l-cta-card h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 16px; position: relative; color: #1A1A2E; }
        .landing-page .l-cta-card p {
          color: var(--text-muted); font-size: 1.15rem; margin-bottom: 40px;
          max-width: 500px; margin-left: auto; margin-right: auto; position: relative;
        }

        /* Footer */
        .landing-page .l-footer { border-top: 1px solid var(--border); padding: 48px 0 32px; }
        .landing-page .l-footer-content {
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 24px;
        }
        .landing-page .l-footer-links { display: flex; gap: 24px; list-style: none; padding: 0; margin: 0; }
        .landing-page .l-footer-links a, .landing-page .l-footer-links button {
          color: var(--text-muted); text-decoration: none; transition: color 0.3s;
          background: none; border: none; cursor: pointer; font-family: 'Tajawal', sans-serif; font-size: 1rem;
        }
        .landing-page .l-footer-links a:hover, .landing-page .l-footer-links button:hover { color: #E8752A; }
        .landing-page .l-footer-copy { color: var(--text-muted); font-size: 0.9rem; }

        .landing-page .mobile-toggle {
          display: none; background: none; border: none;
          color: #1A1A2E; font-size: 1.5rem; cursor: pointer;
        }

        /* Animations */
        @keyframes landingFadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .landing-page .l-animate {
          opacity: 0; animation: landingFadeInUp 0.6s ease forwards;
        }
        .landing-page .l-animate.visible { animation-play-state: running; }
        .landing-page .l-delay-1 { animation-delay: 0.1s; }
        .landing-page .l-delay-2 { animation-delay: 0.2s; }
        .landing-page .l-delay-3 { animation-delay: 0.3s; }

        /* Responsive */
        @media (max-width: 968px) {
          .landing-page .l-hero-content { grid-template-columns: 1fr; text-align: center; }
          .landing-page .l-hero p { margin: 0 auto 40px; }
          .landing-page .l-hero-buttons { justify-content: center; }
          .landing-page .l-hero h1 { font-size: 2.5rem; }
          .landing-page .l-features-grid { grid-template-columns: 1fr; }
          .landing-page .l-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
          .landing-page .l-pricing-grid { grid-template-columns: 1fr; max-width: 400px; }
          .landing-page .l-pricing-card.popular { transform: scale(1); }
          .landing-page .l-nav-links {
            display: none; position: absolute; top: 100%; left: 0; right: 0;
            background: #FFFFFF; border-bottom: 1px solid var(--border);
            flex-direction: column; padding: 24px; gap: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .landing-page .l-nav-links.active { display: flex; }
          .landing-page .mobile-toggle { display: block; }
        }
        @media (max-width: 600px) {
          .landing-page .l-hero h1 { font-size: 2rem; }
          .landing-page .l-section-header h2 { font-size: 1.8rem; }
          .landing-page .l-cta-card { padding: 40px 24px; }
          .landing-page .l-cta-card h2 { font-size: 1.8rem; }
        }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet" />

      <div className="bg-grid" />

      {/* Navigation */}
      <nav className={`l-nav${scrolled ? " scrolled" : ""}`}>
        <div className="l-container">
          <a href="/" className="l-logo">
            <img src={logoIcon} alt="مستندك" />
            مستندك
          </a>
          <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
          <ul className={`l-nav-links${mobileMenuOpen ? " active" : ""}`}>
            <li><button className="nav-link" onClick={() => scrollTo("features")}>المميزات</button></li>
            <li><button className="nav-link" onClick={() => scrollTo("pricing")}>الأسعار</button></li>
            <li><a href="/auth" className="l-btn l-btn-outline" style={{ padding: "8px 24px" }}>تسجيل الدخول</a></li>
            <li><a href="/auth" className="l-btn l-btn-primary" style={{ padding: "8px 24px" }}>ابدأ مجاناً</a></li>
          </ul>
        </div>
      </nav>

      {/* Hero */}
      <section className="l-hero">
        <div className="l-container">
          <div className="l-hero-content">
            <div className="l-animate visible">
              <div className="l-hero-badge">✦ منصة عربية 100%</div>
              <h1>
                سجّل مرة واحدة<br />
                <span className="gradient-text">وأدِر كل أعمالك</span>
              </h1>
              <p>منصة متكاملة لإدارة العملاء، الفواتير، العقود، المشاريع، والتوقيع الإلكتروني. كل ما تحتاجه في مكان واحد.</p>
              <div className="l-hero-buttons">
                <a href="/auth" className="l-btn l-btn-primary l-btn-large">ابدأ مجاناً ←</a>
                <button className="l-btn l-btn-outline l-btn-large" onClick={() => scrollTo("features")}>اكتشف المميزات</button>
              </div>
            </div>
            <div className="l-hero-visual l-animate visible l-delay-2">
              <div className="l-hero-mockup">
                <div className="l-mockup-header">
                  <span className="l-mockup-dot red" />
                  <span className="l-mockup-dot yellow" />
                  <span className="l-mockup-dot green" />
                </div>
                <div className="l-mockup-body">
                  <div className="l-mockup-stats">
                    <div className="l-mockup-stat">
                      <div className="label">إجمالي العملاء</div>
                      <div className="value blue">248</div>
                    </div>
                    <div className="l-mockup-stat">
                      <div className="label">العقود النشطة</div>
                      <div className="value purple">56</div>
                    </div>
                    <div className="l-mockup-stat">
                      <div className="label">الإيرادات الشهرية</div>
                      <div className="value l-green">45,200 ر.س</div>
                    </div>
                    <div className="l-mockup-stat">
                      <div className="label">المشاريع النشطة</div>
                      <div className="value amber">12</div>
                    </div>
                  </div>
                  <div className="l-mockup-chart" ref={chartRef}>
                    {chartHeights.map((h, i) => (
                      <div
                        key={i}
                        className="l-chart-bar"
                        style={{
                          height: chartAnimated ? `${h}%` : "20px",
                          background: chartColors[i],
                          transitionDelay: `${i * 100}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="l-hero-glow" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="l-section" id="features">
        <div className="l-container">
          <div className="l-section-header">
            <div className="badge">✦ كل ما تحتاجه</div>
            <h2>مميزات تجعل عملك أسهل</h2>
            <p>أدوات قوية ومتكاملة صُممت خصيصاً لتسهيل إدارة أعمالك</p>
          </div>
          <div className="l-features-grid">
            {features.map((f, i) => (
              <div key={f.title} className={`l-feature-card l-animate visible l-delay-${(i % 3) + 1}`}>
                <div className="l-feature-icon" style={{ background: f.color, color: f.iconColor }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="l-section l-stats-section" style={{ padding: "80px 0" }} ref={statsAnim.ref}>
        <div className="l-container">
          <div className="l-stats-grid">
            <div className="l-stat-item">
              <div className="number">{stat1}</div>
              <div className="label">شركة تستخدم المنصة</div>
            </div>
            <div className="l-stat-item">
              <div className="number">{stat2}</div>
              <div className="label">مستند تم إنشاؤه</div>
            </div>
            <div className="l-stat-item">
              <div className="number">{stat3}</div>
              <div className="label">توقيع إلكتروني</div>
            </div>
            <div className="l-stat-item">
              <div className="number">{stat4}</div>
              <div className="label">رضا العملاء</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="l-section" id="pricing">
        <div className="l-container">
          <div className="l-section-header">
            <div className="badge">✦ أسعار مناسبة</div>
            <h2>خطط تناسب كل الأحجام</h2>
            <p>ابدأ مجاناً وترقّى حسب احتياجك. بدون رسوم خفية.</p>
          </div>
          <div className="l-pricing-grid">
            {plans.map((plan) => (
              <div key={plan.planId} className={`l-pricing-card${plan.popular ? " popular" : ""}`}>
                {plan.popular && <div className="popular-badge">الأكثر شعبية</div>}
                <h3>{plan.name}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{plan.desc}</p>
                <div className="price">
                  {plan.price} {plan.period && <span>{plan.period}</span>}
                </div>
                <ul className="l-pricing-features">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button
                  className={`l-btn ${plan.popular ? "l-btn-primary" : "l-btn-outline"}`}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => handleSubscribe(plan.planId)}
                  disabled={loadingPlan === plan.planId}
                >
                  {loadingPlan === plan.planId ? "جاري التحميل..." : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="l-cta-section">
        <div className="l-container">
          <div className="l-cta-card">
            <h2>جاهز تبدأ؟</h2>
            <p>انضم لمئات الشركات التي تدير أعمالها بسهولة مع مستندك</p>
            <a href="/auth" className="l-btn l-btn-primary l-btn-large" style={{ position: "relative" }}>
              ابدأ مجاناً الآن ←
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="l-footer">
        <div className="l-container">
          <div className="l-footer-content">
            <a href="/" className="l-logo" style={{ fontSize: "1.2rem" }}>
              <img src={logoIcon} alt="مستندك" style={{ width: 32, height: 32, fontSize: "1rem" }} />
              مستندك
            </a>
            <ul className="l-footer-links">
              <li><button onClick={() => scrollTo("features")}>المميزات</button></li>
              <li><button onClick={() => scrollTo("pricing")}>الأسعار</button></li>
              <li><a href="mailto:info@mostandoc.com">تواصل معنا</a></li>
            </ul>
            <p className="l-footer-copy">© {new Date().getFullYear()} مستندك. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
