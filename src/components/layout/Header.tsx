import { useState } from "react";
import { Link } from "react-router-dom";
import truficientLogo from "@/assets/truficient-logo-sm.webp";
import { Phone, Mail, Menu, ChevronDown, Search, ChevronRight, ScanLine, Library, CreditCard, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { ThemeToggle } from "@/components/ThemeToggle";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [openMobileMenus, setOpenMobileMenus] = useState<Record<string, boolean>>({});
  const { trackButtonClick } = useButtonTracking();

  const handleTrackClick = (buttonName: string, buttonLocation: string, destinationUrl?: string) => {
    trackButtonClick({ buttonName, buttonLocation, destinationUrl });
  };

  const toggleMobileMenu = (menu: string) => {
    setOpenMobileMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  return (
    <>
      {/* Top Bar - Desktop */}
      <div className="hidden md:block bg-gray-800 text-white py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <div className="flex items-center gap-1">
            {/* SERVICE AREAS Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger 
                className="flex items-center gap-1 px-3 py-1 text-secondary hover:text-secondary/80 transition-colors font-medium"
                onClick={() => handleTrackClick('SERVICE AREAS Menu', 'Header - Top Bar')}
              >
                SERVICE AREAS <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                <DropdownMenuItem asChild>
                  <Link 
                    to="/service-areas/dallas-area" 
                    className="text-white hover:text-secondary cursor-pointer"
                    onClick={() => handleTrackClick('Dallas Area', 'Header - Top Bar', '/service-areas/dallas-area')}
                  >
                    Dallas Area
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/service-areas/north-dallas-area"
                    className="text-white hover:text-secondary cursor-pointer"
                    onClick={() => handleTrackClick('North Dallas Area', 'Header - Top Bar', '/service-areas/north-dallas-area')}
                  >
                    North Dallas Area
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/service-areas/frisco-mckinney-area"
                    className="text-white hover:text-secondary cursor-pointer"
                    onClick={() => handleTrackClick('Frisco-McKinney Area', 'Header - Top Bar', '/service-areas/frisco-mckinney-area')}
                  >
                    Frisco-McKinney Area
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link 
                    to="/service-areas/mid-cities-area" 
                    className="text-white hover:text-secondary cursor-pointer"
                    onClick={() => handleTrackClick('Mid-Cities Area', 'Header - Top Bar', '/service-areas/mid-cities-area')}
                  >
                    Mid-Cities Area
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/service-areas/south-dallas-area"
                    className="text-white hover:text-secondary cursor-pointer"
                    onClick={() => handleTrackClick('South Dallas Area', 'Header - Top Bar', '/service-areas/south-dallas-area')}
                  >
                    South Dallas Area
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-gray-500">|</span>

            <Link
              to="/contact"
              className="px-3 py-1 text-secondary hover:text-secondary/80 transition-colors font-medium"
              onClick={() => handleTrackClick('CONTACT US', 'Header - Top Bar', '/contact')}
            >
              CONTACT US
            </Link>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <ThemeToggle 
              className="text-white hover:text-secondary hover:bg-transparent" 
              iconClassName="text-white"
            />
            <button 
              className="text-white hover:text-secondary transition-colors"
              onClick={() => handleTrackClick('Search', 'Header - Top Bar')}
            >
              <Search className="w-4 h-4" />
            </button>
            <Link 
              to="/contact"
              onClick={() => handleTrackClick('Schedule Online', 'Header - Top Bar', '/contact')}
            >
              <Button variant="secondary" size="sm" className="font-semibold">
                Schedule Online
              </Button>
            </Link>
            <a 
              href="tel:214-238-4349"
              onClick={() => handleTrackClick('Call Now', 'Header - Top Bar', 'tel:214-238-4349')}
            >
              <Button
                variant="outline"
                size="sm"
                className="bg-gray-900 border-gray-900 text-white hover:bg-gray-700 hover:border-gray-700 font-semibold"
              >
                <Phone className="w-4 h-4 mr-1" />
                Call Now
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Mobile Top Bar - Condensed */}
      <div className="md:hidden bg-gray-800 text-white py-2 px-4">
        <div className="flex items-center justify-between">
          <a 
            href="tel:214-238-4349"
            className="flex items-center gap-2 touch-target"
            onClick={() => handleTrackClick('Call Now Mobile', 'Header - Mobile Top Bar', 'tel:214-238-4349')}
          >
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <Phone className="w-4 h-4 text-secondary-foreground" />
            </div>
            <span className="font-semibold text-sm">214-238-4349</span>
          </a>
          <Link 
            to="/contact"
            onClick={() => handleTrackClick('Schedule Now Mobile', 'Header - Mobile Top Bar', '/contact')}
          >
            <Button variant="secondary" size="sm" className="font-semibold text-xs h-9 px-3">
              Schedule Now
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-background/95 backdrop-blur-md shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center"
              onClick={() => handleTrackClick('Logo', 'Header - Main Nav', '/')}
            >
              <img 
                src={truficientLogo} 
                alt="Truficient HVAC Solutions" 
                className="h-14 w-auto"
                width={110}
                height={56}
                fetchPriority="high"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link 
                to="/" 
                className="text-foreground hover:text-primary font-medium transition-colors"
                onClick={() => handleTrackClick('Home', 'Header - Main Nav', '/')}
              >
                Home
              </Link>

              {/* Services Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger 
                  className="flex items-center gap-1 text-foreground hover:text-primary font-medium transition-colors"
                  onClick={() => handleTrackClick('Services Menu', 'Header - Main Nav')}
                >
                  Services <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border-border">
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/services/residential" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Residential', 'Header - Main Nav', '/services/residential')}
                    >
                      Residential
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/services/commercial" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Commercial', 'Header - Main Nav', '/services/commercial')}
                    >
                      Commercial
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/services/ductless" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Ductless (Mini-Splits)', 'Header - Main Nav', '/services/ductless')}
                    >
                      Ductless (Mini-Splits)
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Estimators Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger 
                  className="flex items-center gap-1 text-foreground hover:text-primary font-medium transition-colors"
                  onClick={() => handleTrackClick('Estimators Menu', 'Header - Main Nav')}
                >
                  Estimators <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border-border">
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/central-ac-estimate" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Central AC Estimate', 'Header - Main Nav', '/central-ac-estimate')}
                    >
                      Central AC Estimate
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/mini-split-estimate" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Mini Split Estimate', 'Header - Main Nav', '/mini-split-estimate')}
                    >
                      Mini Split Estimate
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/multi-zone-estimate" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Multi-Zone Estimate', 'Header - Main Nav', '/multi-zone-estimate')}
                    >
                      Multi-Zone Estimate
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/estimators/sizing" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Sizing Calculator', 'Header - Main Nav', '/estimators/sizing')}
                    >
                      Sizing Calculator
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/estimators/savings" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Savings Calculator', 'Header - Main Nav', '/estimators/savings')}
                    >
                      Savings Calculator
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/heat-pump-advantage" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Heat Pump Advantage', 'Header - Main Nav', '/heat-pump-advantage')}
                    >
                      Heat Pump Advantage
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Resources Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger 
                  className="flex items-center gap-1 text-foreground hover:text-primary font-medium transition-colors"
                  onClick={() => handleTrackClick('Resources Menu', 'Header - Main Nav')}
                >
                  Resources <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border-border">
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/scanner" 
                      className="cursor-pointer flex items-center gap-2"
                      onClick={() => handleTrackClick('Equipment Scanner', 'Header - Main Nav', '/scanner')}
                    >
                      <ScanLine className="w-4 h-4 text-secondary" />
                      Equipment Scanner
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/equipment" 
                      className="cursor-pointer flex items-center gap-2"
                      onClick={() => handleTrackClick('Equipment Library', 'Header - Main Nav', '/equipment')}
                    >
                      <Library className="w-4 h-4 text-primary" />
                      Equipment Library
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/resources/catalogs"
                      className="cursor-pointer flex items-center gap-2"
                      onClick={() => handleTrackClick('Catalogs', 'Header - Main Nav', '/resources/catalogs')}
                    >
                      <BookOpen className="w-4 h-4 text-secondary" />
                      Catalogs
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/financing" 
                      className="cursor-pointer flex items-center gap-2"
                      onClick={() => handleTrackClick('Financing', 'Header - Main Nav', '/financing')}
                    >
                      <CreditCard className="w-4 h-4 text-secondary" />
                      Financing
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* About Us Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger 
                  className="flex items-center gap-1 text-foreground hover:text-primary font-medium transition-colors"
                  onClick={() => handleTrackClick('About Us Menu', 'Header - Main Nav')}
                >
                  About Us <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border-border">
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/about" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Our Story', 'Header - Main Nav', '/about')}
                    >
                      Our Story
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/gallery" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Gallery', 'Header - Main Nav', '/gallery')}
                    >
                      Gallery
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/blog" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Blog', 'Header - Main Nav', '/blog')}
                    >
                      Blog
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/careers" 
                      className="cursor-pointer"
                      onClick={() => handleTrackClick('Careers', 'Header - Main Nav', '/careers')}
                    >
                      Careers
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link 
                to="/contact" 
                className="text-foreground hover:text-primary font-medium transition-colors"
                onClick={() => handleTrackClick('Contact', 'Header - Main Nav', '/contact')}
              >
                Contact
              </Link>
            </nav>

            {/* Contact Info - Desktop */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-secondary" />
                <div>
                  <div className="text-xs text-muted-foreground">Text or Call</div>
                  <a 
                    href="tel:214-238-4349" 
                    className="font-bold text-foreground hover:text-primary transition-colors"
                    onClick={() => handleTrackClick('Phone: 214-238-4349', 'Header - Main Nav', 'tel:214-238-4349')}
                  >
                    214-238-4349
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-secondary" />
                <div>
                  <div className="text-xs text-muted-foreground">Email Us</div>
                  <a
                    href="mailto:info@truficient.com"
                    className="font-bold text-foreground hover:text-primary transition-colors"
                    onClick={() => handleTrackClick('Email: info@truficient.com', 'Header - Main Nav', 'mailto:info@truficient.com')}
                  >
                    info@truficient.com
                  </a>
                </div>
              </div>
            </div>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="touch-target">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-80 overflow-y-auto">
                <nav className="flex flex-col gap-1 mt-6">
                  <Link
                    to="/"
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-3 touch-target flex items-center"
                    onClick={() => {
                      handleTrackClick('Home', 'Header - Mobile Menu', '/');
                      setIsOpen(false);
                    }}
                  >
                    Home
                  </Link>

                  {/* Services Collapsible */}
                  <Collapsible open={openMobileMenus.services} onOpenChange={() => toggleMobileMenu('services')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-lg font-medium text-foreground hover:text-primary transition-colors py-3 touch-target">
                      Services
                      <ChevronRight className={`w-4 h-4 transition-transform ${openMobileMenus.services ? 'rotate-90' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1 pb-2">
                      <Link
                        to="/services/residential"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Residential', 'Header - Mobile Menu', '/services/residential');
                          setIsOpen(false);
                        }}
                      >
                        Residential
                      </Link>
                      <Link
                        to="/services/commercial"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Commercial', 'Header - Mobile Menu', '/services/commercial');
                          setIsOpen(false);
                        }}
                      >
                        Commercial
                      </Link>
                      <Link
                        to="/services/ductless"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Ductless (Mini-Splits)', 'Header - Mobile Menu', '/services/ductless');
                          setIsOpen(false);
                        }}
                      >
                        Ductless (Mini-Splits)
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Estimators Collapsible */}
                  <Collapsible open={openMobileMenus.estimators} onOpenChange={() => toggleMobileMenu('estimators')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-lg font-medium text-foreground hover:text-primary transition-colors py-3 touch-target">
                      Estimators
                      <ChevronRight className={`w-4 h-4 transition-transform ${openMobileMenus.estimators ? 'rotate-90' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1 pb-2">
                      <Link
                        to="/central-ac-estimate"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Central AC Estimate', 'Header - Mobile Menu', '/central-ac-estimate');
                          setIsOpen(false);
                        }}
                      >
                        Central AC Estimate
                      </Link>
                      <Link
                        to="/mini-split-estimate"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Mini Split Estimate', 'Header - Mobile Menu', '/mini-split-estimate');
                          setIsOpen(false);
                        }}
                      >
                        Mini Split Estimate
                      </Link>
                      <Link
                        to="/multi-zone-estimate"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Multi-Zone Estimate', 'Header - Mobile Menu', '/multi-zone-estimate');
                          setIsOpen(false);
                        }}
                      >
                        Multi-Zone Estimate
                      </Link>
                      <Link
                        to="/estimators/sizing"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Sizing Calculator', 'Header - Mobile Menu', '/estimators/sizing');
                          setIsOpen(false);
                        }}
                      >
                        Sizing Calculator
                      </Link>
                      <Link
                        to="/estimators/savings"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Savings Calculator', 'Header - Mobile Menu', '/estimators/savings');
                          setIsOpen(false);
                        }}
                      >
                        Savings Calculator
                      </Link>
                      <Link
                        to="/heat-pump-advantage"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Heat Pump Advantage', 'Header - Mobile Menu', '/heat-pump-advantage');
                          setIsOpen(false);
                        }}
                      >
                        Heat Pump Advantage
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Resources Collapsible */}
                  <Collapsible open={openMobileMenus.resources} onOpenChange={() => toggleMobileMenu('resources')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-lg font-medium text-foreground hover:text-primary transition-colors py-3 touch-target">
                      Resources
                      <ChevronRight className={`w-4 h-4 transition-transform ${openMobileMenus.resources ? 'rotate-90' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1 pb-2">
                      <Link
                        to="/scanner"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Equipment Scanner', 'Header - Mobile Menu', '/scanner');
                          setIsOpen(false);
                        }}
                      >
                        Equipment Scanner
                      </Link>
                      <Link
                        to="/equipment"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Equipment Library', 'Header - Mobile Menu', '/equipment');
                          setIsOpen(false);
                        }}
                      >
                        Equipment Library
                      </Link>
                      <Link
                        to="/resources/catalogs"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Catalogs', 'Header - Mobile Menu', '/resources/catalogs');
                          setIsOpen(false);
                        }}
                      >
                        Catalogs
                      </Link>
                      <Link
                        to="/financing"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Financing', 'Header - Mobile Menu', '/financing');
                          setIsOpen(false);
                        }}
                      >
                        Financing
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* About Us Collapsible */}
                  <Collapsible open={openMobileMenus.about} onOpenChange={() => toggleMobileMenu('about')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-lg font-medium text-foreground hover:text-primary transition-colors py-3 touch-target">
                      About Us
                      <ChevronRight className={`w-4 h-4 transition-transform ${openMobileMenus.about ? 'rotate-90' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1 pb-2">
                      <Link
                        to="/about"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Our Story', 'Header - Mobile Menu', '/about');
                          setIsOpen(false);
                        }}
                      >
                        Our Story
                      </Link>
                      <Link
                        to="/blog"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Blog', 'Header - Mobile Menu', '/blog');
                          setIsOpen(false);
                        }}
                      >
                        Blog
                      </Link>
                      <Link
                        to="/careers"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Careers', 'Header - Mobile Menu', '/careers');
                          setIsOpen(false);
                        }}
                      >
                        Careers
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Service Areas Collapsible */}
                  <Collapsible open={openMobileMenus.serviceAreas} onOpenChange={() => toggleMobileMenu('serviceAreas')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-lg font-medium text-foreground hover:text-primary transition-colors py-3 touch-target">
                      Service Areas
                      <ChevronRight className={`w-4 h-4 transition-transform ${openMobileMenus.serviceAreas ? 'rotate-90' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1 pb-2">
                      <Link
                        to="/service-areas/dallas-area"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Dallas Area', 'Header - Mobile Menu', '/service-areas/dallas-area');
                          setIsOpen(false);
                        }}
                      >
                        Dallas Area
                      </Link>
                      <Link
                        to="/service-areas/north-dallas-area"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('North Dallas Area', 'Header - Mobile Menu', '/service-areas/north-dallas-area');
                          setIsOpen(false);
                        }}
                      >
                        North Dallas Area
                      </Link>
                      <Link
                        to="/service-areas/frisco-mckinney-area"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Frisco-McKinney Area', 'Header - Mobile Menu', '/service-areas/frisco-mckinney-area');
                          setIsOpen(false);
                        }}
                      >
                        Frisco-McKinney Area
                      </Link>
                      <Link
                        to="/service-areas/mid-cities-area"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('Mid-Cities Area', 'Header - Mobile Menu', '/service-areas/mid-cities-area');
                          setIsOpen(false);
                        }}
                      >
                        Mid-Cities Area
                      </Link>
                      <Link
                        to="/service-areas/south-dallas-area"
                        className="block text-base text-muted-foreground hover:text-primary transition-colors py-2.5 touch-target"
                        onClick={() => {
                          handleTrackClick('South Dallas Area', 'Header - Mobile Menu', '/service-areas/south-dallas-area');
                          setIsOpen(false);
                        }}
                      >
                        South Dallas Area
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>

                  <Link
                    to="/contact"
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-3 touch-target flex items-center"
                    onClick={() => {
                      handleTrackClick('Contact', 'Header - Mobile Menu', '/contact');
                      setIsOpen(false);
                    }}
                  >
                    Contact
                  </Link>

                  <div className="border-t pt-4 mt-4 space-y-3">
                    <a 
                      href="tel:214-238-4349"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted touch-target"
                      onClick={() => handleTrackClick('Phone: 214-238-4349', 'Header - Mobile Menu', 'tel:214-238-4349')}
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-secondary-foreground" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Call or Text</div>
                        <div className="font-bold">214-238-4349</div>
                      </div>
                    </a>
                    <a 
                      href="mailto:info@truficient.com"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted touch-target"
                      onClick={() => handleTrackClick('Email: info@truficient.com', 'Header - Mobile Menu', 'mailto:info@truficient.com')}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Email Us</div>
                        <div className="font-bold text-sm">info@truficient.com</div>
                      </div>
                    </a>
                  </div>
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between py-3 border-t border-border">
                    <span className="text-muted-foreground">Theme</span>
                    <ThemeToggle />
                  </div>
                  
                  <Link 
                    to="/contact" 
                    onClick={() => {
                      handleTrackClick('Schedule Service', 'Header - Mobile Menu', '/contact');
                      setIsOpen(false);
                    }}
                  >
                    <Button className="w-full mt-4 h-12 bg-secondary hover:bg-gold-dark text-secondary-foreground font-semibold text-base">
                      Schedule Service
                    </Button>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;