
import { Link, useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

const NavBar = () => {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out", description: "You have successfully logged out." });
    navigate("/auth");
  };

  return (
    <nav className="w-full flex items-center justify-between px-4 py-2 border-b bg-background fixed top-0 z-50">
      <Link to="/" className="text-xl font-bold">FraudGuard Pay</Link>
      <div className="flex items-center gap-2">
        {!user && (
          <Button asChild variant="outline">
            <Link to="/auth">Login/Signup</Link>
          </Button>
        )}
        {user && (
          <>
            <Button asChild variant="ghost">
              <Link to="/profile">
                <Avatar className="mr-2 h-8 w-8">
                  <AvatarFallback>{user.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                Profile
              </Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
