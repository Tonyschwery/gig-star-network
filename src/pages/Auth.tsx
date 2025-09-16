import { useState } from "react";
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
  const { loading: authLoading } = useAuth(); // We no longer need the user object here
  
  const { state } = useLocation();
  const mode = state?.mode || 'talent';

  const title = mode === 'booker' ? 'Log in to Continue' : 'Join as a Talent';
  const description = mode === 'booker' ? 'Please create an account or sign in to proceed.' : 'Create your profile to get booked';

  // THE FIX: The redirect useEffect has been removed from this file.
  // The useAuth hook will now handle all post-login navigation.

  const handleSignUp = async (e: React.FormEvent) => {
    // ... (This function is unchanged)
    e.preventDefault();
    setLoading(true);
    const userType = mode === 'booker' ? 'booker' : 'talent';
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name, user_type: userType } } });
    if (error) toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    else toast({ title: "Success!", description: "Please check your email to verify your account." });
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Signed in successfully!" });
      // The useAuth hook will now handle the redirect automatically.
    }
    setLoading(false);
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* ... (The rest of the JSX is unchanged) ... */}
    </div>
  );
};

export default Auth;