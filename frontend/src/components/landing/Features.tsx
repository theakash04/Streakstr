import React from "react";
import { Lock, Zap, Users, History, User, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface FeatureItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const features: FeatureItem[] = [
  {
    title: "Solo Streaks",
    description: "Track activity. Any post counts towards your daily goal.",
    icon: User,
  },
  {
    title: "Duo Streaks",
    description:
      "Team up with a partner and build unbreakable streaks together.",
    icon: Users,
  },
  {
    title: "Break History",
    description:
      "Keep a transparent log of your broken streaks and learn from failure.",
    icon: History,
  },
  {
    title: "Abuse Mode",
    description: "Get publicly roasted by the bot when you slack off.",
    icon: Zap,
  },
  {
    title: "Contribution Graph",
    description:
      "View your daily activity in a github-style contribution grid.",
    icon: Activity,
  },
  {
    title: "Privacy First",
    description: "No emails or passwords. Uses secure NIP-07 Login.",
    icon: Lock,
  },
];

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 },
  },
};

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-10 relative">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Built for consistency.
          </h2>
          <p className="text-muted text-lg">
            Simple mechanics, powerful psychology.
          </p>
        </motion.div>

        <motion.div
          variants={listVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="py-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-10">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="flex gap-4"
              >
                <div className="shrink-0 mt-1">
                  <div className="w-12 h-12 rounded-xl bg-surface border border-outline flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.05)]">
                    <feature.icon className="w-6 h-6 text-brand-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-lg mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
