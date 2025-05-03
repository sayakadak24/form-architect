
import { Card } from "@/components/ui/card";
import { FormElement } from "@/components/FormElement";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
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
    validation?: {
      sql?: string;
      errorMessage?: string;
    };
  }>;
  responses?: Record<string, any>;
  onResponseChange?: (id: string, value: any) => void;
  formId?: string;
}

export const FormPreview = ({ elements, responses = {}, onResponseChange, formId }: FormPreviewProps) => {
  const [localResponses, setLocalResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean>>({});
  const [allValidated, setAllValidated] = useState(true);

  // Calculate if all required fields are valid
  useEffect(() => {
    const requiredElements = elements.filter(el => el.required);
    const currentResponses = responses || localResponses;
    
    // Check if all required fields are filled and valid
    const missingFields = requiredElements.filter(field => {
      const response = currentResponses[field.id];
      const isEmpty = !response || (Array.isArray(response) && response.length === 0);
      const isInvalid = field.validation?.sql && validationStatus[field.id] === false;
      
      return isEmpty || isInvalid;
    });

    // Check if any field with validation is invalid
    const invalidFields = elements.filter(field => 
      field.validation?.sql && validationStatus[field.id] === false
    );

    setAllValidated(missingFields.length === 0 && invalidFields.length === 0);
  }, [elements, responses, localResponses, validationStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if all required fields are filled
    const requiredFields = elements.filter(el => el.required);
    const currentResponses = responses || localResponses;
    
    const missingFields = requiredFields.filter(field => {
      const response = currentResponses[field.id];
      return !response || (Array.isArray(response) && response.length === 0);
    });

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    // Check for validation errors
    const invalidFields = elements.filter(field => 
      field.validation?.sql && validationStatus[field.id] === false
    );

    if (invalidFields.length > 0) {
      toast.error(`Please correct the invalid fields: ${invalidFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const currentResponses = responses || localResponses;
      
      // Send data to Edge Function
      const { error: functionError } = await supabase.functions.invoke('update-excel', {
        body: {
          formData: currentResponses,
          formId: formId
        }
      });

      if (functionError) throw functionError;
      
      toast.success("Form submitted successfully!");

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

  const handleValidationChange = (id: string, isValid: boolean) => {
    setValidationStatus(prev => ({
      ...prev,
      [id]: isValid
    }));
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
                  onValidationChange={handleValidationChange}
                />
              ))}
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting || !allValidated}
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
