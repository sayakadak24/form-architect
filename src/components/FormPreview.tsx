
import { Card } from "@/components/ui/card";
import { FormElement } from "@/components/FormElement";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FormPreviewProps {
  elements: Array<{
    id: string;
    type: string;
    label: string;
    options?: string[];
    required?: boolean;
    branchingLogic?: {
      condition: string;
      targetId: string;
    };
  }>;
  responses?: Record<string, any>;
  onResponseChange?: (id: string, value: any) => void;
  formId?: string;
}

export const FormPreview = ({ elements, responses = {}, onResponseChange, formId }: FormPreviewProps) => {
  const [localResponses, setLocalResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if all required fields are filled
    const requiredFields = elements.filter(el => el.required);
    const missingFields = requiredFields.filter(field => {
      const response = responses[field.id] || localResponses[field.id];
      return !response || (Array.isArray(response) && response.length === 0);
    });

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const currentResponses = responses || localResponses;
      
      if (formId) {
        // If formId exists, submit to database
        const { error } = await supabase
          .from('form_responses')
          .insert({
            form_id: formId,
            responses: currentResponses
          });

        if (error) throw error;
        
        toast.success("Form submitted successfully!");
      } else {
        // If no formId (preview mode), just log responses
        console.log("Form responses:", currentResponses);
        toast.success("Form submitted in preview mode");
      }

      // Clear responses after successful submission
      if (onResponseChange) {
        elements.forEach(element => onResponseChange(element.id, ''));
      } else {
        setLocalResponses({});
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResponseChange = (id: string, value: any) => {
    if (onResponseChange) {
      onResponseChange(id, value);
    } else {
      setLocalResponses(prev => ({
        ...prev,
        [id]: value
      }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 animate-slide-in">
        <h2 className="text-2xl font-semibold mb-6">Form Preview</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {elements.length === 0 ? (
            <p className="text-center text-gray-400 py-12">
              Your form preview will appear here
            </p>
          ) : (
            <>
              {elements.map((element) => (
                <FormElement
                  key={element.id}
                  element={element}
                  isPreview={true}
                  allElements={elements}
                  responses={responses || localResponses}
                  onResponseChange={handleResponseChange}
                />
              ))}
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Form"}
              </Button>
            </>
          )}
        </form>
      </Card>
    </div>
  );
};
