
import { FormElementPreview } from "./form-elements/FormElementPreview";
import { FormElementEdit } from "./form-elements/FormElementEdit";

interface FormElementProps {
  element: {
    id: string;
    type: string;
    label: string;
    options?: string[];
    required?: boolean;
    branchingLogic?: {
      condition: string;
      targetId: string;
    };
  };
  onUpdate?: (id: string, updates: Partial<FormElementProps['element']>) => void;
  isPreview?: boolean;
  allElements?: FormElementProps['element'][];
  responses?: Record<string, any>;
  onResponseChange?: (id: string, value: any) => void;
}

export const FormElement = ({ 
  element, 
  onUpdate, 
  isPreview = false, 
  allElements = [],
  responses = {},
  onResponseChange
}: FormElementProps) => {
  const shouldShowElement = () => {
    if (!element.branchingLogic) return true;
    
    const targetElement = allElements.find(el => el.id === element.branchingLogic?.targetId);
    if (!targetElement) return true;

    const targetResponse = responses[element.branchingLogic.targetId];
    return targetResponse === element.branchingLogic.condition;
  };

  if (isPreview && !shouldShowElement()) {
    return null;
  }

  if (isPreview) {
    return (
      <FormElementPreview 
        element={element}
        responses={responses}
        onResponseChange={onResponseChange!}
      />
    );
  }

  return (
    <FormElementEdit 
      element={element}
      onUpdate={onUpdate!}
      allElements={allElements}
    />
  );
};
