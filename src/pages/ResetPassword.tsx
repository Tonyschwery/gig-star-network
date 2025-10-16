// FILE: src/pages/ResetPassword.tsx
import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // ✅ USE SHARED CLIENT
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle } from "lucide-react";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const trimmedEmail = email.toLowerCase().trim();
      
      // 🔐 Route through AuthCallback for centralized token processing
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log("[ResetPassword] Sending reset email with redirectTo:", redirectUrl);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setMessageType("success");
      setMessage("Recovery email sent! Check your inbox for the link.");
      toast({
        title: "Recovery Email Sent ✅",
        description: "Check your email and follow the instructions to reset your password.",
      });
    } catch (err: any) {
      console.error("Reset password error:", err);
      setMessageType("error");
      setMessage(err.message || "Failed to send recovery email.");
      toast({
        title: "Failed",
        description: "Could not send recovery email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Forgot Your Password?</CardTitle>
            <CardDescription>Enter your email to receive a password reset link.</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {message && (
                <div
                  className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                    messageType === "success"
                      ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                      : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
                  }`}
                >
                  {messageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <p>{message}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending Reset Link..." : "Send Reset Link"}
              </Button>

              <Button variant="secondary" onClick={() => navigate("/auth")} className="w-full">
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
