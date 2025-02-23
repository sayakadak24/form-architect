
import { Button } from "@/components/ui/button";
import { FormBuilder } from "@/components/FormBuilder";
import { useState, useEffect } from "react";
import { FormPreview } from "@/components/FormPreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from 'react-router-dom';
import { Icons } from "@/components/ui/icons";
import { useNavigate } from "react-router-dom";

interface FormType {
  id: string;
  title: string;
  excel_url?: string;
  config_file_path?: string;
  created_at: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [forms, setForms] = useState<FormType[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkIfAdmin(session?.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkIfAdmin(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchForms();
    }
  }, [isAdmin]);

  const checkIfAdmin = async (userId: string | undefined) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    const { data } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', userId)
      .single();

    setIsAdmin(!!data);
  };

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleConfigFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const { data, error } = await supabase
        .from('admin_users')
        .update({ 
          config_file_path: file.name,
          email: session?.user?.email // Include email to match the allowed fields
        })
        .eq('id', session?.user?.id)
        .select();

      if (error) throw error;
      toast.success("Config file updated successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;
      toast.success("Form deleted successfully!");
      fetchForms();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-semibold mb-6">Admin Login</h1>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
          <p className="text-gray-500 mb-4">
            This area is restricted to administrators only.
          </p>
          <Button onClick={handleLogout}>Logout</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-primary">Form Architect</h1>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="grid gap-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-xl font-semibold">Your Forms</h2>
            <div className="flex gap-4">
              <div>
                <input
                  type="file"
                  id="configFile"
                  className="hidden"
                  onChange={handleConfigFileUpload}
                  accept=".json"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('configFile')?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Config File'}
                </Button>
              </div>
              <Link to="/create-form">
                <Button>
                  <Icons.plus className="h-4 w-4 mr-2" />
                  Create New Form
                </Button>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : forms.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-500 mb-4">You haven't created any forms yet.</p>
              <Link to="/create-form">
                <Button>Create Your First Form</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {forms.map((form) => (
                <Card key={form.id} className="p-6">
                  <h3 className="font-semibold mb-2">{form.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Created: {new Date(form.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Link to={`/form/${form.id}`} className="flex-1">
                      <Button variant="secondary" className="w-full">
                        View Form
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="px-3"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/form/${form.id}`);
                        toast.success('Form link copied to clipboard!');
                      }}
                    >
                      <Icons.copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      className="px-3"
                      onClick={() => handleDeleteForm(form.id)}
                    >
                      <Icons.trash className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
