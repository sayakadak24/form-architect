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
import { Pencil } from "lucide-react";
import { ensureValidToken, initiateInteractiveLogin } from "@/utils/microsoftAuth";

interface FormType {
  id: string;
  title: string;
  excel_url?: string;
  sheet_name?: string;
  config_file_path?: string;
  created_at: string;
  needs_validation?: boolean;
  validation_query?: string;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        console.log("Checking session...");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setError(`Authentication error: ${error.message}`);
          setLoading(false);
          return;
        }
        
        console.log("Session data:", data.session);
        setSession(data.session);
        
        if (data.session?.user?.id) {
          await checkIfAdmin(data.session.user.id);
          
          if (isAdmin) {
            const hasValidToken = await ensureValidToken();
            if (!hasValidToken) {
              console.log("No valid Microsoft token available");
            }
          }
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Unexpected error during session check:", err);
        setError(`Unexpected error: ${err.message}`);
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session?.user?.id);
      setSession(session);
      if (session?.user?.id) {
        checkIfAdmin(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchForms();
    }
  }, [isAdmin]);

  const checkIfAdmin = async (userId: string) => {
    try {
      console.log("Checking if user is admin:", userId);
      if (!userId) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("Admin check error:", error);
        setError(`Database error: ${error.message}`);
        setIsAdmin(false);
      } else {
        console.log("Admin check result:", data);
        setIsAdmin(!!data);
      }
    } catch (err: any) {
      console.error("Unexpected error during admin check:", err);
      setError(`Unexpected error: ${err.message}`);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      console.log("Fetching forms...");
      setLoading(true);
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching forms:", error);
        setError(`Failed to load forms: ${error.message}`);
        throw error;
      }

      console.log("Forms fetched:", data);
      setForms(data || []);
    } catch (error: any) {
      console.error("Unexpected error fetching forms:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Attempting admin login...");
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        setError(`Login failed: ${error.message}`);
        throw error;
      }
      
      console.log("Login successful:", data);
      toast.success("Login successful");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log("Logging out...");
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        setError(`Logout failed: ${error.message}`);
        throw error;
      }
      
      toast.success("Logged out successfully");
      setSession(null);
      setIsAdmin(false);
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      console.log("Uploading config file:", file.name);
      setUploading(true);

      const filePath = `${session.user.id}/config.json`;
      const { error: uploadError } = await supabase.storage
        .from('configs')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Config upload error:", uploadError);
        throw uploadError;
      }
      
      toast.success("Config file uploaded successfully!");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    try {
      console.log("Deleting form:", formId);
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) {
        console.error("Form delete error:", error);
        throw error;
      }
      
      toast.success("Form deleted successfully!");
      fetchForms();
    } catch (error: any) {
      console.error("Form delete error:", error);
      toast.error(error.message);
    }
  };

  const handleEditForm = (formId: string) => {
    navigate(`/create-form?formId=${formId}`);
  };

  const connectMicrosoftAccount = async () => {
    try {
      console.log("Initiating Microsoft account connection");
      initiateInteractiveLogin();
    } catch (error: any) {
      console.error("Microsoft connection error:", error);
      toast.error("Failed to connect Microsoft account: " + error.message);
    }
  };

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">Error</h1>
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">Loading</h1>
          <p className="text-gray-500 mb-4">Please wait...</p>
        </Card>
      </div>
    );
  }

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
              <div className="flex justify-end mt-1">
                <a 
                  href="/password-reset" 
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
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
          <div className="flex gap-2">
            <Button onClick={connectMicrosoftAccount} variant="outline">
              Connect Microsoft
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
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
                      variant="outline"
                      className="px-3"
                      onClick={() => handleEditForm(form.id)}
                    >
                      <Pencil className="h-4 w-4" />
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
