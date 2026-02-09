import { ComponentType } from "react";

type SidebarItemProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  active?: boolean;
};

const SidebarItem = ({
  icon: Icon,
  label,
  active,
  onClick,
}: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
      active
        ? "bg-primary text-primary-fg shadow-md"
        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

export default SidebarItem;
