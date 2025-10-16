// FILE: src/pages/ResetPassword.tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();

  // No form handling needed - admin will reset passwords

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Need to Reset Your Password?</CardTitle>
          <CardDescription>
            Contact our support team and they'll help you reset your password securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              For security reasons, password resets are handled by our admin team. Please contact support with your registered email address.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">1</div>
              <p className="text-sm text-muted-foreground">Contact admin at: <strong className="text-foreground">qtalentslive@gmail.com</strong></p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">2</div>
              <p className="text-sm text-muted-foreground">Provide your registered email address</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">3</div>
              <p className="text-sm text-muted-foreground">Admin will reset your password and notify you</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={() => window.location.href = 'mailto:qtalentslive@gmail.com?subject=Password Reset Request'}
          >
            Contact Support
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => navigate("/auth")}
          >
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;
