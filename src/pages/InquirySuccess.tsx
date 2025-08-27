import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, MessageSquare } from "lucide-react";
import authBg from "@/assets/auth-bg.jpg";

const InquirySuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={authBg} alt="Business Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 to-secondary/80"></div>
      </div>
      
      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-background/95 text-center">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/lovable-uploads/0bdcaaca-e82b-4c23-9eb4-934cd15493e9.png" alt="ChinaHub Logo" className="h-16 w-auto" />
          </div>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Inquiry Submitted Successfully!</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <MessageSquare className="h-12 w-12 text-primary" />
          </div>
          
          <div className="space-y-4">
            <p className="text-lg font-semibold text-foreground">
              Thank you for your product inquiry!
            </p>
            
            <div className="bg-secondary/20 p-4 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-primary mr-2" />
                <span className="font-semibold text-primary">Response Time</span>
              </div>
              <p className="text-muted-foreground">
                Our admin team will review your inquiry and get back to you within <strong>3-5 business days</strong> with supplier quotes and detailed information.
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You can track the status of your inquiry in your dashboard. We'll also send you notifications when there are updates.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/dashboard")} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/inquiry")} 
              className="w-full"
            >
              Submit Another Inquiry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InquirySuccess;