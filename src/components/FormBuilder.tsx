
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import { FormElement } from "@/components/FormElement";
import { ElementLibrary } from "@/components/ElementLibrary";

export const FormBuilder = () => {
  const [elements, setElements] = useState([]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    // Handle drag and drop logic here
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-9">
        <div className="bg-white rounded-xl shadow-sm p-8 min-h-[600px] animate-slide-in">
          <DragDropContext onDragEnd={onDragEnd}>
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
                            <FormElement element={element} />
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      <div className="lg:col-span-3">
        <ElementLibrary />
      </div>
    </div>
  );
};
