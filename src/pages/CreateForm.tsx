
import { useState } from "react";
import { FormBuilder } from "@/components/FormBuilder";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const CreateForm = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [excelUrl, setExcelUrl] = useState("");
  const [elements, setElements] = useState([]);
  const [sqlValidationEnabled, setSqlValidationEnabled] = useState(false);

  const handleSubmit = async () => {
    try {
      if (!title) {
        toast.error("Please enter a form title");
        return;
      }

      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("You must be logged in to create a form");
        return;
      }

      const { data, error } = await supabase
        .from('forms')
        .insert([
          {
            title,
            description,
            excel_url: excelUrl,
            elements,
            user_id: session.user.id,
            sql_validation_enabled: sqlValidationEnabled
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Form created successfully!");
      navigate(`/form/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-secondary p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="p-6 mb-6">
          <h1 className="text-2xl font-semibold mb-6">Create New Form</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter form title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter form description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Excel File URL (Optional)
              </label>
              <Input
                value={excelUrl}
                onChange={(e) => setExcelUrl(e.target.value)}
                placeholder="Enter Excel file URL"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="sql-validation-enabled" 
                checked={sqlValidationEnabled}
                onCheckedChange={(checked) => setSqlValidationEnabled(!!checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="sql-validation-enabled"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enable SQL Validation
                </label>
                <p className="text-sm text-muted-foreground">
                  Allow form questions to be validated against database queries
                </p>
              </div>
            </div>
          </div>
        </Card>

        <FormBuilder elements={elements} setElements={setElements} />

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Form
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateForm;
