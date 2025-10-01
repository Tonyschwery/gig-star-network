import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { forceClearAuth } from "@/lib/auth-utils";
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
  const mode = state?.mode || "talent";

  const title = mode === "booker" ? "Welcome to Qtalent" : "Join as a Talent";
  const description = mode === "booker" ? "Please sign in or sign up to proceed." : "Create your profile to get booked";

  // Clear old session/cache only when visiting Auth page
  useEffect(() => {
    const clearOldSession = async () => {
      await forceClearAuth({ fullClear: true });
    };
    clearOldSession();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) navigate("/");
  }, [user, authLoading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forceClearAuth({ fullClear: true });
      const userType = mode === "booker" ? "booker" : "talent";
      const redirectTo = userType === "talent" ? `${window.location.origin}/talent-onboarding` : `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { name, user_type: userType },
        },
      });

      if (error) toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      else toast({ title: "Success!", description: "Please check your email to verify your account." });
    } catch (err) {
      toast({ title: "Sign up failed", description: "Unexpected error", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forceClearAuth({ fullClear: true });
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data.user) {
        toast({ title: "Signed in successfully!" });

        const intent = state?.intent;
        const talentId = state?.talentId;
        const from = state?.from?.pathname || null;

