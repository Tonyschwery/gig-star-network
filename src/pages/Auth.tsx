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
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { ArrowLeft, Mail } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "magiclink">("password");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { sendUserSignupEmails } = useEmailNotifications();

  const { state } = useLocation();
  const mode = state?.mode || "booker";
  const verificationMessage = state?.message; // Email verification message from redirect

  const title = mode === "booker" ? "Welcome to Qtalent" : "Talent Access";
  const description = "Sign in or create an account with a magic link.";

  // Get intent from state to show appropriate messaging
  const intent = state?.intent;
  const intentMessage =
    intent === "booking-form"
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

    // Signup ALWAYS requires password
    if (isSignUp && (!password || password.length < 6)) {
      toast({
        title: "Password required",
        description: "Password must be at least 6 characters for signup.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Signin with password method requires password
    if (!isSignUp && authMethod === "password" && (!password || password.length < 6)) {
      toast({
        title: "Password required",
        description: "Please enter your password (minimum 6 characters).",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // NOTE: The misplaced button was removed from here.

    try {
      // Check email via edge function
      const { data: emailCheck } = await supabase.functions.invoke("check-email-exists", {
        body: { email: email.toLowerCase().trim() },
      });

      // For sign up - check if user exists
      if (isSignUp && emailCheck?.exists) {
        toast({
          title: "Account already exists! 🔑",
          description: "This email is already registered. Please switch to 'Sign In' tab to access your account.",
          variant: "destructive",
          duration: 6000,
        });
        setLoading(false);
        return;
      }

      // For sign in - check if user doesn't exist
      if (!isSignUp && !emailCheck?.exists) {
        toast({
          title: "Account not found 🔍",
          description: "No account found with this email. Please switch to 'Sign Up' tab to create an account.",
          variant: "destructive",
          duration: 6000,
        });
        setLoading(false);
        return;
      }

      let error: any = null;

      if (isSignUp) {
        // Signup ALWAYS uses password (no magic link option)
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password: password,
          options: {
            data: { name: name, user_type: userType },
          },
        });
        error = signUpError;

        if (!error) {
          toast({
            title: "Account created! ✅",
            description: "Your account has been created successfully. Redirecting...",
            duration: 3000,
          });

          // Get the newly created user to send welcome emails
          const {
            data: { user: newUser },
          } = await supabase.auth.getUser();
          if (newUser) {
            // Send welcome emails (to user and admin notification)
            await sendUserSignupEmails(newUser.id, name, email.toLowerCase().trim());
          }

          setTimeout(() => navigate(state?.from?.pathname || "/"), 1000);
        }
      } else {
        // Signin can use password OR magic link
        if (authMethod === "password") {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password: password,
          });
          error = signInError;

          if (!error) {
            toast({
              title: "Welcome back! 👋",
              description: "You're now signed in. Redirecting...",
              duration: 3000,
            });
            setTimeout(() => navigate(state?.from?.pathname || "/"), 1000);
          }
        } else {
          // Magic link for signin only
          const redirectTo = new URL(`${window.location.origin}/auth/callback`);
          redirectTo.searchParams.set("state", JSON.stringify(state || {}));

          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: email.toLowerCase().trim(),
            options: {
              emailRedirectTo: redirectTo.toString(),
            },
          });
          error = otpError;

          if (!error) {
            toast({
              title: "Check your email! 📧",
              description: "Magic link sent! Check your inbox and spam folder (may take 1-2 minutes).",
              duration: 8000,
            });
            setEmailSent(true);
          }
        }
      }

      if (error) {
        console.error("Auth error:", error);
        let errorMessage = error.message;
        let errorTitle = "Authentication failed";

        if (error.message.includes("Invalid login credentials")) {
          errorTitle = "Incorrect password 🔒";
          errorMessage = "The password you entered is incorrect. Please try again.";
        } else if (error.message.includes("Email not confirmed")) {
          errorTitle = "Email not verified 📧";
          errorMessage = "Please check your email and click the verification link first.";
        } else if (error.message.includes("already registered")) {
          errorTitle = "Account exists! 🔑";
          errorMessage = "This email is already registered. Use 'Sign In' tab instead.";
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error("Unexpected auth error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
        <Button
          type="button"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>

            {/* Email Verification Message */}
            {verificationMessage && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      📧 Email Verification Required
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">{verificationMessage}</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      After verifying your email, return here to sign in.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {intentMessage && !verificationMessage && (
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
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Sign In Method</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={authMethod === "password" ? "default" : "outline"}
                          onClick={() => setAuthMethod("password")}
                          className="text-xs"
                        >
                          🔑 Password
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={authMethod === "magiclink" ? "default" : "outline"}
                          onClick={() => setAuthMethod("magiclink")}
                          className="text-xs"
                        >
                          ✉️ Magic Link
                        </Button>
                      </div>
                    </div>
                  </div>

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
                  </div>

                  {authMethod === "password" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>

                        {/* 👇 THIS IS THE CORRECT LOCATION FOR THE BUTTON 👇 */}
                        <button
                          type="button"
                          onClick={() => navigate("/reset-password")}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    💡{" "}
                    {authMethod === "password"
                      ? "Enter your password to sign in"
                      : "We'll send a magic link to your email"}
                    . New here? Switch to "Sign Up" tab
                  </p>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Signing In..." : authMethod === "password" ? "Sign In" : "Send Magic Link"}
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">Minimum 6 characters required</p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    💡 Create a secure password to access your account. Already registered? Use "Sign In" tab
                  </p>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Creating Account..." : "Create Account"}
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
