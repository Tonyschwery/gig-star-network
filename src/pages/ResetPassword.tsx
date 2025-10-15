// FILE: src/pages/ResetPassword.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.toLowerCase().trim();
      const { data, error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/#/update-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password reset email sent! 📧",
        description: "Check your email for a link to reset your password.",
        duration: 8000,
      });
      setResetEmailSent(true);
    } catch (error: any) {
      console.error("[ResetPassword] Password reset failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // View: Confirmation screen after email has been sent
  if (resetEmailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <Mail className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">🔑 Password Reset Email Sent</h1>
          <div className="space-y-2">
            <p className="text-muted-foreground">A password reset link has been sent to</p>
            <p className="font-semibold text-lg">{email}</p>
          </div>
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 text-left">
            <p className="text-sm font-medium mb-2">💡 What to do next:</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Check your inbox and spam folder</li>
              <li>The email may take 1-2 minutes to arrive</li>
              <li>Click the link to set a new password</li>
              <li>You can close this window after clicking the link</li>
            </ul>
          </div>

          <Button variant="outline" onClick={handleForgotPassword} disabled={loading} className="mt-4">
            {loading ? "Sending..." : "📧 Resend Reset Email"}
          </Button>

          <Button variant="ghost" onClick={() => navigate("/auth")} className="mt-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // View: Form to request a password reset
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => navigate("/auth")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sign In
        </Button>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset Your Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleForgotPassword();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  💡 <strong>Note:</strong> This works for all accounts, whether you signed up with a password or magic
                  link. After clicking the link in your email, you'll be able to set a new password.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
