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
//8pm
type UserType = 'talent' | 'booker';

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>('talent');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { status } = useAuth();

  useEffect(() => {
    // If the user is logged in (i.e., status is not LOGGED_OUT or LOADING),
    // they should not be on this page. Send them home.
    if (status !== 'LOGGED_OUT' && status !== 'LOADING') {
      navigate("/");
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

  // If the status isn't LOGGED_OUT yet, it means we are either loading or about to redirect.
  if (status !== 'LOGGED_OUT') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render the form if the user is confirmed to be logged out.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Auth page JSX from your previous version, which was well-structured */}
    </div>
  );
};

export default Auth;