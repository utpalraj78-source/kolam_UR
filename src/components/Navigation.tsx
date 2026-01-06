import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Home, Zap, LogOut, LogIn, BarChart4, History, MessageCircle, Activity, ShieldCheck, ShoppingBag, CreditCard, Menu, X, Cpu, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Navigation = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { to: "/", label: "Home", icon: Home, protected: false },
    // Telecom Specific
    { to: "/telecom-dashboard", label: "Dashboard", icon: Zap, protected: true, roles: ['telecom'] },
    { to: "/telecom-pricing", label: "Pricing", icon: CreditCard, protected: true, roles: ['telecom'] },

    // Shared / Core
    { to: "/kolam-generator", label: "Generator", icon: Zap, protected: true, roles: ['learner', 'telecom'] },
    { to: "/kolam-history", label: "My Kolams", icon: History, protected: true, roles: ['learner', 'telecom'] },

    // Telecom Advanced
    { to: "/chat", label: "Secure Chat", icon: MessageCircle, protected: true, roles: ['telecom'] },
    { to: "/hop-compare", label: "Hop Analysis", icon: BarChart4, protected: true, roles: ['telecom'] },
    { to: "/hopping-comparison", label: "AFH DEMONSTRATION", icon: Activity, protected: true, roles: ['telecom'] },
    { to: "/telecom-admin", label: "6G ADMIN LAB", icon: Cpu, protected: true, roles: ['telecom'] },
    { to: "/telecom-docs", label: "6G TECH DOCS", icon: BookOpen, protected: true, roles: ['telecom'] },

    // KCaptcha
    { to: "/kcaptcha-docs", label: "Documentation", icon: ShieldCheck, protected: true, roles: ['kcaptcha'] },
    { to: "/captcha", label: "Captcha Lab", icon: ShieldCheck, protected: true, roles: ['kcaptcha'] },
    { to: "/pricing", label: "Business Plans", icon: CreditCard, protected: true, roles: ['kcaptcha'] },

    // Merch
    { to: "/merch-store", label: "Merch Store", icon: ShoppingBag, protected: true, roles: ['merch'] },
  ];

  const filteredItems = navItems.filter(item => {
    if (!item.protected) return true;
    if (!user) return false;
    if (!userRole) return true;
    return item.roles?.includes(userRole);
  });

  return (
    <nav className="glass-card fixed top-0 left-0 right-0 z-50 border-b">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold gradient-text">Kolam FHSS</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {filteredItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-muted/50"
                activeClassName="bg-muted text-primary font-medium"
                onClick={(e) => {
                  if (item.protected && !user) {
                    e.preventDefault();
                    toast.error("Please login to use this feature");
                  }
                }}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}

            {user ? (
              <Button
                onClick={() => {
                  signOut();
                  navigate("/get-started");
                }}
                variant="outline"
                size="sm"
                className="ml-2 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sign Out</span>
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/get-started")}
                variant="default"
                size="sm"
                className="ml-2 flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden lg:inline">Get Started</span>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 w-[75%] bg-background border-l shadow-xl z-50 p-6 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-xl font-bold gradient-text">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {filteredItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-muted/50 text-lg"
                    activeClassName="bg-muted text-primary font-bold"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>

              <div className="pt-6 border-t mt-auto">
                {user ? (
                  <Button
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                      navigate("/get-started");
                    }}
                    variant="destructive"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/get-started");
                    }}
                    variant="default"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <LogIn className="h-5 w-5" />
                    Get Started
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

