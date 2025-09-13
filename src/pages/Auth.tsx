import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Lock, ArrowLeft, Briefcase } from "lucide-react";
//gemini 13 sep
// Define types for clarity
type UserType = 'talent' | 'booker';
type AuthMode = 'login' | 'signup';

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>('talent');
  const [authMode, setAuthMode] = useState<AuthMode>('signup'); // NEW: State for Login/Signup tabs
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Redirect already logged-in users away from this page
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name, user_type: userType }
      }
    });
    if (error) {
      toast({ title: "Error signing up", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "Please check your email to verify your account." });
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Error signing in", description: error.message, variant: "destructive" });
    }
    // On success, the useAuth & App components will handle redirecting the user.
    setLoading(false);
  };

  if (authLoading || (!authLoading && user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </div>
        <Card className="glass-card">
          <CardHeader className="text-center">
            {/* Title now changes based on whether you are logging in or signing up */}
            <CardTitle className="text-2xl text-foreground">
              {authMode === 'login' 
                ? 'Welcome Back' 
                : userType === 'talent' ? 'Become a Talent' : 'Book a Talent'}
            </CardTitle>
            <CardDescription>
              {authMode === 'login'
                ? 'Login to access your dashboard'
                : userType === 'talent' ? 'Create your profile and start getting booked' : 'Find and book amazing talent for your events'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* THE FIX: The Booker/Talent switch is now only shown when the 'signup' tab is active */}
            {authMode === 'signup' && (
              <Tabs value={userType} onValueChange={(value) => setUserType(value as UserType)} className="w-full mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="talent"><User className="h-4 w-4 mr-2" />Become Talent</TabsTrigger>
                  <TabsTrigger value="booker"><Briefcase className="h-4 w-4 mr-2" />Book Talent</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            
            {/* The Login/Signup tabs now control the `authMode` state */}
            <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as AuthMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                  <Button type="submit" className="w-full hero-button" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full hero-button" disabled={loading}>
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