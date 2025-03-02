
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FormPreview } from "@/components/FormPreview";
import { toast } from "sonner";

const ViewForm = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/');
      }
      setSession(session);
    });

    const fetchForm = async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (error) {
        toast.error("Form not found");
        navigate('/');
        return;
      }

      setForm(data);
    };

    fetchForm();
  }, [formId, navigate]);

  if (!form) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-semibold text-primary">{form.title || 'Untitled Form'}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-12 animate-fade-in">
        <FormPreview 
          elements={form.elements} 
          responses={responses}
          onResponseChange={(id, value) => {
            setResponses(prev => ({
              ...prev,
              [id]: value
            }));
          }}
          formId={formId}
          needsValidation={form.needs_validation}
          validationQuery={form.validation_query}
        />
      </main>
    </div>
  );
};

export default ViewForm;
