// FILE: src/pages/Auth.tsx

import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, CheckCircle } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  
  const { state } = useLocation();
  const mode = state?.mode || 'talent';
  const justRegistered = searchParams.get('registered') === 'true';

  const title = mode === 'booker' ? 'Welcome to Qtalent' : 'Join as a Talent';
  const description = mode === 'booker' ? 'Please sign in or sign up to proceed.' : 'Create your profile to get booked';
  
  // This effect redirects a user if they are ALREADY logged in and happen to land on this page.
  useEffect(() => {
    if (!authLoading && user) {
        navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Sign out any existing session before creating new account
      await supabase.auth.signOut();
      
      // This correctly sets the user_type metadata during signup
      const userType = mode === 'booker' ? 'booker' : 'talent';
      const { error } = await supabase.auth.signUp({
          email, 
          password, 
          options: { 
            emailRedirectTo: `${window.location.origin}/`,
            data: { name: name, user_type: userType } 
          } 
      });
      if (error) {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
          toast({ title: "Success!", description: "Please check your email to verify your account." });
      }
    } catch (error) {
      toast({ title: "Sign up failed", description: "An unexpected error occurred", variant: "destructive" });
    }
    
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Sign out any existing session before signing in
      await supabase.auth.signOut();
      
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      } 
      
      // This is the smart redirect logic that runs AFTER a successful login
      if (data.user) {
        toast({ title: "Signed in successfully!" });
        
        // CRITICAL: Give Supabase time to establish the session properly
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const intent = state?.intent;
        const talentId = state?.talentId;
        const from = state?.from?.pathname || null;

        // Rule 1: If user is the admin, always go to the admin panel.
        if (data.user.email === 'admin@qtalent.live') {
          navigate('/admin', { replace: true });
        } 
        // Rule 2: Handle specific intents first
        else if (intent === 'event-form') {
          navigate('/your-event', { replace: true });
        }
        else if (intent === 'booking-form' && talentId) {
          navigate(`/talent/${talentId}`, { state: { openBookingForm: true }, replace: true });
        }
        // Rule 3: If user was sent here from another page, send them back.
        else if (from && from !== '/auth' && from !== '/') {
          navigate(from, { replace: true });
        } 
        // Rule 4: Check user type from metadata (faster than DB query)
        else {
          const userType = data.user.user_metadata?.user_type;
          if (userType === 'talent') {
            navigate('/talent-dashboard', { replace: true });
          } else {
            navigate('/booker-dashboard', { replace: true });
          }
        }
      }
    } catch (error) {
      toast({ title: "Sign in failed", description: "An unexpected error occurred", variant: "destructive" });
    }
    
    setLoading(false);
  };

  if (authLoading && !user) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Button>
        
        {justRegistered && (
          <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">🎉 Congratulations!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Your talent profile has been created successfully! Please sign in below to access your dashboard.
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">{loading ? 'Signing In...' : 'Sign In'}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">{loading ? 'Creating Account...' : 'Create Account'}</Button>
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