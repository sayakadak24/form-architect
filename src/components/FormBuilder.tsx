
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FormElement } from "@/components/FormElement";
import { ElementLibrary } from "@/components/ElementLibrary";
import { v4 as uuidv4 } from "uuid";

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

interface FormBuilderProps {
  elements: FormElementType[];
  setElements: (elements: FormElementType[]) => void;
}

export const FormBuilder = ({ elements, setElements }: FormBuilderProps) => {
  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // If dragging from library to form
    if (source.droppableId === "element-library" && destination.droppableId === "form-elements") {
      const sourceId = result.draggableId.replace("library-", "");
      const newElement = {
        id: uuidv4(),
        type: sourceId,
        label: `New ${sourceId.charAt(0).toUpperCase() + sourceId.slice(1)} Question`,
        options: ['Option 1', 'Option 2', 'Option 3'].filter(() => 
          sourceId === 'radio' || sourceId === 'checkbox' || sourceId === 'select'
        ),
        required: false,
      };

      const newElements = [...elements];
      newElements.splice(destination.index, 0, newElement);
      setElements(newElements);
      return;
    }

    // If reordering within form
    if (source.droppableId === "form-elements" && destination.droppableId === "form-elements") {
      const newElements = Array.from(elements);
      const [removed] = newElements.splice(source.index, 1);
      newElements.splice(destination.index, 0, removed);
      setElements(newElements);
    }
  };

  const handleElementUpdate = (id: string, updates: Partial<FormElementType>) => {
    setElements(elements.map(element => 
      element.id === id ? { ...element, ...updates } : element
    ));
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9">
          <div className="bg-white rounded-xl shadow-sm p-8 min-h-[600px] animate-slide-in">
            <Droppable droppableId="form-elements">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {elements.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      Drag elements here to start building your form
                    </div>
                  ) : (
                    elements.map((element, index) => (
                      <Draggable
                        key={element.id}
                        draggableId={element.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <FormElement 
                              element={element} 
                              onUpdate={handleElementUpdate}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>

        <div className="lg:col-span-3">
          <ElementLibrary />
        </div>
      </div>
    </DragDropContext>
  );
};
