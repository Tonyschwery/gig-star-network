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
    // LOG #1: This tells us if the new version of the file is even loading.
    console.log("[UpdatePassword] Component mounted. Checking for session...");

    // 1. Immediately check if a session already exists from the recovery link.
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If a session is found, the user is authenticated. We can show the form.
      if (session) {
        // LOG #2: This is the log that confirms the fix is working.
        console.log("[UpdatePassword] Active session found on mount. Showing form.");
        setIsReady(true);
      }
    });

    // 2. Set up the listener as a fallback.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // LOG #3: This is a fallback log.
      console.log(`[UpdatePassword] onAuthStateChange event received: ${event}`);
      if (event === "PASSWORD_RECOVERY") {
        console.log("[UpdatePassword] PASSWORD_RECOVERY event caught by listener. Showing form.");
        setIsReady(true);
      }
    });

    // 3. Cleanup the listener when the component unmounts.
    return () => {
      console.log("[UpdatePassword] Component unmounting. Cleaning up listener.");
      subscription.unsubscribe();
    };
  }, []); // <-- Use an empty dependency array to run this only once.

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
            <CardTitle>Verifying Link</CardTitle>
          </CardHeader>
          <CardContent>
            {message ? (
              <>
                <p className="text-muted-foreground">{message}</p>
                <Button onClick={() => navigate("/auth/forgot-password")} className="mt-4">
                  Request a New Link
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground animate-pulse">Please wait...</p>
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
