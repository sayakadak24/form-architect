
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ValidationHandlerProps {
  validationQuery?: string;
  errorMessage?: string;
  value: any;
  fieldId: string;
  onValidationChange: (id: string, isValid: boolean) => void;
}

export const ValidationHandler = ({ 
  validationQuery, 
  errorMessage, 
  value, 
  fieldId,
  onValidationChange 
}: ValidationHandlerProps) => {
  const [isValid, setIsValid] = useState<boolean>(true);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!validationQuery || value === undefined || value === null || value === '') {
      // If no validation query or no value, consider it valid
      setIsValid(true);
      onValidationChange(fieldId, true);
      setMessage("");
      return;
    }

    const validateValue = async () => {
      try {
        setIsValidating(true);
        setMessage("Validating...");
        
        const { data: response, error } = await supabase.functions.invoke('validate-sql', {
          body: {
            query: validationQuery,
            params: [value]
          }
        });

        if (error) {
          console.error("SQL Validation error:", error);
          toast({
            title: "Validation Error",
            description: "There was an error executing the validation query",
            variant: "destructive"
          });
          setIsValid(true); // Default to valid if there's an error with the function
          onValidationChange(fieldId, true);
          return;
        }

        // Check if the validation returned results
        const isValidValue = response.hasResults;
        setIsValid(isValidValue);
        onValidationChange(fieldId, isValidValue);
        
        if (!isValidValue) {
          setMessage(errorMessage || "Invalid input. Please check your entry.");
        } else {
          setMessage("");
        }
      } catch (err) {
        console.error("Validation processing error:", err);
        setIsValid(true); // Default to valid if there's an exception
        onValidationChange(fieldId, true);
      } finally {
        setIsValidating(false);
      }
    };

    // Add a small delay to prevent excessive validations during typing
    const timeoutId = setTimeout(() => {
      validateValue();
    }, 300); // Reduced from 500ms to 300ms for faster feedback

    return () => clearTimeout(timeoutId);
  }, [validationQuery, value, fieldId, errorMessage, onValidationChange]);

  if (isValidating) {
    return (
      <Alert variant="default" className="mt-2 bg-blue-50 text-blue-700 border-blue-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Validating...
        </AlertDescription>
      </Alert>
    );
  }

  if (!message || isValid) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mt-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  );
};
