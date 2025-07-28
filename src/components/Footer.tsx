import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-background border-t py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <img 
              src="/lovable-uploads/0bdcaaca-e82b-4c23-9eb4-934cd15493e9.png" 
              alt="ChinaHub Logo" 
              className="h-10 w-auto mb-4"
            />
            <p className="text-muted-foreground max-w-md">
              Your trusted partner for global sourcing. Connect with suppliers worldwide and streamline your procurement process.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/news" className="text-muted-foreground hover:text-primary transition-colors">
                  News
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-muted-foreground">Product Sourcing</span>
              </li>
              <li>
                <span className="text-muted-foreground">Custom Inquiries</span>
              </li>
              <li>
                <span className="text-muted-foreground">Supplier Matching</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2025 ChinaHub. All rights reserved. Your trusted product sourcing platform.
          </p>
          <p className="text-muted-foreground text-sm mt-4 md:mt-0">
            Designed by{" "}
            <a 
              href="https://techfieldsdigital.com.ng" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Techfields
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;