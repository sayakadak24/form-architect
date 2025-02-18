
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const ElementLibrary = () => {
  const elementTypes = [
    { id: "text", label: "Text Input", icon: "TextIcon" },
    { id: "number", label: "Number Input", icon: "HashIcon" },
    { id: "select", label: "Select", icon: "ListIcon" },
    // Add more element types as needed
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
      <div className="space-y-2">
        {elementTypes.map((type) => (
          <Card
            key={type.id}
            className="p-3 cursor-move hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="text-accent">{/* Add icon component */}</div>
              <span className="text-sm font-medium">{type.label}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
