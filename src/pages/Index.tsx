
import { Button } from "@/components/ui/button";
import { FormBuilder } from "@/components/FormBuilder";
import { useState, useEffect } from "react";
import { FormPreview } from "@/components/FormPreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { Link } from 'react-router-dom';

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
  const [savedFormId, setSavedFormId] = useState<string | null>(null);

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
      const { data, error } = await supabase.from('forms').insert({
        user_id: session.user.id,
        title: 'Untitled Form',
        elements: elements as unknown as Json,
      }).select();

      if (error) throw error;
      
      setSavedFormId(data[0].id);
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
        {savedFormId && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-2">Share this link with others to fill out your form:</p>
            <div className="flex items-center gap-4">
              <code className="bg-gray-100 px-3 py-2 rounded flex-1">
                {window.location.origin}/form/{savedFormId}
              </code>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/form/${savedFormId}`);
                  toast.success('Link copied to clipboard!');
                }}
                variant="outline"
              >
                Copy Link
              </Button>
              <Link to={`/form/${savedFormId}`} target="_blank">
                <Button variant="outline">Open Form</Button>
              </Link>
            </div>
          </div>
        )}
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
