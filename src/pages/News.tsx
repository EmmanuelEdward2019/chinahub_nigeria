import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

const News = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const newsArticles = [
    {
      id: 1,
      title: "Global Trade Trends 2025: What to Expect",
      excerpt: "Explore the latest trends shaping international trade and how businesses can adapt to the evolving marketplace.",
      date: "2025-01-15",
      readTime: "5 min read",
      category: "Market Insights"
    },
    {
      id: 2,
      title: "Streamlining Your Supply Chain with Digital Tools",
      excerpt: "Learn how modern technology is revolutionizing supply chain management and reducing operational costs.",
      date: "2025-01-10",
      readTime: "7 min read",
      category: "Technology"
    },
    {
      id: 3,
      title: "Sustainable Sourcing: A Growing Priority",
      excerpt: "Discover why sustainable sourcing practices are becoming essential for modern businesses and their long-term success.",
      date: "2025-01-05",
      readTime: "6 min read",
      category: "Sustainability"
    },
    {
      id: 4,
      title: "Cross-Border Payment Solutions Simplified",
      excerpt: "Understanding the various payment options available for international trade and how to choose the right one.",
      date: "2024-12-28",
      readTime: "4 min read",
      category: "Finance"
    },
    {
      id: 5,
      title: "Building Strong Supplier Relationships",
      excerpt: "Tips and strategies for establishing lasting partnerships with suppliers that benefit both parties.",
      date: "2024-12-20",
      readTime: "8 min read",
      category: "Business Strategy"
    },
    {
      id: 6,
      title: "The Future of Global Manufacturing",
      excerpt: "How emerging technologies and changing consumer demands are reshaping the manufacturing landscape.",
      date: "2024-12-15",
      readTime: "6 min read",
      category: "Manufacturing"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation user={user} />
      
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
            Latest News & Insights
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stay updated with the latest trends, insights, and developments 
            in global trade and sourcing.
          </p>
        </div>
      </section>

      {/* News Articles */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newsArticles.map((article) => (
              <Card key={article.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{article.category}</Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {article.readTime}
                    </div>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {article.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(article.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary mb-4">Stay Informed</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Subscribe to our newsletter for the latest insights and updates in global trade.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default News;