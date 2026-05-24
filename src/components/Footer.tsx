import { Github, Linkedin, Mail, ShieldAlert, FileSignature, Copyright } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full border-t border-border/50 bg-background/95 backdrop-blur-md py-10 overflow-hidden z-10">
      {/* Decorative background glow */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Creator Intro */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Developer</h4>
            <div className="space-y-3">
              <p className="text-xl font-extrabold tracking-tight gradient-text">Utpal Raj</p>
              <div className="flex gap-3">
                <a
                  href="https://www.linkedin.com/in/utpal-raj-61a465323/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-all duration-300 p-2 rounded-lg bg-muted/40 hover:bg-primary/10 hover:-translate-y-0.5 border border-transparent hover:border-primary/20"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="https://github.com/utpalraj78-source"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-all duration-300 p-2 rounded-lg bg-muted/40 hover:bg-primary/10 hover:-translate-y-0.5 border border-transparent hover:border-primary/20"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="mailto:utpalraj6311@gmail.com"
                  className="text-muted-foreground hover:text-primary transition-all duration-300 p-2 rounded-lg bg-muted/40 hover:bg-primary/10 hover:-translate-y-0.5 border border-transparent hover:border-primary/20"
                  aria-label="Gmail"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Platform Info / About */}
          <div className="space-y-4 md:text-center flex flex-col md:items-center">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Platform</h4>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">KolamBasedCommunication & O-RAN Simulator</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                A high-fidelity simulation engine validating hybrid control planes and low-PHY digital signal processing.
              </p>
            </div>
          </div>

          {/* Legal / Copyright */}
          <div className="space-y-4 md:text-right flex flex-col md:items-end">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Legal & Compliance</h4>
            <div className="flex flex-col gap-2 text-xs">
              {/* Terms and Conditions Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 md:justify-end focus:outline-none focus:underline font-medium">
                    <FileSignature className="h-3.5 w-3.5" /> Terms and Conditions
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 border-b pb-2">
                      <FileSignature className="h-5 w-5 text-primary" /> Terms and Conditions
                    </DialogTitle>
                    <DialogDescription className="pt-4 text-left space-y-4 text-sm text-foreground/90">
                      <p className="font-semibold text-base">Effective Date: May 24, 2026</p>
                      
                      <div className="space-y-2">
                        <h5 className="font-bold text-foreground">1. Acceptance of Terms</h5>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          By accessing, viewing, or interacting with the KolamBasedCommunication Simulation Platform, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the platform.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-bold text-foreground">2. Simulation Scope & Sandbox Purpose</h5>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          The KolamBasedCommunication simulator, including its high-fidelity C++ vector processing kernels, adaptive frequency hopping simulations, and captcha algorithms, is designed solely for demonstration, testing, and research environments. Any deployment in production telco environments is done at the operator's own risk.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-bold text-foreground">3. Intellectual Property Rights</h5>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          All source code, visual interfaces, compilation scripts, and structural documentation of KolamBasedCommunication are owned by Utpal Raj and protected under standard copyright laws. Unauthorized replication, redistribution, or packaging without written consent is strictly prohibited.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-bold text-foreground">4. Liability & Warranty Disclaimer</h5>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          The simulation platform is provided "as-is" and "as available". We do not guarantee uninterrupted runtimes, zero jitter, or absolute latency bounds under all operating system loads. In no event shall the developers be held liable for any system overheads or data discrepancies.
                        </p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>

              {/* Privacy and Copyright Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 md:justify-end focus:outline-none focus:underline font-medium">
                    <ShieldAlert className="h-3.5 w-3.5" /> Privacy & Copyright
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 border-b pb-2">
                      <ShieldAlert className="h-5 w-5 text-primary" /> Privacy & Copyright Statement
                    </DialogTitle>
                    <DialogDescription className="pt-4 text-left space-y-4 text-sm text-foreground/90">
                      <p className="font-semibold text-base">Effective Date: May 24, 2026</p>
                      
                      <div className="space-y-2">
                        <h5 className="font-bold text-foreground">1. Privacy and Telemetry</h5>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          KolamBasedCommunication respects your privacy. All computation logs, audio visualizations, security drills, and mock transaction databases run entirely within your local browser context or sandboxed container. No sensitive telemetry or identifiers are forwarded to any third-party clouds.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-bold text-foreground">2. Copyright Protection</h5>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          All software designs, algorithmic architectures, AVX2 optimization methodologies, and frontend themes are copyrighted materials. You may clone and modify the codebase for non-commercial educational purposes, provided that proper developer attribution to **Utpal Raj** is preserved in all distributions.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-bold text-foreground">3. Contact Information</h5>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          For questions regarding licenses, intellectual property, or custom integrations, you can directly contact the developer at <strong className="text-foreground">utpalraj6311@gmail.com</strong>.
                        </p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
            
            <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1 md:justify-end">
              <Copyright className="h-3 w-3" /> {currentYear} KolamBasedCommunication. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};
