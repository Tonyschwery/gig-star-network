import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Lock, ArrowLeft } from "lucide-react";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'booker' | 'talent'>('booker');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendUserSignupEmails } = useEmailNotifications();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check user type and redirect appropriately
        const userMetadata = session.user.user_metadata;
        const isBooker = userMetadata?.user_type === 'booker' || !userMetadata?.user_type;
        
        if (isBooker) {
          navigate("/booker-dashboard");
        } else {
          // Check if talent has profile
          const { data: hasProfile } = await supabase.rpc('check_talent_profile_exists', {
            user_id_to_check: session.user.id
          });
          
          if (hasProfile) {
            navigate("/talent-dashboard");
          } else {
            navigate("/talent-onboarding");
          }
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = userType === 'talent' 
        ? `${window.location.origin}/talent-onboarding`
        : `${window.location.origin}/booker-dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name,
            user_type: userType
          }
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please try logging in instead.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Account created successfully!",
          description: `Please check your email to verify your account${userType === 'talent' ? ', then complete your talent profile' : ''}.`,
        });

        // Send welcome emails
        try {
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await sendUserSignupEmails(newUser.id, name, email);
          }
        } catch (emailError) {
          console.error('Error sending welcome emails:', emailError);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        
        // Redirect based on user type
        const userMetadata = data.user.user_metadata;
        const isBooker = userMetadata?.user_type === 'booker' || !userMetadata?.user_type;
        
        if (isBooker) {
          navigate("/booker-dashboard");
        } else {
          // Check if talent has profile
          const { data: hasProfile } = await supabase.rpc('check_talent_profile_exists', {
            user_id_to_check: data.user.id
          });
          
          if (hasProfile) {
            navigate("/talent-dashboard");
          } else {
            navigate("/talent-onboarding");
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Card className="glass-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Welcome to QTalents</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full hero-button" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    
                    {/* User Type Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">I want to:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={userType === 'booker' ? 'default' : 'outline'}
                          onClick={() => setUserType('booker')}
                          className="text-xs"
                        >
                          Book Talents
                        </Button>
                        <Button
                          type="button"
                          variant={userType === 'talent' ? 'default' : 'outline'}
                          onClick={() => setUserType('talent')}
                          className="text-xs"
                        >
                          Become a Talent
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full hero-button" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
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

export default Login;