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
import { ArrowLeft } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const { state } = useLocation();
  const mode = state?.mode || 'talent';

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
    // This correctly sets the user_type metadata during signup
    const userType = mode === 'booker' ? 'booker' : 'talent';
    const { error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: { name: name, user_type: userType } } 
    });
    if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "Success!", description: "Please check your email to verify your account." });
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    } 
    
    // This is the smart redirect logic that runs AFTER a successful login
    if (data.user) {
      toast({ title: "Signed in successfully!" });
      
      const intent = state?.intent;
      const talentId = state?.talentId;
      const from = state?.from?.pathname || null;

      // Rule 1: If user is the admin, always go to the admin panel.
      if (data.user.email === 'admin@qtalent.live') {
        navigate('/admin');
      } 
      // Rule 2: Handle specific intents first
      else if (intent === 'event-form') {
        navigate('/your-event');
      }
      else if (intent === 'booking-form' && talentId) {
        navigate(`/talent/${talentId}`, { state: { openBookingForm: true } });
      }
      // Rule 3: If user was sent here from another page, send them back.
      else if (from) {
        navigate(from);
      } 
      // Rule 4: Otherwise, send them to their default dashboard.
      else {
        const { data: profile } = await supabase.from('talent_profiles').select('id').eq('user_id', data.user.id).maybeSingle();
        if (profile) {
            navigate('/talent-dashboard');
        } else {
            navigate('/booker-dashboard');
        }
      }
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