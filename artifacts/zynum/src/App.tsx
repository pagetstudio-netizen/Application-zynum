import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModalToaster } from "@/components/ui/modal-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { CurrencyProvider } from "@/hooks/use-currency";
import { LanguageProvider } from "@/hooks/use-language";

import Onboarding from "@/pages/onboarding";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Recharge from "@/pages/recharge";
import MobileMoney from "@/pages/mobile-money";
import CardPayment from "@/pages/card-payment";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ContentProtection() {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);
  return null;
}

function ForceLight() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }, []);
  return null;
}

function SmartRoot() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("zynum_token");
  useEffect(() => {
    if (token) setLocation("/dashboard");
  }, [token, setLocation]);
  if (token) return null;
  return <Onboarding />;
}

function Router() {
  return (
    <>
      <ForceLight />
      <ContentProtection />
      <Switch>
        <Route path="/" component={SmartRoot} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/recharge" component={Recharge} />
        <Route path="/recharge/mobile" component={MobileMoney} />
        <Route path="/recharge/card" component={CardPayment} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/admin" component={Admin} />
        <Route path="/history"><Redirect to="/dashboard" /></Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <ModalToaster />
          </CurrencyProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
