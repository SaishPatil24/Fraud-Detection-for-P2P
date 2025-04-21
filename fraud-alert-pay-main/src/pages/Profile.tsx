
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user, loading } = useAuthUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ username: string | null }>({ username: "" });
  const [editUsername, setEditUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user) {
      // Fetch profile
      supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
          } else if (data) {
            setProfile({ username: data.username });
            setEditUsername(data.username ?? "");
          }
        });
    }
  }, [user, loading, navigate, toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      username: editUsername,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) {
      toast({ title: "Update Error", description: error.message, variant: "destructive" });
    } else {
      setProfile({ username: editUsername });
      toast({ title: "Profile Updated", description: "Your username has been updated." });
    }
    setSaving(false);
  };

  if (!user) return null;
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSave}>
            <div>
              <Label>Email</Label>
              <Input type="email" value={user.email || ""} readOnly className="bg-gray-100" />
            </div>
            <div>
              <Label>Username</Label>
              <Input
                value={editUsername}
                onChange={e => setEditUsername(e.target.value)}
                disabled={saving}
                placeholder="Choose a username"
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving || !editUsername.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
