// FILE: src/pages/UpdatePassword.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle } from "lucide-react";

const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // ✅ Step 1: Check if the URL has the Supabase recovery token
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1)); // remove "#"
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (access_token && type === "recovery") {
      console.log("🔐 Recovery token found, setting Supabase session...");
      // ✅ Step 2: Set the session so user can update their password
      supabase.auth
        .setSession({ access_token, refresh_token: refresh_token || access_token })
        .then(({ error }) => {
          if (error) {
            console.error("❌ Error setting session:", error);
            setMessageType("error");
            setMessage("Invalid or expired reset link. Please try again.");
          } else {
            console.log("✅ Session set. User can now reset password.");
            setReady(true);
          }
        })
        .finally(() => setLoading(false));
    } else {
      console.error("⚠️ No valid recovery token found in URL.");
      setMessageType("error");
      setMessage("Invalid reset link or missing token.");
      setLoading(false);
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!password || password.length < 6) {
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

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setMessageType("success");
      setMessage("Your password has been updated successfully! Redirecting...");
      toast({
        title: "Password Updated ✅",
        description: "You can now sign in with your new password.",
      });

      setTimeout(() => navigate("/auth"), 3000);
    } catch (error: any) {
      console.error("Error updating password:", error);
      setMessageType("error");
      setMessage(error.message || "An unexpected error occurred. Please try again.");
      toast({
        title: "Update Failed",
        description: "Could not update your password. Please try the reset process again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Step 3: Handle page rendering states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Finalizing login, please wait...</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 text-center">
          <CardTitle>Reset Link Error</CardTitle>
          <CardDescription>{message || "Something went wrong with your reset link."}</CardDescription>
        </Card>
      </div>
    );
  }

  // ✅ Step 4: Show password form once session is valid
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
                {loading ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UpdatePassword;
