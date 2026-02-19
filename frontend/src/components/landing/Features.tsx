import React, { useRef, useState, useCallback } from "react";
import { User, Bell, Lock, Activity, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface FeatureItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const features: FeatureItem[] = [
  {
    title: "Solo Streaks",
    description:
      "Track your own activity. Post anything counts towards your daily goal.",
    icon: User,
  },
  {
    title: "Smart Reminders",
    description:
      "Configurable DMs from the bot before your window closes. Never miss a day by accident.",
    icon: Bell,
  },
  {
    title: "Abuse Mode",
    description:
      "Need motivation? Turn on Abuse Mode to get publicly shamed or roasted when you slack off.",
    icon: Zap,
  },
  {
    title: "Live Stats",
    description:
      "Visualize your consistency with beautiful charts and data. View your longest streaks.",
    icon: Activity,
  },
  {
    title: "Privacy First",
    description:
      "No emails. No passwords. Your private keys never leave your device (NIP-07 Login).",
    icon: Lock,
  },
  {
    title: "Contribution Graph",
    description:
      "See your daily activity in a colorful grid inspired by Github's contribution graph.",
    icon: User,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

export const Features: React.FC = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything you need to{" "}
            <span className="text-brand-500">stay consistent</span>.
          </h2>
          <p className="text-muted max-w-2xl mx-auto text-lg">
            Simple mechanics, powerful psychology. Designed for the
            decentralized web.
          </p>
        </motion.div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center relative"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              mousePos={mousePos}
              isHovering={isHovering}
              gridRef={gridRef}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface FeatureCardProps {
  feature: FeatureItem;
  index: number;
  mousePos: { x: number; y: number };
  isHovering: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  index,
  mousePos,
  isHovering,
  gridRef,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const getRelativePos = () => {
    if (!cardRef.current || !gridRef.current) return { x: 0, y: 0 };
    const gridRect = gridRef.current.getBoundingClientRect();
    const cardRect = cardRef.current.getBoundingClientRect();
    return {
      x: mousePos.x - (cardRect.left - gridRect.left),
      y: mousePos.y - (cardRect.top - gridRect.top),
    };
  };

  const rel = getRelativePos();

  return (
    <motion.div
      ref={cardRef}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="group relative p-8 rounded-2xl border border-outline bg-surface/40 backdrop-blur-sm hover:border-brand-500/40 transition-colors duration-300 w-full overflow-hidden hover:shadow-[0_8px_30px_rgba(249,115,22,0.08)]"
    >
      {/* Mouse-tracking spotlight glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(350px circle at ${rel.x}px ${rel.y}px, rgba(249,115,22,0.08), transparent 60%)`,
        }}
      />

      {/* Border glow that follows cursor */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(250px circle at ${rel.x}px ${rel.y}px, rgba(249,115,22,0.12), transparent 60%)`,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      />

      {/* Subtle top border accent */}
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-brand-500/0 to-transparent group-hover:via-brand-500/50 transition-all duration-500" />

      <div className="relative z-10">
        <motion.div
          className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mb-6 border border-outline group-hover:border-brand-500/40 group-hover:bg-brand-500/10 transition-all duration-300 text-muted group-hover:text-brand-500"
          whileHover={{
            rotate: [0, -8, 8, 0],
            transition: { duration: 0.5 },
          }}
        >
          <feature.icon className="w-6 h-6" />
        </motion.div>

        <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-brand-400 transition-colors duration-300">
          {feature.title}
        </h3>

        <p className="text-muted leading-relaxed text-[15px]">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
};
