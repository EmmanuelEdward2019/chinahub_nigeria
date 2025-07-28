import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sofa, 
  Zap, 
  ChefHat, 
  Hammer, 
  Smartphone, 
  Laptop, 
  Cpu, 
  Package,
  ArrowRight,
  User
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
}

const iconMap = {
  sofa: Sofa,
  zap: Zap,
  'chef-hat': ChefHat,
  hammer: Hammer,
  smartphone: Smartphone,
  laptop: Laptop,
  cpu: Cpu,
  package: Package,
};

const Index = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(`/inquiry?category=${categoryId}`);
  };

  const IconComponent = ({ iconName }: { iconName: string }) => {
    const Icon = iconMap[iconName as keyof typeof iconMap] || Package;
    return <Icon className="h-8 w-8" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src="/placeholder.svg" alt="ChinaHub Logo" className="h-8 w-auto" />
              <h1 className="text-xl font-bold text-primary">ChinaHub</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Button onClick={() => navigate("/dashboard")} variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              ) : (
                <Button onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
            Your Gateway to 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              {" "}Global Sourcing
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with trusted suppliers, submit custom inquiries, and manage your sourcing journey 
            with our comprehensive platform designed for modern businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate(user ? "/inquiry" : "/auth")}>
              Start Sourcing Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">Browse Categories</h2>
            <p className="text-lg text-muted-foreground">
              Find products across diverse categories or submit custom requests
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 text-center">
                    <div className="h-8 w-8 bg-gray-200 rounded mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Card 
                  key={category.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-primary group-hover:scale-110 transition-transform duration-200 mb-4">
                      <IconComponent iconName={category.icon} />
                    </div>
                    <h3 className="font-semibold text-sm">{category.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">Why Choose ChinaHub?</h2>
            <p className="text-lg text-muted-foreground">
              Streamlined sourcing with powerful features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2 text-primary" />
                  Custom Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Submit detailed product requests with samples and specifications for personalized sourcing solutions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-primary" />
                  Instant Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Stay updated with real-time notifications on inquiry status, quotes, and important updates.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-primary" />
                  Secure Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Manage your wallet with multi-currency support and secure payment processing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary mb-4">Ready to Start Sourcing?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of businesses already using ChinaHub for their sourcing needs.
          </p>
          <Button size="lg" onClick={() => navigate(user ? "/inquiry" : "/auth")}>
            Get Started Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-muted-foreground">
            © 2024 ChinaHub. All rights reserved. Your trusted product sourcing platform.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
