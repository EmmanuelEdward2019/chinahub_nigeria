import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail } from "lucide-react";
import authBg from "@/assets/auth-bg.jpg";

const SignupSuccess = () => {
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
          <CardTitle className="text-2xl font-bold text-primary">Thank You for Signing Up!</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Mail className="h-12 w-12 text-primary" />
          </div>
          
          <div className="space-y-4">
            <p className="text-lg font-semibold text-foreground">
              Welcome to ChinaHub!
            </p>
            
            <p className="text-muted-foreground">
              We've sent a confirmation email to your inbox. Please click the link in the email to verify your account and complete your registration.
            </p>
            
            <div className="bg-secondary/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Didn't receive the email?</strong> Check your spam folder or contact our support team for assistance.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/auth")} 
              className="w-full"
            >
              Back to Sign In
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/")} 
              className="w-full"
            >
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupSuccess;