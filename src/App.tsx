
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

import Index from "./pages/Index";
import CreateForm from "./pages/CreateForm";
import ViewForm from "./pages/ViewForm";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/create-form" element={<CreateForm />} />
        <Route path="/form/:id" element={<ViewForm />} />
        <Route path="/auth-callback" element={<AuthCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
      <SonnerToaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
