
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Text, Hash, List, Calendar, RadioIcon, CheckSquare, FileText, ArrowRight } from "lucide-react";
import { Draggable, Droppable } from "@hello-pangea/dnd";

export const ElementLibrary = () => {
  const elementTypes = [
    { id: "text", label: "Text", type: "text", icon: Text },
    { id: "number", label: "Number", type: "number", icon: Hash },
    { id: "select", label: "Dropdown", type: "select", icon: List },
    { id: "date", label: "Date", type: "date", icon: Calendar },
    { id: "radio", label: "Choice", type: "radio", icon: RadioIcon },
    { id: "checkbox", label: "Multiple Choice", type: "checkbox", icon: CheckSquare },
    { id: "textarea", label: "Long Answer", type: "textarea", icon: FileText },
    { id: "branching", label: "Branching", type: "branching", icon: ArrowRight },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 animate-slide-in">
      <h2 className="text-lg font-semibold mb-4">Elements</h2>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search elements..."
          className="pl-10"
        />
      </div>
      <Droppable droppableId="element-library" isDropDisabled={true}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-2"
          >
            {elementTypes.map((type, index) => (
              <Draggable
                key={type.id}
                draggableId={`library-${type.id}`}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      opacity: snapshot.isDragging ? 0.5 : 1,
                    }}
                  >
                    <Card className="p-3 cursor-move hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <type.icon className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                    </Card>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
