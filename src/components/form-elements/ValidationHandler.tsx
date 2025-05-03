
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
    if (!validationQuery || !value) {
      // If no validation query or no value, consider it valid
      setIsValid(true);
      onValidationChange(fieldId, true);
      setMessage("");
      return;
    }

    const validateValue = async () => {
      try {
        setIsValidating(true);
        
        const { data: response, error } = await supabase.functions.invoke('validate-sql', {
          body: {
            query: validationQuery,
            params: [value]
          }
        });

        if (error) {
          console.error("SQL Validation error:", error);
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
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [validationQuery, value, fieldId, errorMessage, onValidationChange]);

  if (!message || isValid) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mt-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {isValidating ? "Validating..." : message}
      </AlertDescription>
    </Alert>
  );
};
