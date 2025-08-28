import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageSquare, ArrowLeft } from "lucide-react";

export default function OrderPaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');

  useEffect(() => {
    // Update document title
    document.title = "Payment Successful - ChinaHub";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">Payment Successful!</CardTitle>
          <CardDescription className="text-lg">
            Your order payment has been processed successfully
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {reference && (
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Payment Reference:</strong> {reference}
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3">What happens next?</h3>
            <ul className="space-y-2 text-blue-800 text-sm">
              <li>• The admin has been notified of your payment</li>
              <li>• You will receive updates on your order progress</li>
              <li>• Delivery notifications will be sent when your order ships</li>
              <li>• Contact support anytime for assistance</li>
            </ul>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Need Support?</h3>
            <p className="text-gray-700 text-sm mb-4">
              Our team is available to assist you with any questions about your order.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://wa.me/8619589456744"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Contact: +86 19589456744
              </a>
              <a
                href="https://wa.me/2348133628713"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Contact: +234 8133628713
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate('/dashboard')}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/contact')}
              className="flex-1"
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}