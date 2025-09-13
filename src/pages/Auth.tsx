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
//9pm
type UserType = 'talent' | 'booker';
type AuthMode = 'login' | 'signup';

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>('talent');
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'LOGGED_OUT' && status !== 'LOADING') {
      if (status === 'TALENT_COMPLETE' || status === 'TALENT_NEEDS_ONBOARDING') {
        navigate('/talent-dashboard');
      } else if (status === 'BOOKER') {
        navigate('/booker-dashboard');
      } else {
        navigate('/');
      }
    }
  }, [status, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, user_type: userType } }
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
    // On success, the useAuth hook will detect the new session and redirect.
    setLoading(false);
  };

  if (status !== 'LOGGED_OUT') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {/* Your Original Auth JSX Here */}
    </div>
  );
};

export default Auth;