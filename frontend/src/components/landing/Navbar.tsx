import React, { useState, useEffect } from "react";
import { Flame, HandCoins, Menu, X } from "lucide-react";
import { Button } from "../ui/Button";
import ToggleBtn from "../ui/toggleBtn";
import { Link } from "@tanstack/react-router";

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [{ icon: HandCoins, name: "Sponsor", href: "/sponsor" }];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-background/5 py-4 shadow-sm"
          : "bg-transparent border-transparent py-6"
      }`}
    >
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div
            className="flex items-center gap-3 group cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="relative flex items-center justify-center">
              <Flame className="w-7 h-7 text-brand-500 transition-transform group-hover:scale-110 relative z-10" />
              <div className="absolute inset-0 bg-brand-500 blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground group-hover:text-brand-400 transition-colors">
              Streakstr
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-muted hover:text-foreground transition-colors flex items-center justify-center"
              >
                <link.icon className="w-5 h-5 inline-block mr-1" />
                {link.name}
              </a>
            ))}
            <ToggleBtn />
            <Link to={"/login"}>
              <Button
                variant="primary"
                className="px-5! py-2! text-xs! rounded-full! shadow-none hover:shadow-brand-500/20"
              >
                Launch App
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-muted hover:text-foreground p-2"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-background/95 backdrop-blur-xl border-b border-outline animate-in slide-in-from-top-2">
          <div className="px-6 py-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block text-lg font-medium text-muted hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <link.icon className="w-5 h-5 inline-block mr-2" />
                {link.name}
              </a>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-lg font-medium text-muted">Theme</span>
              <ToggleBtn />
            </div>
            <div className="pt-4">
              <Link to={"/login"} onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full">Launch App</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
