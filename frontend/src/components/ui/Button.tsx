import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  isLoading,
  icon,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const variants = {
    primary:
      "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/20 focus:ring-brand-500",
    secondary:
      "bg-surface hover:bg-outline text-foreground border border-outline focus:ring-subtle",
    outline:
      "bg-transparent border border-outline text-muted hover:border-brand-500 hover:text-brand-500 focus:ring-brand-500",
    ghost:
      "bg-transparent text-muted hover:text-foreground hover:bg-foreground/5",
  };

  const sizes = "px-6 py-3 text-sm sm:text-base";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!isLoading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};
