
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/hooks/useAuthUser";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthUser();

  // If already logged in, redirect
  if (!authLoading && user) {
    navigate("/");
    return null;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let result;
      if (mode === "login") {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }
      if (result.error) {
        toast({ title: "Auth Error", description: result.error.message, variant: "destructive" });
      } else if (result.data.session || (mode === "signup" && !result.error)) {
        toast({
          title: mode === "signup" ? "Signup successful!" : "Welcome!",
          description: mode === "signup"
            ? "Check your inbox to confirm your email before logging in."
            : "Logged in successfully."
        });
        if (mode === "login") navigate("/");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{mode === "login" ? "Login" : "Sign Up"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleAuth}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
            </Button>
          </form>
          <div className="flex flex-col items-center pt-4">
            {mode === "login" ? (
              <>
                <span>Don't have an account?</span>
                <Button variant="link" className="px-0" onClick={() => setMode("signup")}>Sign Up</Button>
              </>
            ) : (
              <>
                <span>Already have an account?</span>
                <Button variant="link" className="px-0" onClick={() => setMode("login")}>Login</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
