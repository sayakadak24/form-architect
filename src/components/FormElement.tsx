
import { Card } from "@/components/ui/card";
import { Text, Hash, List, Calendar, RadioIcon, CheckSquare, FileText, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [isEditing, setIsEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(element.label);
  const [tempOptions, setTempOptions] = useState<string[]>(element.options || []);
  const [date, setDate] = useState<Date>();
  const IconComponent = iconMap[element.type as keyof typeof iconMap];

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(element.id, {
        label: tempLabel,
        options: tempOptions,
      });
    }
    setIsEditing(false);
  };

  // Check if this element should be shown based on branching logic
  const shouldShowElement = () => {
    if (!element.branchingLogic) return true;
    const targetElement = allElements.find(el => el.id === element.branchingLogic?.targetId);
    if (!targetElement) return true;

    const targetResponse = responses[targetElement.id];
    return targetResponse === element.branchingLogic.condition;
  };

  const renderPreviewInput = () => {
    if (!shouldShowElement()) return null;

    switch (element.type) {
      case 'text':
        return (
          <Input 
            placeholder="Your answer" 
            className="mt-2"
            value={responses[element.id] || ''}
            onChange={(e) => onResponseChange?.(element.id, e.target.value)}
          />
        );
      case 'number':
        return (
          <Input 
            type="number" 
            placeholder="0" 
            className="mt-2"
            value={responses[element.id] || ''}
            onChange={(e) => onResponseChange?.(element.id, e.target.value)}
          />
        );
      case 'textarea':
        return (
          <textarea 
            className="w-full mt-2 p-2 border rounded-md min-h-[100px]" 
            placeholder="Your answer"
            value={responses[element.id] || ''}
            onChange={(e) => onResponseChange?.(element.id, e.target.value)}
          />
        );
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full mt-2 justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate);
                  onResponseChange?.(element.id, newDate);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
      case 'select':
        return (
          <select 
            className="w-full mt-2 p-2 border rounded-md"
            value={responses[element.id] || ''}
            onChange={(e) => onResponseChange?.(element.id, e.target.value)}
          >
            <option value="">Select an option</option>
            {element.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="mt-2 space-y-2">
            {element.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name={`radio-${element.id}`} 
                  id={`radio-${element.id}-${index}`}
                  value={option}
                  checked={responses[element.id] === option}
                  onChange={(e) => onResponseChange?.(element.id, e.target.value)}
                />
                <label htmlFor={`radio-${element.id}-${index}`}>{option}</label>
              </div>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="mt-2 space-y-2">
            {element.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id={`checkbox-${element.id}-${index}`}
                  checked={responses[element.id]?.includes(option)}
                  onChange={(e) => {
                    const currentValues = responses[element.id] || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter((v: string) => v !== option);
                    onResponseChange?.(element.id, newValues);
                  }}
                />
                <label htmlFor={`checkbox-${element.id}-${index}`}>{option}</label>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  if (isPreview) {
    return (
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {IconComponent && <IconComponent className="h-4 w-4 text-accent" />}
            <h3 className="font-medium">{element.label}</h3>
            {element.required && <span className="text-red-500">*</span>}
          </div>
          {renderPreviewInput()}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-accent">
              {IconComponent && <IconComponent className="h-4 w-4" />}
            </div>
            {isEditing ? (
              <Input
                value={tempLabel}
                onChange={(e) => setTempLabel(e.target.value)}
                className="max-w-xs"
              />
            ) : (
              <div>
                <h3 className="font-medium">{element.label}</h3>
                <p className="text-sm text-gray-500">{element.type}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </div>
        
        {isEditing && (
          <div className="space-y-4">
            {(element.type === 'radio' || element.type === 'checkbox' || element.type === 'select') && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Options</h4>
                {tempOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...tempOptions];
                        newOptions[index] = e.target.value;
                        setTempOptions(newOptions);
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTempOptions(tempOptions.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTempOptions([...tempOptions, ""])}
                >
                  Add Option
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Branching Logic</h4>
              <div className="grid grid-cols-2 gap-2">
                <select 
                  className="p-2 border rounded-md"
                  value={element.branchingLogic?.targetId || ""}
                  onChange={(e) => {
                    if (onUpdate) {
                      onUpdate(element.id, {
                        branchingLogic: e.target.value ? {
                          condition: "",
                          targetId: e.target.value
                        } : undefined
                      });
                    }
                  }}
                >
                  <option value="">No branching</option>
                  {allElements
                    .filter(el => el.id !== element.id)
                    .map(el => (
                      <option key={el.id} value={el.id}>
                        {el.label}
                      </option>
                    ))}
                </select>
                {element.branchingLogic?.targetId && (
                  <Input
                    placeholder="Condition value"
                    value={element.branchingLogic.condition || ""}
                    onChange={(e) => {
                      if (onUpdate) {
                        onUpdate(element.id, {
                          branchingLogic: {
                            ...element.branchingLogic,
                            condition: e.target.value
                          }
                        });
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
