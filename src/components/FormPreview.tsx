
import { Card } from "@/components/ui/card";

export const FormPreview = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 animate-slide-in">
        <h2 className="text-2xl font-semibold mb-6">Form Preview</h2>
        <div className="space-y-6">
          {/* Form preview content will go here */}
          <p className="text-center text-gray-400 py-12">
            Your form preview will appear here
          </p>
        </div>
      </Card>
    </div>
  );
};
