
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { iconMap } from "./icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FormElementPreviewProps {
  element: {
    id: string;
    type: string;
    label: string;
    options?: string[];
    required?: boolean;
  };
  responses: Record<string, any>;
  onResponseChange: (id: string, value: any) => void;
}

export const FormElementPreview = ({ element, responses, onResponseChange }: FormElementPreviewProps) => {
  const [date, setDate] = useState<Date>();
  const IconComponent = iconMap[element.type as keyof typeof iconMap];

  const renderPreviewInput = () => {
    switch (element.type) {
      case 'text':
        return (
          <Input 
            placeholder="Your answer" 
            className="mt-2"
            value={responses[element.id] || ''}
            onChange={(e) => onResponseChange(element.id, e.target.value)}
          />
        );
      case 'number':
        return (
          <Input 
            type="number" 
            placeholder="0" 
            className="mt-2"
            value={responses[element.id] || ''}
            onChange={(e) => onResponseChange(element.id, e.target.value)}
          />
        );
      case 'textarea':
        return (
          <textarea 
            className="w-full mt-2 p-2 border rounded-md min-h-[100px]" 
            placeholder="Your answer"
            value={responses[element.id] || ''}
            onChange={(e) => onResponseChange(element.id, e.target.value)}
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
                  onResponseChange(element.id, newDate);
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
            onChange={(e) => onResponseChange(element.id, e.target.value)}
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
                  onChange={(e) => onResponseChange(element.id, e.target.value)}
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
                    onResponseChange(element.id, newValues);
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
};
