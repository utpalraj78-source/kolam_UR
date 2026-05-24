import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Navigation } from "@/components/Navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import RoleSelection from "./pages/RoleSelection";
import KolamGenerator from "@features/KolamGenerator/frontend";
import KolamFromJson from "@features/KolamFromJson/frontend";
import KolamHistory from "@features/KolamHistory/frontend";
import FrequencyHopping from "@features/FrequencyHopping/frontend";
import HopCompare from "@features/HopCompare/frontend";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import SecureChat from "@features/SecureChat/frontend";
import HoppingComparison from "@features/HoppingComparison/frontend";
import CaptchaPage from "@features/KolamCaptcha/frontend";
import Pricing from "@features/KolamCaptcha/frontend/Pricing";
import MerchandiseStore from "@features/MerchandiseStore/frontend";
import TelecomDashboard from "@features/Telecom/frontend/Dashboard";
import TelecomPricing from "@features/Telecom/frontend/Pricing";
import TelecomAdmin from "@features/Telecom/frontend/admin";
import TelecomDocumentation from "@features/Telecom/frontend/admin/TelecomDocumentation";
import KCaptchaDocs from "@features/KolamCaptcha/frontend/Docs";
import Payment from "@features/KolamCaptcha/frontend/Payment";
import SecurityLab from "@features/SecurityLab/frontend";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen w-full flex flex-col">
            <div className="flex-grow">
              <Navigation />
              <div className="pt-20">
                <Routes>
                  <Route path="/" element={<Navigate to="/welcome" replace />} />
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/get-started" element={<RoleSelection />} />
                  <Route path="/auth" element={<Auth />} />

                  {/* Protected Routes */}
                  <Route path="/kolam-generator" element={<ProtectedRoute><KolamGenerator /></ProtectedRoute>} />
                  <Route path="/restore-kolam" element={<ProtectedRoute><KolamFromJson /></ProtectedRoute>} />
                  <Route path="/kolam-history" element={<ProtectedRoute><KolamHistory /></ProtectedRoute>} />
                  <Route path="/frequency-hopping" element={<ProtectedRoute><FrequencyHopping /></ProtectedRoute>} />
                  <Route path="/hop-compare" element={<ProtectedRoute><HopCompare /></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><SecureChat /></ProtectedRoute>} />
                  <Route path="/hopping-comparison" element={<ProtectedRoute><HoppingComparison /></ProtectedRoute>} />
                  <Route path="/captcha" element={<ProtectedRoute><CaptchaPage /></ProtectedRoute>} />
                  <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
                  <Route path="/merch-store" element={<ProtectedRoute><MerchandiseStore /></ProtectedRoute>} />

                  {/* New Telecom & KCaptcha Routes */}
                  <Route path="/telecom-dashboard" element={<ProtectedRoute><TelecomDashboard /></ProtectedRoute>} />
                  <Route path="/telecom-pricing" element={<ProtectedRoute><TelecomPricing /></ProtectedRoute>} />
                  <Route path="/telecom-admin" element={<ProtectedRoute><TelecomAdmin /></ProtectedRoute>} />
                  <Route path="/telecom-docs" element={<ProtectedRoute><TelecomDocumentation /></ProtectedRoute>} />
                  <Route path="/kcaptcha-docs" element={<ProtectedRoute><KCaptchaDocs /></ProtectedRoute>} />
                  <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
                  <Route path="/6g-security-lab" element={<ProtectedRoute><SecurityLab /></ProtectedRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
