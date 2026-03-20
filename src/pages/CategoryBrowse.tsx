import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Product images
import sofaSectional from "@/assets/products/sofa-sectional.jpg";
import officeChair from "@/assets/products/office-chair.jpg";
import diningTable from "@/assets/products/dining-table.jpg";
import wardrobe from "@/assets/products/wardrobe.jpg";
import earbuds from "@/assets/products/earbuds.jpg";
import smartTv from "@/assets/products/smart-tv.jpg";
import cctvCamera from "@/assets/products/cctv-camera.jpg";
import powerBank from "@/assets/products/power-bank.jpg";
import cookingPots from "@/assets/products/cooking-pots.jpg";
import blender from "@/assets/products/blender.jpg";
import powerDrill from "@/assets/products/power-drill.jpg";
import ledBulbs from "@/assets/products/led-bulbs.jpg";

// Category header images
import categoryFurniture from "@/assets/category-furniture.jpg";
import categoryElectronics from "@/assets/category-electronics.jpg";
import categoryKitchen from "@/assets/category-kitchen.jpg";
import categoryHardware from "@/assets/category-hardware.jpg";
import categoryElectrical from "@/assets/category-electrical.jpg";
import categoryGeneral from "@/assets/category-general.jpg";

interface SubCategory {
  name: string;
  image: string;
  description: string;
}

// Static subcategory data keyed by category icon (from DB)
const subcategoryData: Record<string, { banner: string; subs: SubCategory[] }> = {
  sofa: {
    banner: categoryFurniture,
    subs: [
      { name: "Sectional Sofas", image: sofaSectional, description: "L-shaped & modular sofas for living rooms" },
      { name: "Office Chairs", image: officeChair, description: "Ergonomic mesh & leather desk chairs" },
      { name: "Dining Sets", image: diningTable, description: "Tables with matching chair sets" },
      { name: "Wardrobes & Cabinets", image: wardrobe, description: "Bedroom storage & closet systems" },
      { name: "Bed Frames", image: sofaSectional, description: "King, queen & bunk bed frames" },
      { name: "Shelving & Racks", image: diningTable, description: "Display shelves & storage racks" },
    ],
  },
  smartphone: {
    banner: categoryElectronics,
    subs: [
      { name: "Wireless Earbuds", image: earbuds, description: "Bluetooth TWS earbuds & headphones" },
      { name: "Smart TVs", image: smartTv, description: "LED & OLED smart televisions" },
      { name: "CCTV Cameras", image: cctvCamera, description: "Security surveillance systems" },
      { name: "Power Banks", image: powerBank, description: "Portable chargers & battery packs" },
      { name: "Smartphones", image: earbuds, description: "Android & feature phones" },
      { name: "Tablets", image: smartTv, description: "Android tablets & iPads accessories" },
    ],
  },
  laptop: {
    banner: categoryElectronics,
    subs: [
      { name: "Laptops", image: smartTv, description: "Business & gaming laptops" },
      { name: "Monitors", image: smartTv, description: "Desktop monitors & displays" },
      { name: "Keyboards & Mice", image: powerBank, description: "Wireless & mechanical peripherals" },
      { name: "Laptop Bags", image: officeChair, description: "Carrying cases & backpacks" },
    ],
  },
  cpu: {
    banner: categoryElectronics,
    subs: [
      { name: "Computer Components", image: powerBank, description: "CPUs, RAM, SSDs & GPUs" },
      { name: "Networking Gear", image: cctvCamera, description: "Routers, switches & cables" },
      { name: "Server Equipment", image: smartTv, description: "Rack servers & UPS systems" },
      { name: "Printers & Scanners", image: officeChair, description: "Inkjet, laser & 3D printers" },
    ],
  },
  "chef-hat": {
    banner: categoryKitchen,
    subs: [
      { name: "Cooking Pots & Pans", image: cookingPots, description: "Stainless steel & non-stick cookware" },
      { name: "Blenders & Juicers", image: blender, description: "Electric blenders & food processors" },
      { name: "Cutlery Sets", image: cookingPots, description: "Knife sets & kitchen utensils" },
      { name: "Gas Cookers", image: blender, description: "Standing & tabletop gas cookers" },
      { name: "Microwaves & Ovens", image: cookingPots, description: "Electric ovens & microwave ovens" },
      { name: "Water Dispensers", image: blender, description: "Hot & cold water dispensers" },
    ],
  },
  hammer: {
    banner: categoryHardware,
    subs: [
      { name: "Power Drills", image: powerDrill, description: "Cordless & corded electric drills" },
      { name: "Hand Tools", image: powerDrill, description: "Hammers, screwdrivers, pliers & wrenches" },
      { name: "Measuring Tools", image: powerDrill, description: "Tape measures, levels & laser tools" },
      { name: "Safety Equipment", image: powerDrill, description: "Helmets, gloves & safety boots" },
      { name: "Paints & Finishes", image: powerDrill, description: "Wall paints, varnish & primers" },
    ],
  },
  zap: {
    banner: categoryElectrical,
    subs: [
      { name: "LED Bulbs & Lighting", image: ledBulbs, description: "Energy-saving bulbs & fixtures" },
      { name: "Cables & Wires", image: ledBulbs, description: "Electrical wiring & extension cables" },
      { name: "Switches & Sockets", image: ledBulbs, description: "Wall switches, outlets & plates" },
      { name: "Circuit Breakers", image: ledBulbs, description: "MCBs, RCDs & distribution boards" },
      { name: "Solar Panels", image: ledBulbs, description: "Solar panels & inverter systems" },
    ],
  },
  package: {
    banner: categoryGeneral,
    subs: [
      { name: "Clothing & Fashion", image: categoryGeneral, description: "Men's & women's apparel" },
      { name: "Bags & Luggage", image: categoryGeneral, description: "Backpacks, suitcases & handbags" },
      { name: "Beauty & Personal Care", image: categoryGeneral, description: "Skincare, haircare & cosmetics" },
      { name: "Shoes & Footwear", image: categoryGeneral, description: "Sneakers, sandals & boots" },
      { name: "Toys & Games", image: categoryGeneral, description: "Children's toys & board games" },
      { name: "Stationery & Office", image: categoryGeneral, description: "Pens, notebooks & office supplies" },
    ],
  },
};

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

