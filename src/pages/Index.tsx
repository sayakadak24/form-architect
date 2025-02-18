
import { Button } from "@/components/ui/button";
import { FormBuilder } from "@/components/FormBuilder";
import { useState } from "react";
import { FormPreview } from "@/components/FormPreview";

const Index = () => {
  const [previewMode, setPreviewMode] = useState(false);

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
        {previewMode ? <FormPreview /> : <FormBuilder />}
      </main>
    </div>
  );
};

export default Index;
