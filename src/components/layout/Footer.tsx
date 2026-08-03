import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackSocialLinkClick } from "@/hooks/useSocialLinkTracking";

interface SocialLink {
  id: string;
  platform: string;
  url: string | null;
  display_name: string;
  is_active: boolean;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  houzz: Home,
  google_maps: MapPin,
};

// Custom Yelp icon
const YelpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.16 12.594l-4.995 1.433c-.96.276-1.74-.8-1.176-1.63l2.905-4.308a1.072 1.072 0 0 1 1.596-.206 9.194 9.194 0 0 1 1.813 3.03c.32.9-.143 1.68-1.143 1.68zM13.397 14.6l4.732 2.073c.913.4 1.06 1.533.387 2.213a9.24 9.24 0 0 1-2.885 1.673c-.88.34-1.66-.12-1.86-.96l-1.2-4.84c-.24-.96.826-1.76 1.826-1.16zM11.693 8.62V3.6c0-1 .76-1.47 1.62-1.073a9.22 9.22 0 0 1 2.88 2.3c.56.7.4 1.6-.36 2.12l-3.54 2.36c-.8.54-1.6.12-1.6-.687zM10.24 13.167l-2.4 4.533c-.48.91-1.593.953-2.2.12a9.22 9.22 0 0 1-1.26-3.16c-.2-.9.3-1.6 1.2-1.73l4.5-.6c.96-.13 1.48.927 1.16 1.837zM9.293 10.873l-4.88-.667c-.96-.133-1.38-.987-1.027-1.853a9.24 9.24 0 0 1 1.967-2.9c.64-.62 1.54-.54 2.08.18l3.113 3.78c.6.727.067 1.64-.853 1.46z" />
  </svg>
);

// Fallback links if database fetch fails
const fallbackSocialLinks: SocialLink[] = [
  {
    id: "",
    platform: "facebook",
    url: "https://www.facebook.com/truficient",
    display_name: "Facebook",
    is_active: true,
  },
  {
    id: "",
    platform: "instagram",
    url: "https://www.instagram.com/truficient_hvac",
    display_name: "Instagram",
    is_active: true,
  },
  {
    id: "",
    platform: "linkedin",
    url: "https://www.linkedin.com/company/truficient/",
    display_name: "LinkedIn",
    is_active: true,
  },
];