const CategoryBrowse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    const fetchCategory = async () => {
      if (!id) return;
      const { data } = await supabase.from("categories").select("name, icon").eq("id", id).single();
      if (data) {
        setCategoryName(data.name);
        setCategoryIcon(data.icon || "package");
      }
      setLoading(false);
    };
    fetchCategory();
  }, [id]);

  const catData = subcategoryData[categoryIcon] || subcategoryData["package"];
  const banner = catData?.banner || categoryGeneral;
  const subs = catData?.subs || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} />
        <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
          <div className="h-48 rounded-2xl bg-muted animate-pulse mb-12" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />

      {/* Banner */}
      <section className="relative h-56 sm:h-64 overflow-hidden">
        <img src={banner} alt={categoryName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-foreground/60" />
        <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto">
          <Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground text-sm flex items-center gap-1 mb-3 w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to categories
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-foreground">{categoryName}</h1>
          <p className="text-primary-foreground/80 mt-2 text-base sm:text-lg">
            Browse products in this category and sign up to start sourcing
          </p>
        </div>
      </section>

      {/* Product grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <RevealSection className="mb-10">
            <h2 className="text-2xl font-bold text-foreground">{subs.length} products available</h2>
            <p className="text-muted-foreground mt-1">Click any product to get started with your sourcing inquiry</p>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {subs.map((sub, i) => (
              <RevealSection key={sub.name} delay={i * 80}>
                <button
                  onClick={() => navigate("/auth")}
                  className="group w-full text-left rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-shadow active:scale-[0.97]"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={sub.image}
                      alt={sub.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-card-foreground text-base mb-1">{sub.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{sub.description}</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      Source this product <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              </RevealSection>
            ))}
          </div>

          {/* CTA */}
          <RevealSection className="mt-16 text-center">
            <div className="rounded-2xl bg-muted/50 border border-border p-10">
              <h3 className="text-xl font-bold text-foreground mb-2">Don't see what you need?</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Sign up and submit a custom inquiry — we source any product from China.
              </p>
              <Button onClick={() => navigate("/auth")} size="lg">
                Sign Up & Submit Inquiry <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </RevealSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CategoryBrowse;
