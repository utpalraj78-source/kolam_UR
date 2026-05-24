import { Github, Linkedin, Mail, ShieldAlert, FileSignature } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-8 mt-auto">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Creator Intro */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground">Developed By</h4>
            <p className="text-lg font-bold gradient-text">Utpal Raj</p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Designing secure, low-latency architectures and Next-Generation Radio Access Network (NG-RAN) prototypes.
            </p>
          </div>

          {/* Social Links / Contact */}
          <div className="flex flex-col space-y-3 md:items-center">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground md:self-center">Connect & Contact</h4>
            <div className="flex gap-4">
              <a
                href="https://www.linkedin.com/in/utpal-raj-61a465323/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/utpalraj78-source"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="mailto:utpalraj6311@gmail.com"
                className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50"
                aria-label="Gmail"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Legal / Copyright */}
          <div className="space-y-3 md:text-right flex flex-col md:items-end">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground">Legal & Terms</h4>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-1 md:justify-end">
                <FileSignature className="h-3.5 w-3.5" /> Terms and Conditions
              </a>
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-1 md:justify-end">
                <ShieldAlert className="h-3.5 w-3.5" /> Privacy Policy & Copyright
              </a>
            </div>
            <p className="text-xs text-muted-foreground/80 mt-1">
              &copy; {currentYear} Kolam FHSS. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};
