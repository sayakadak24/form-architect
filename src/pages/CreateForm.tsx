
import { useState, useEffect } from "react";
import { FormBuilder } from "@/components/FormBuilder";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const CreateForm = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const isEditing = !!formId;
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [excelUrl, setExcelUrl] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [needsValidation, setNeedsValidation] = useState(false);
  const [validationQuery, setValidationQuery] = useState("");
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (isEditing) {
      fetchForm();
    }
  }, [formId]);

  const fetchForm = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (error) throw error;

      setTitle(data.title || "");
      setDescription(data.description || "");
      setExcelUrl(data.excel_url || "");
      setSheetName(data.sheet_name || "Sheet1");
      setNeedsValidation(data.needs_validation || false);
      setValidationQuery(data.validation_query || "");
      setElements(data.elements || []);
      setLoading(false);
    } catch (error: any) {
      toast.error("Error loading form: " + error.message);
      navigate('/');
    }
  };

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

      const formData = {
        title,
        description,
        excel_url: excelUrl,
        sheet_name: sheetName,
        elements,
        needs_validation: needsValidation,
        validation_query: validationQuery,
        user_id: session.user.id
      };

      let data, error;

      if (isEditing) {
        ({ data, error } = await supabase
          .from('forms')
          .update(formData)
          .eq('id', formId)
          .select()
          .single());
        
        if (error) throw error;
        toast.success("Form updated successfully!");
      } else {
        ({ data, error } = await supabase
          .from('forms')
          .insert([formData])
          .select()
          .single());
        
        if (error) throw error;
        toast.success("Form created successfully!");
      }

      navigate(`/form/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">Loading form data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="p-6 mb-6">
          <h1 className="text-2xl font-semibold mb-6">
            {isEditing ? "Edit Form" : "Create New Form"}
          </h1>
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
            <div>
              <label className="block text-sm font-medium mb-2">
                Sheet Name
              </label>
              <Input
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Enter sheet name"
                defaultValue="Sheet1"
              />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="needsValidation"
                checked={needsValidation}
                onCheckedChange={(checked) => setNeedsValidation(!!checked)}
              />
              <label
                htmlFor="needsValidation"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Needs Validation?
              </label>
            </div>
            {needsValidation && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Validation Query
                </label>
                <Textarea
                  value={validationQuery}
                  onChange={(e) => setValidationQuery(e.target.value)}
                  placeholder="Enter your validation query"
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This query will be used to validate the form data before submission.
                </p>
              </div>
            )}
          </div>
        </Card>

        <FormBuilder elements={elements} setElements={setElements} />

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? "Update Form" : "Create Form"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateForm;
