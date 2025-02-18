
import { Card } from "@/components/ui/card";
import { FormElement } from "@/components/FormElement";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export const FormPreview = () => {
  const [responses, setResponses] = useState({});

  // This would typically come from your form state management
  const elements = [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Form submitted successfully!");
    console.log("Form responses:", responses);
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
                />
              ))}
              <Button type="submit" className="w-full">
                Submit Form
              </Button>
            </>
          )}
        </form>
      </Card>
    </div>
  );
};
