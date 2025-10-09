// FILE: src/pages/Auth.tsx

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const mode = state?.mode || "booker";

  const title = mode === "booker" ? "Welcome to Qtalent" : "Talent Access";
  const description = "Sign in or create an account with a magic link.";
  
  // Get intent from state to show appropriate messaging
  const intent = state?.intent;
  const intentMessage = intent === "booking-form" 
    ? "Sign in to complete your booking request" 
    : intent === "event-form"
    ? "Sign in to get personalized recommendations"
    : null;

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const handleAuthAction = async (isSignUp: boolean) => {
    setLoading(true);
    const userType = mode === "booker" ? "booker" : "talent";

    if (isSignUp && !name) {
      toast({
        title: "Name is required",
        description: "Please enter your full name to sign up.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if user already exists (for signup only)
    if (isSignUp) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Account already exists!",
          description: "This email is already registered. Please use the 'Sign In' tab instead.",
          variant: "destructive",
          duration: 5000,
        });
        setLoading(false);
        return;
      }
    }

    const redirectTo = new URL(`${window.location.origin}/auth/callback`);
    redirectTo.searchParams.set("state", JSON.stringify(state || {}));

    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: redirectTo.toString(),
        data: isSignUp ? { name: name, user_type: userType } : {},
      },
    });

    if (error) {
      // Handle specific error cases
      let errorMessage = error.message;
      let errorTitle = "Authentication failed";

      if (error.message.includes("already registered") || error.message.includes("duplicate")) {
        errorTitle = "Account already exists!";
        errorMessage = "This email is already registered. Please use 'Sign In' instead.";
      } else if (error.message.includes("not found") && !isSignUp) {
        errorTitle = "Account not found";
        errorMessage = "No account found with this email. Please 'Sign Up' first.";
      }

      toast({ 
        title: errorTitle, 
        description: errorMessage, 
        variant: "destructive",
        duration: 5000,
      });
    } else {
      toast({ 
        title: "Check your email! 📧", 
        description: "Magic link sent! Check your inbox and spam folder. Click the link to sign in (it may take 1-2 minutes to arrive).",
        duration: 8000,
      });
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
        <div className="w-full max-w-md text-center space-y-4">
          <Mail className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">📧 Check Your Email</h1>
          <div className="space-y-2">
            <p className="text-muted-foreground">A magic link has been sent to</p>
            <p className="font-semibold text-lg">{email}</p>
          </div>
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 text-left">
            <p className="text-sm font-medium mb-2">💡 What to do next:</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Check your inbox and spam folder</li>
              <li>The email may take 1-2 minutes to arrive</li>
              <li>Click the link to complete sign in</li>
              <li>If you already have an account, you'll be signed in automatically</li>
            </ul>
          </div>
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
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
            {intentMessage && (
              <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium text-primary mb-2">{intentMessage}</p>
                <p className="text-xs text-muted-foreground">
                  ✨ <strong>New here?</strong> Switch to the "Sign Up" tab to create your account first!
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAuthAction(false);
                  }}
                  className="space-y-4 pt-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Already have an account? Use this tab. New here? Switch to "Sign Up"
                    </p>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Sending Link..." : "Sign In with Magic Link"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAuthAction(true);
                  }}
                  className="space-y-4 pt-4"
                >
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
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 First time here? Perfect! Already registered? Use "Sign In" tab
                    </p>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Sending Link..." : "Sign Up with Magic Link"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
