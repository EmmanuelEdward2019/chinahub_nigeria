import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { 
  Sofa, Zap, ChefHat, Hammer, Smartphone, Laptop, Cpu, Package,
  ArrowRight, Search, ShieldCheck, Globe, Truck, Star,
  UserCheck, FileText, MessageSquare, CheckCircle
} from "lucide-react";
import heroSourcing from "@/assets/hero-sourcing.jpg";
import productsCollage from "@/assets/products-collage.jpg";
import partnership from "@/assets/partnership.jpg";
import globalShipping from "@/assets/global-shipping.jpg";

interface Category {
  id: string;
  name: string;
  icon: string;
}

const iconMap: Record<string, any> = {
  sofa: Sofa, zap: Zap, 'chef-hat': ChefHat, hammer: Hammer,
  smartphone: Smartphone, laptop: Laptop, cpu: Cpu, package: Package,
};

/* ── tiny scroll-reveal wrapper ── */
function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal(0.15);
  return (
    <div
      ref={ref}
      className={`${className} transition-none ${visible ? "reveal-up" : "opacity-0"}`}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

const Index = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
      setCategories(data || []);
    } finally {
      setLoading(false);
    }
  };

  const go = (path: string) => navigate(user ? path : "/auth");

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />

      {/* ════════ HERO ════════ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* background image */}
        <div className="absolute inset-0">
          <img src={heroSourcing} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/70 to-foreground/40" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid lg:grid-cols-2 gap-12 items-center py-24">
          {/* left copy */}
          <div className="reveal-up">
            <span className="inline-block text-sm font-medium tracking-widest uppercase text-primary-foreground/70 mb-4">
              Trusted by 2,000+ businesses
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] text-primary-foreground mb-6 text-wrap-balance">
              Source Any Product From China — Hassle Free
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-xl mb-10 text-wrap-pretty">
              Submit a product inquiry, get supplier quotes in days, and pay securely. 
              ChinaHub handles sourcing, quality checks, and shipping so you can focus on growing your business.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => go("/inquiry")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.97] transition-transform"
              >
                Start Sourcing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/about")}
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                How It Works
              </Button>
            </div>

            {/* trust row */}
            <div className="flex items-center gap-6 mt-12 text-primary-foreground/60 text-sm">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Verified Suppliers</span>
              <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" /> 30+ Countries</span>
              <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" /> Door-to-Door</span>
            </div>
          </div>

          {/* right — floating product collage */}
          <div className="hidden lg:block reveal-up reveal-delay-2">
            <div className="relative">
              <img
                src={productsCollage}
                alt="Products sourced through ChinaHub"
                className="rounded-2xl shadow-2xl shadow-foreground/30 rotate-1 hover:rotate-0 transition-transform duration-500"
              />
              {/* stat chip */}
              <div className="absolute -bottom-6 -left-6 bg-card rounded-xl shadow-xl px-5 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary/15 flex items-center justify-center">
                  <Star className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">4.8 / 5 rating</p>
                  <p className="text-xs text-muted-foreground">from 1,240 reviews</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ CATEGORIES ════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <RevealSection className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">What Are You Looking For?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Browse popular categories or submit a custom request for anything else.
            </p>
          </RevealSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
                ))
              : categories.map((cat, i) => {
                  const Icon = iconMap[cat.icon] || Package;
                  return (
                    <RevealSection key={cat.id} delay={i * 70}>
                      <button
                        onClick={() => (user ? navigate(`/inquiry?category=${cat.id}`) : navigate("/auth"))}
                        className="w-full group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left hover:shadow-lg hover:shadow-primary/5 transition-shadow active:scale-[0.97]"
                      >
                        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-sm text-card-foreground">{cat.name}</h3>
                      </button>
                    </RevealSection>
                  );
                })}
          </div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS ════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/40">
        <div className="max-w-7xl mx-auto">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Four simple steps from inquiry to delivery
            </p>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: UserCheck, title: "Create Account", desc: "Sign up for free and set up your business profile in under a minute." },
              { icon: FileText, title: "Submit Inquiry", desc: "Describe what you need — attach images, specs, and desired quantity." },
              { icon: MessageSquare, title: "Get Quotes", desc: "Our team sources suppliers and sends you competitive pricing within days." },
              { icon: CheckCircle, title: "Pay & Receive", desc: "Confirm your order, pay securely via Paystack, and we handle delivery." },
            ].map((step, i) => (
              <RevealSection key={i} delay={i * 100}>
                <div className="relative bg-card rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-border">
                  <span className="absolute -top-4 -left-2 text-[5rem] font-black text-primary/[0.06] leading-none select-none">
                    {i + 1}
                  </span>
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg text-card-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ SPLIT IMAGE + TEXT ════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <RevealSection>
            <img
              src={partnership}
              alt="Business partnership"
              className="rounded-2xl shadow-xl w-full object-cover aspect-[4/3]"
            />
          </RevealSection>
          <RevealSection delay={120}>
            <span className="text-sm font-medium tracking-widest uppercase text-primary mb-3 block">Why ChinaHub</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 text-wrap-balance">
              We Do the Heavy Lifting So You Don't Have To
            </h2>
            <ul className="space-y-5">
              {[
                { icon: Search, title: "Expert Sourcing", desc: "Our team vets suppliers, negotiates pricing, and ensures product quality matches your specs." },
                { icon: ShieldCheck, title: "Secure Payments", desc: "Pay with confidence through Paystack. Funds are only released after you confirm." },
                { icon: Truck, title: "End-to-End Logistics", desc: "From factory floor to your doorstep — we coordinate shipping, customs, and last-mile delivery." },
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </RevealSection>
        </div>
      </section>

      {/* ════════ SHIPPING BANNER ════════ */}
      <RevealSection>
        <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0">
            <img src={globalShipping} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-foreground/70" />
          </div>
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4 text-wrap-balance">
              Delivering to 30+ Countries and Counting
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Whether you're in Lagos, London, or Los Angeles — we ship directly to your warehouse or doorstep.
            </p>
            <Button
              size="lg"
              onClick={() => go("/inquiry")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.97] transition-transform"
            >
              Get a Free Quote
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </RevealSection>

      {/* ════════ STATS ════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/40">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: "2,000+", label: "Businesses Served" },
              { value: "15,000+", label: "Products Sourced" },
              { value: "98%", label: "Satisfaction Rate" },
              { value: "30+", label: "Countries Reached" },
            ].map((stat, i) => (
              <RevealSection key={i} delay={i * 80}>
                <p className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FINAL CTA ════════ */}
      <RevealSection>
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-wrap-balance">
              Ready to Source Smarter?
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
              Join thousands of businesses already saving time and money with ChinaHub.
            </p>
            <Button
              size="lg"
              onClick={() => go("/inquiry")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.97] transition-transform"
            >
              Start Sourcing Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </RevealSection>

      <Footer />
    </div>
  );
};

export default Index;