const Footer = () => {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    const fetchSocialLinks = async () => {
      const { data, error } = await supabase
        .from("social_links")
        .select("id, platform, url, display_name, is_active")
        .eq("is_active", true)
        .in("platform", ["facebook", "instagram", "linkedin"]);

      if (error || !data) {
        console.error("Error fetching social links:", error);
        return;
      }
      setSocialLinks(data);
    };

    fetchSocialLinks();
  }, []);

  const getIcon = (platform: string) => {
    if (platform === "yelp") return YelpIcon;
    return platformIcons[platform];
  };

  const handleClick = (link: SocialLink) => {
    trackSocialLinkClick(link.platform, "footer", link.id || undefined);
  };

  const displayLinks = socialLinks.length > 0 ? socialLinks.filter((link) => link.url) : fallbackSocialLinks;

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-secondary-foreground font-bold text-lg">T</span>
              </div>
              <div>
                <div className="text-xl font-bold">truficient</div>
                <div className="text-xs uppercase tracking-wider opacity-80">hvac solutions</div>
              </div>
            </div>
            <p className="text-sm opacity-90 mb-4">
              Your trusted HVAC partner in the Dallas-Fort Worth Metroplex. Mitsubishi Diamond Contractor. Licensed,
              insured, and committed to energy efficiency.
            </p>
            <div className="flex gap-4 justify-center sm:justify-start">
              {displayLinks.map((link) => {
                const IconComponent = getIcon(link.platform);
                if (!IconComponent || !link.url) return null;
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-foreground/10 hover:bg-secondary hover:text-secondary-foreground transition-all touch-target"
                    onClick={() => handleClick(link)}
                  >
                    <IconComponent className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
            <p className="text-xs opacity-70 mt-3 text-center sm:text-left">
              Texas HVAC License - TACLB77247C
            </p>
          </div>

          {/* Company Links */}
          <div className="text-center sm:text-left">
            <p className="font-bold mb-4 text-lg">COMPANY</p>
            <ul className="space-y-1 text-sm opacity-90">
              <li>
                <Link to="/about" className="hover:text-secondary transition-colors inline-block">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="hover:text-secondary transition-colors inline-block">
                  Reviews
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-secondary transition-colors inline-block">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-secondary transition-colors inline-block">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/financing" className="hover:text-secondary transition-colors inline-block">
                  Financing
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-secondary transition-colors inline-block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookie-preferences" className="hover:text-secondary transition-colors inline-block">
                  Cookie Preferences
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-of-service"
                  className="hover:text-secondary transition-colors inline-block"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Services Links */}
          <div className="text-center sm:text-left">
            <p className="font-bold mb-4 text-lg">SERVICES</p>
            <ul className="space-y-1 text-sm opacity-90">
              <li>
                <Link
                  to="/services/residential"
                  className="hover:text-secondary transition-colors inline-block"
                >
                  Residential Services
                </Link>
              </li>
              <li>
                <Link
                  to="/services/commercial"
                  className="hover:text-secondary transition-colors inline-block"
                >
                  Commercial Services
                </Link>
              </li>
              <li>
                <Link
                  to="/services/residential#cooling"
                  className="hover:text-secondary transition-colors inline-block"
                >
                  AC Installation
                </Link>
              </li>
              <li>
                <Link
                  to="/services/residential#cooling"
                  className="hover:text-secondary transition-colors inline-block"
                >
                  AC Repair
                </Link>
              </li>
              <li>
                <Link
                  to="/services/ductless"
                  className="hover:text-secondary transition-colors inline-block"
                >
                  Ductless Systems
                </Link>
              </li>
            </ul>
          </div>

          {/* Service Areas Links */}
          <div className="text-center sm:text-left">
            <p className="font-bold mb-4 text-lg">SERVICE AREAS</p>
            <ul className="space-y-1 text-sm opacity-90">
              <li>
                <Link to="/service-areas/" className="hover:text-secondary transition-colors inline-block font-semibold">
                  All Service Areas
                </Link>
              </li>
              <li>
                <Link to="/residential-hvac-oak-cliff-dallas/" className="hover:text-secondary transition-colors inline-block">
                  Oak Cliff Dallas
                </Link>
              </li>
              <li>
                <Link to="/hvac-lakewood-dallas/" className="hover:text-secondary transition-colors inline-block">
                  Lakewood Dallas
                </Link>
              </li>
              <li>
                <Link to="/hvac-highland-park-university-park-dallas/" className="hover:text-secondary transition-colors inline-block">
                  Highland Park / UP
                </Link>
              </li>
              <li>
                <Link to="/hvac-preston-hollow-dallas/" className="hover:text-secondary transition-colors inline-block">
                  Preston Hollow
                </Link>
              </li>
              <li>
                <Link to="/hvac-uptown-oak-lawn-dallas/" className="hover:text-secondary transition-colors inline-block">
                  Uptown / Oak Lawn
                </Link>
              </li>
              <li>
                <Link to="/hvac-richardson-tx/" className="hover:text-secondary transition-colors inline-block">
                  Richardson TX
                </Link>
              </li>
              <li>
                <Link to="/hvac-plano-tx/" className="hover:text-secondary transition-colors inline-block">
                  Plano TX
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="text-center sm:text-left">
            <p className="font-bold mb-4 text-lg">CONTACT</p>
            <ul className="space-y-2 text-sm opacity-90">
              <li className="flex items-start gap-2 justify-center sm:justify-start">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  808 Business Parkway
                  <br />
                  Richardson, TX 75081
                </span>
              </li>
              <li>
                <a
                  href="tel:214-238-4349"
                  className="flex items-center gap-2 justify-center sm:justify-start hover:text-secondary transition-colors touch-target"
                >
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>214-238-4349</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@truficient.com"
                  className="flex items-center gap-2 justify-center sm:justify-start hover:text-secondary transition-colors touch-target"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>info@truficient.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-primary-foreground/20">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-xs sm:text-sm opacity-80">
            © {new Date().getFullYear()} Truficient Energy Solutions. All rights reserved. | TACLB77247C | Licensed &
            Insured |{" "}
            <Link to="/privacy-policy" className="hover:text-secondary transition-colors underline-offset-2 underline decoration-primary-foreground/40">
              Privacy
            </Link>{" "}
            |{" "}
            <Link to="/terms-of-service" className="hover:text-secondary transition-colors underline-offset-2 underline decoration-primary-foreground/40">
              Terms
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
