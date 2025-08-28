import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAuth from "./pages/AdminAuth";
import InquiryForm from "./pages/InquiryForm";
import About from "./pages/About";
import News from "./pages/News";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import ProductSourcing from "./pages/services/ProductSourcing";
import CustomInquiries from "./pages/services/CustomInquiries";
import SupplierMatching from "./pages/services/SupplierMatching";
import SignupSuccess from "./pages/SignupSuccess";
import InquirySuccess from "./pages/InquirySuccess";
import OrderPaymentSuccess from "./pages/OrderPaymentSuccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin-auth" element={<AdminAuth />} />
          <Route path="/admin_2025store" element={<AdminDashboard />} />
          <Route path="/inquiry" element={<InquiryForm />} />
          <Route path="/about" element={<About />} />
          <Route path="/news" element={<News />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/services/product-sourcing" element={<ProductSourcing />} />
          <Route path="/services/custom-inquiries" element={<CustomInquiries />} />
          <Route path="/services/supplier-matching" element={<SupplierMatching />} />
          <Route path="/signup-success" element={<SignupSuccess />} />
          <Route path="/inquiry-success" element={<InquirySuccess />} />
          <Route path="/order-payment-success" element={<OrderPaymentSuccess />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
