// FILE: src/pages/Auth.tsx

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Mail } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const { state } = useLocation();
  const mode = state?.mode || "talent";

  const title = mode === "booker" ? "Welcome to Qtalent" : "Join as a Talent";
  const description = mode === "booker" ? "Sign in or sign up with a magic link." : "Create your profile to get booked";

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/"); // Redirect logged-in users away
    }
  }, [user, authLoading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const userType = mode === "booker" ? "booker" : "talent";

    // FIX: Pass the state in query parameters (?) instead of the hash (#)
    const redirectTo = new URL(`${window.location.origin}/auth/callback`);
    redirectTo.searchParams.set("state", JSON.stringify(state || {}));

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo.toString(),
        data: {
          ...(name && { name: name, user_type: userType }),
        },
      },
    });

    if (error) {
      toast({ title: "Authentication failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email!", description: "We've sent a magic link to your inbox." });
      setEmailSent(true);
    }

    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Mail className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Check Your Email</h1>
          <p className="mt-2 text-muted-foreground">A sign-in link has been sent to</p>
          <p className="font-semibold">{email}</p>
          <Button variant="ghost" onClick={() => navigate("/")} className="mt-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Button>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4 pt-4">
              {/* Only show Full Name for the talent sign-up flow */}
              {mode === "talent" && (
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}
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
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending Link..." : "Send Magic Link"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
