
import { Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ViewForm from "./pages/ViewForm";
import CreateForm from "./pages/CreateForm";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/form/:formId" element={<ViewForm />} />
        <Route path="/create-form" element={<CreateForm />} />
        <Route path="/edit-form/:formId" element={<CreateForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
