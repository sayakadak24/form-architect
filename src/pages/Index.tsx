
import { Button } from "@/components/ui/button";
import { FormBuilder } from "@/components/FormBuilder";
import { useState, useEffect } from "react";
import { FormPreview } from "@/components/FormPreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FormElementType {
  id: string;
  type: string;
  label: string;
  options?: string[];
  required?: boolean;
  branchingLogic?: {
    condition: string;
    targetId: string;
  };
}

const Index = () => {
  const [previewMode, setPreviewMode] = useState(false);
  const [elements, setElements] = useState<FormElementType[]>([]);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
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

  const handleSave = async () => {
    if (!session) {
      toast.error("Please login to save your form");
      return;
    }

    try {
      const { error } = await supabase.from('forms').insert({
        user_id: session.user.id,
        title: 'Untitled Form',
        elements: elements
      });

      if (error) throw error;
      toast.success("Form saved successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-primary">Form Architect</h1>
          <div className="flex gap-4">
            {session ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setPreviewMode(!previewMode)}
                  className="text-accent hover:text-accent/80"
                >
                  {previewMode ? "Edit" : "Preview"}
                </Button>
                <Button onClick={handleSave} className="bg-accent hover:bg-accent/90">
                  Save Form
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={handleLogin} className="bg-accent hover:bg-accent/90">
                Login with Google
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-12 animate-fade-in">
        {previewMode ? (
          <FormPreview elements={elements} />
        ) : (
          <FormBuilder elements={elements} setElements={setElements} />
        )}
      </main>
    </div>
  );
};

export default Index;
