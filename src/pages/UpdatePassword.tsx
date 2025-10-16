// FILE: src/pages/UpdatePassword.tsx
import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // ✅ USE SHARED CLIENT
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle } from "lucide-react";

const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false); // Controls if the form is shown
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log("[UpdatePassword] Component mounted");
    
    // Check if we came from recovery flow
    const fromRecovery = sessionStorage.getItem('isPasswordRecovery');
    
    // Wait a moment for session to be fully available
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('[UpdatePassword] Session check:', { 
        hasSession: !!session, 
        fromRecovery,
        error 
      });
      
      if (session) {
        console.log('[UpdatePassword] Session found, showing form');
        setIsReady(true);
      } else if (fromRecovery) {
        // Give it one more second (session might still be persisting)
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setIsReady(true);
          } else {
            setMessage('Session expired. Please request a new reset link.');
            setMessageType('error');
          }
        }, 1000);
      } else {
        setMessage('Invalid or expired reset link. Please request a new one.');
        setMessageType('error');
      }
    };
    
    checkSession();
    
    // Clean up recovery flag when component unmounts
    return () => {
      sessionStorage.removeItem('isPasswordRecovery');
    };
  }, []);

  const handleUpdatePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Your new password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Do Not Match",
        description: "Please ensure both password fields are identical.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("Update error:", error);
      setMessageType("error");
      setMessage(error.message || "An unexpected error occurred.");
      toast({
        title: "Update Failed",
        description: "Could not update your password. Try again.",
        variant: "destructive",
      });
      setLoading(false);
    } else {
      // 🔐 Clear the recovery flag after successful password update
      sessionStorage.removeItem('isPasswordRecovery');
      console.log("[UpdatePassword] Password updated successfully. Recovery flag cleared.");
      
      setMessageType("success");
      setMessage("Your password has been updated successfully! Redirecting...");
      toast({
        title: "Password Updated ✅",
        description: "You can now sign in with your new password.",
      });

      setTimeout(() => navigate("/auth"), 3000);
    }
  };

  // Main content logic
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>{message ? 'Link Issue' : 'Verifying Link'}</CardTitle>
          </CardHeader>
          <CardContent>
            {message ? (
              <>
                <div
                  className={`flex items-center gap-2 rounded-md p-3 text-sm mb-4 ${
                    messageType === "success"
                      ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                      : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <p>{message}</p>
                </div>
                <div className="space-y-2">
                  <Button onClick={() => navigate("/reset-password")} className="w-full">
                    Request a New Reset Link
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline" 
                    className="w-full"
                  >
                    Retry Verification
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground animate-pulse">Verifying your reset link...</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password update form is shown when `isReady` is true
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Set a New Password</CardTitle>
            <CardDescription>
              Create a new, secure password for your account. It must be at least 6 characters long.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
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
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UpdatePassword;
