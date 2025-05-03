
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { iconMap } from "./icons";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface FormElementEditProps {
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
    validation?: {
      sql?: string;
      errorMessage?: string;
    };
  };
  allElements: Array<FormElementEditProps['element']>;
  onUpdate: (id: string, updates: Partial<FormElementEditProps['element']>) => void;
}

export const FormElementEdit = ({ element, onUpdate, allElements }: FormElementEditProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSqlValidation, setShowSqlValidation] = useState(!!element.validation?.sql);
  const [tempLabel, setTempLabel] = useState(element.label);
  const [tempOptions, setTempOptions] = useState<string[]>(element.options || []);
  const [tempSqlQuery, setTempSqlQuery] = useState(element.validation?.sql || '');
  const [tempErrorMessage, setTempErrorMessage] = useState(
    element.validation?.errorMessage || 'Invalid input. Please check your entry.'
  );
  
  const IconComponent = iconMap[element.type as keyof typeof iconMap];

  const handleSave = () => {
    const updates: Partial<FormElementEditProps['element']> = {
      label: tempLabel,
      options: tempOptions,
    };

    if (showSqlValidation) {
      updates.validation = {
        sql: tempSqlQuery,
        errorMessage: tempErrorMessage
      };
    } else {
      updates.validation = undefined;
    }

    onUpdate(element.id, updates);
    setIsEditing(false);
  };

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
                {element.validation?.sql && (
                  <p className="text-xs text-blue-500 mt-1">SQL validation active</p>
                )}
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
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`sql-validation-${element.id}`} 
                  checked={showSqlValidation}
                  onCheckedChange={(checked) => setShowSqlValidation(!!checked)}
                />
                <label 
                  htmlFor={`sql-validation-${element.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enable SQL Validation
                </label>
              </div>

              {showSqlValidation && (
                <div className="space-y-2 pt-2">
                  <div>
                    <label className="text-sm font-medium">SQL Query</label>
                    <Textarea
                      value={tempSqlQuery}
                      onChange={(e) => setTempSqlQuery(e.target.value)}
                      placeholder="SELECT * FROM your_table WHERE column = $1"
                      className="min-h-[100px]"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use $1 to reference this field's value. Query must return at least 1 row for validation to pass.
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Error Message</label>
                    <Input
                      value={tempErrorMessage}
                      onChange={(e) => setTempErrorMessage(e.target.value)}
                      placeholder="Invalid input"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Branching Logic</h4>
              <div className="grid grid-cols-2 gap-2">
                <select 
                  className="p-2 border rounded-md"
                  value={element.branchingLogic?.targetId || ""}
                  onChange={(e) => {
                    onUpdate(element.id, {
                      branchingLogic: e.target.value ? {
                        condition: "",
                        targetId: e.target.value
                      } : undefined
                    });
                  }}
                >
                  <option value="">No branching</option>
                  {allElements
                    .filter(el => el.id !== element.id && (
                      el.type === 'radio' || el.type === 'select' || el.type === 'text'
                    ))
                    .map(el => (
                      <option key={el.id} value={el.id}>
                        {el.label}
                      </option>
                    ))}
                </select>
                {element.branchingLogic?.targetId && (
                  <Input
                    placeholder="Enter condition value"
                    value={element.branchingLogic.condition || ""}
                    onChange={(e) => {
                      onUpdate(element.id, {
                        branchingLogic: {
                          ...element.branchingLogic,
                          condition: e.target.value
                        }
                      });
                    }}
                  />
                )}
              </div>
              {element.branchingLogic?.targetId && (
                <p className="text-sm text-gray-500 mt-1">
                  This question will only show when the answer to "{
                    allElements.find(el => el.id === element.branchingLogic?.targetId)?.label
                  }" matches exactly "{element.branchingLogic.condition}"
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
