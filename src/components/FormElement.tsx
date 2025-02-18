
import { Card } from "@/components/ui/card";
import { Text, Hash, List, Calendar, RadioIcon, CheckSquare, FileText, ArrowRight } from "lucide-react";

const iconMap = {
  text: Text,
  number: Hash,
  select: List,
  date: Calendar,
  radio: RadioIcon,
  checkbox: CheckSquare,
  textarea: FileText,
  branching: ArrowRight,
};

interface FormElementProps {
  element: {
    id: string;
    type: string;
    label: string;
    branchingLogic?: {
      condition: string;
      targetId: string;
    };
  };
}

export const FormElement = ({ element }: FormElementProps) => {
  const IconComponent = iconMap[element.type as keyof typeof iconMap];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-accent">
            {IconComponent && <IconComponent className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="font-medium">{element.label}</h3>
            <p className="text-sm text-gray-500">{element.type}</p>
          </div>
        </div>
        {element.branchingLogic && (
          <div className="text-sm text-accent">
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
      </div>
    </Card>
  );
};
