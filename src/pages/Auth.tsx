import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Zap, Lock, Building2 } from "lucide-react";
import { login, register } from "@/api/auth";
import { triggerAuthUpdate } from "@/utils/authEvents";
import { KolamCaptchaWidget } from "@/components/KolamCaptchaWidget";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0); // increment to reset widget
  // Initialize role from URL or default to learner
  const [selectedRole, setSelectedRole] = useState(searchParams.get("role") || "learner");

  // Map role IDs to display names
  const roleNames: Record<string, string> = {
    learner: "Learner / Researcher",
    telecom: "Telecom Business",
    kcaptcha: "KCaptcha Service",
    merch: "Merchandise Customer"
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaVerified) {
      toast.error("Please complete the Kolam CAPTCHA first.");
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        const res = await login({ username, password });
        localStorage.setItem("token", res.access_token);

        // Use the role returned from backend or the selected one if backend doesn't return (fallback)
        // Ideally backend returns the user's actual role
        const loggedInRole = res.user?.role || selectedRole;
        localStorage.setItem("user_role", loggedInRole);

        if (res.user?.company_name) {
          localStorage.setItem("company_name", res.user.company_name);
        }

        triggerAuthUpdate();
        toast.success(`Welcome back! Signed in as ${roleNames[loggedInRole] || loggedInRole}`);

        // Redirect based on role
        if (loggedInRole === 'merch') navigate("/merch-store");
        else if (loggedInRole === 'kcaptcha') navigate("/kcaptcha-docs");
        else if (loggedInRole === 'telecom') navigate("/telecom-dashboard");
        else navigate("/kolam-generator"); // Default / Learner

      } else {
        if (!username) throw new Error("Username is required");
        if (selectedRole === 'telecom' && !companyName) throw new Error("Company Name is required for Telecom Business");

        const res = await register({
          username,
          email,
          password,
          role: selectedRole,
          company_name: selectedRole === 'telecom' ? companyName : undefined
        });

        localStorage.setItem("token", res.access_token);
        localStorage.setItem("user_role", selectedRole);

        if (selectedRole === 'telecom') {
          localStorage.setItem("company_name", companyName);
        }

        triggerAuthUpdate();
        toast.success("Account created and signed in!");

        // Redirect based on role
        if (selectedRole === 'merch') navigate("/merch-store");
        else if (selectedRole === 'kcaptcha') navigate("/kcaptcha-docs");
        else if (selectedRole === 'telecom') navigate("/telecom-dashboard");
        else navigate("/kolam-generator");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error?.response?.data?.detail || "Authentication failed");
      // reset captcha on failure so user must solve it again
      setCaptchaVerified(false);
      setCaptchaKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold gradient-text">KolamBasedCommunication Platform</h1>
          </div>
          <p className="text-muted-foreground">
            Secure frequency-hopping with mathematical beauty
          </p>
          {role && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-primary text-sm font-medium">
              <Lock className="w-3 h-3" />
              Role Locked: {roleNames[role] || role}
            </div>
          )}
        </div>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
            <CardDescription>
              {isLogin
                ? "Sign in to access your Kolam generators"
                : "Sign up to start generating Kolams"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {!isLogin && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Account Type</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                    >
                      <option value="learner">Learner / Researcher</option>
                      <option value="telecom">Telecom Business</option>
                      <option value="kcaptcha">KCaptcha Service</option>
                      <option value="merch">Merchandise Customer</option>
                    </select>
                  </div>

                  {/* Company Name Input for Telecom Users - Only on Sign Up */}
                  {selectedRole === 'telecom' && (
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="company"
                          type="text"
                          placeholder="Acme Telecom"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required={true}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {/* Kolam CAPTCHA — must be solved before submit */}
              <KolamCaptchaWidget
                key={captchaKey}
                onVerified={() => setCaptchaVerified(true)}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !captchaVerified}
              >
                {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setCaptchaVerified(false); setCaptchaKey(k => k + 1); }}
                className="text-primary hover:underline"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
