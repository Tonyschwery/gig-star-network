import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle } from "lucide-react";

// TODO: Replace with your actual Supabase URL and public anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://myxizupccweukrxfdqmc.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eGl6dXBjY3dldWtyeGZkcW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5Mjk4ODQsImV4cCI6MjA2ODUwNTg4NH0.KiikwI4cv2x4o0bPavrHtofHD8_VdK7INEAWdHsNRpE";

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === "https://myxizupccweukrxfdqmc.supabase.co") {
  console.error(
    "Supabase URL and anon key are required. Make sure to set them in your environment variables or directly in the code.",
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    const handleRecovery = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token"); // the recovery token
      const type = params.get("type");

      if (type !== "recovery" || !token) {
        setMessage("Invalid or missing recovery token.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      try {
        // Exchange the recovery token for a session
        const { data, error } = await supabase.auth.updateUser(
          {
            // no new fields yet; we just validate token to allow password reset
            password: "",
          },
          { accessToken: token },
        );

        if (error) {
          console.error("❌ Error validating recovery token:", error);
          setMessage("Invalid or expired recovery link.");
          setMessageType("error");
          setLoading(false);
          return;
        }

        // Token valid, show form
        setReady(true);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setMessage("Something went wrong.");
        setMessageType("error");
        setLoading(false);
      }
    };

    handleRecovery();
  }, []);

  const handleUpdatePassword = async (e: FormEvent<HTMLFormElement>) => {
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
      // With the session set, we can now update the user's password.
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
        description: "Could not update your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Render a loading state while we process the recovery link.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Verifying recovery link, please wait...</p>
      </div>
    );
  }

  // If the link was invalid or expired, show an error message.
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Reset Link Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{message || "Something went wrong with your reset link."}</p>
            <Button onClick={() => navigate("/auth/forgot-password")} className="mt-4">
              Request a New Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If ready, show the password update form.
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
                      ? "bg-green-50 text-green-800 dark:bg-green-950 dark:green-200"
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
