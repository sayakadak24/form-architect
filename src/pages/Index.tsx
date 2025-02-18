
import { Button } from "@/components/ui/button";
import { FormBuilder } from "@/components/FormBuilder";
import { useState } from "react";
import { FormPreview } from "@/components/FormPreview";

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

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-primary">Form Architect</h1>
          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => setPreviewMode(!previewMode)}
              className="text-accent hover:text-accent/80"
            >
              {previewMode ? "Edit" : "Preview"}
            </Button>
            <Button className="bg-accent hover:bg-accent/90">Save Form</Button>
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
