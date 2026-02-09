// TODO: Remove Mock Data and fetch from api also onCLick add real npub to open profile
import { Header } from "@/components/Header";
import { createFileRoute } from "@tanstack/react-router";
import { Medal } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const names = [
    "Satoshi N.",
    "Alice Wonder",
    "Bob Builder",
    "Charlie Dev",
    "Diana Code",
    "Edward Script",
    "Fiona Stack",
    "George Binary",
    "Hannah Hash",
    "Ivan Node",
    "Julia React",
    "Kevin Vue",
    "Luna Angular",
    "Mike Rust",
    "Nina Python",
    "Oscar Java",
    "Penny Swift",
    "Quinn Go",
    "Ruby Rails",
    "Sam Docker",
    "Tina Kube",
    "Uma Linux",
    "Victor Git",
    "Wendy API",
    "Xavier REST",
    "Yara Graph",
    "Zack Redis",
    "Amber SQL",
    "Blake SSH",
    "Cleo DNS",
    "Derek TCP",
    "Eva UDP",
    "Finn HTTP",
    "Grace REST",
    "Hugo JSON",
    "Iris XML",
    "Jake YAML",
    "Kate Bash",
    "Leo Vim",
    "Mia Emacs",
    "Noah Nano",
    "Olive Helix",
    "Pete Code",
    "Rosa Build",
    "Steve Deploy",
    "Tara Debug",
    "Umar Test",
    "Vera CI",
    "Wren CD",
    "Xena Ops",
  ];

  const leaderboard = names.map((name, i) => ({
    id: i + 1,
    user: {
      name,
      picture: `https://i.pravatar.cc/150?u=${i + 1 + 3}`,
      npub: `npub1${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    },
    count: Math.max(0, 150 - i * 3 + Math.floor(Math.random() * 5)),
  }));

  return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center w-full bg-background py-10 px-4">
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 w-full max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">
                Leaderboard
              </h2>
              <p className="text-text-secondary mt-1">
                Top performers on the protocol.
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-16 z-20">
                <tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted font-semibold">
                  <th className="p-4 pl-6 w-16 bg-surface-muted">Rank</th>
                  <th className="p-4 bg-surface-muted">User</th>
                  <th className="p-4 pr-6 text-right bg-surface-muted">
                    Streak
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaderboard.map((entry, idx) => (
                  <tr
                    key={entry.id}
                    onClick={() =>
                      window.open(
                        `https://njump.me/${entry.user.npub}`,
                        "_blank",
                      )
                    }
                    className="hover:bg-surface-hover/50 transition-colors group cursor-pointer"
                  >
                    <td className="p-4 pl-6 text-text-secondary font-medium">
                      {idx === 0 ? (
                        <Medal className="w-6 h-6 text-yellow-400" />
                      ) : idx === 1 ? (
                        <Medal className="w-6 h-6 text-gray-400" />
                      ) : idx === 2 ? (
                        <Medal className="w-6 h-6 text-amber-600" />
                      ) : (
                        <span className="ml-1.5 font-mono text-muted">
                          {idx + 1}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={entry.user.picture}
                          alt=""
                          className="w-8 h-8 rounded-full bg-surface-muted border border-border"
                        />
                        <span className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                          {entry.user.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right font-bold text-text-primary">
                      {entry.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
