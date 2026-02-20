import React from "react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      title: (
        <a
          href="https://nostria.app/p/npub17kmyqx5r7ec6aqnlfaqlejwt9qk2th5yny82fewvgd4x5k5elpwqnrya96"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-500 hover:text-brand-400 underline underline-offset-4 decoration-brand-500/30 hover:decoration-brand-500/80 transition-all"
        >
          Follow the Bot
        </a>
      ),
      text: "Simply follow the official Streakstr bot on Nostr. This automatically initializes your first solo streak.",
    },
    {
      num: "02",
      title: "Post Daily",
      text: "Post a note or reply within your 24-hour window. Your window is personal to your first post time.",
    },
    {
      num: "03",
      title: "Don't Break It",
      text: "If the timer hits zero without activity, your count resets to 0. No excuses. No mercy.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-12 sm:py-24 bg-section/50 border-y border-outline"
    >
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              How it Works
            </h2>
            <p className="text-muted text-lg mb-8 leading-relaxed">
              Every streak runs on a rolling 24-hour window. No timezone hassle.
              Your clock starts when you post — you have until the same time
              tomorrow.
            </p>

            <div className="space-y-8">
              {steps.map((step, _idx) => (
                <div key={step.num} className="flex gap-6">
                  <div className="shrink-0 w-12 h-12 rounded-full border border-outline bg-surface flex items-center justify-center font-mono font-bold text-brand-500">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-subtle">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden sm:block relative ">
            {/* Abstract Clock/Window Representation */}
            <div className="aspect-square relative rounded-full border border-outline bg-surface/30 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-tr from-brand-900/20 to-transparent" />

              {/* Timer Circle */}
              <div className="w-3/4 h-3/4 rounded-full border-2 border-outline relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-brand-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.8)] z-20" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 w-0.5 bg-linear-to-b from-brand-500/50 to-transparent origin-bottom rotate-45 transform" />

                {/* Inner Status */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="text-5xl font-mono font-bold text-foreground mb-1">
                    23:42
                  </div>
                  <div className="text-xs text-brand-500 uppercase tracking-widest">
                    Time Remaining
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
