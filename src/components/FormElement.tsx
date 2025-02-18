
import { Card } from "@/components/ui/card";

interface FormElementProps {
  element: any;
}

export const FormElement = ({ element }: FormElementProps) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-accent">{/* Icon based on element type */}</div>
          <div>
            <h3 className="font-medium">{element.label}</h3>
            <p className="text-sm text-gray-500">{element.type}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
