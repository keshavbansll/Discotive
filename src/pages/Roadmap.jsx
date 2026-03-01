import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Code,
  Trophy,
  Briefcase,
} from "lucide-react";

const Roadmap = () => {
  const timelineData = [
    {
      id: 1,
      month: "Month 1",
      title: "Foundation & Identity",
      description:
        "Establish your professional ledger. Build a high-conversion resume, optimize GitHub, and document initial projects.",
      icon: FileText,
      status: "completed",
    },
    {
      id: 2,
      month: "Month 2",
      title: "Core Technical Acquisition",
      description:
        "Master advanced React.js patterns and responsive UI/UX implementation for front-end architecture.",
      icon: Code,
      status: "current",
    },
    {
      id: 3,
      month: "Month 3",
      title: "Competitive Execution",
      description:
        "Participate in major hackathons (e.g., SIH or local university events) to build high-stakes project experience and teamwork skills.",
      icon: Trophy,
      status: "upcoming",
    },
    {
      id: 4,
      month: "Month 4",
      title: "Early Market Entry",
      description:
        "Apply for initial technical or business development internships to gain real-world operational exposure.",
      icon: Briefcase,
      status: "upcoming",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Career Roadmap Engine
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
          Your deterministic execution plan for the next 4 months.
        </p>
      </div>

      {/* Timeline Container */}
      <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 md:ml-6 space-y-12 pb-10">
        {timelineData.map((item, index) => {
          const Icon = item.icon;
          const isCompleted = item.status === "completed";
          const isCurrent = item.status === "current";
          const isUpcoming = item.status === "upcoming";

          return (
            <div key={item.id} className="relative pl-8 md:pl-12">
              {/* Timeline Node (The Circle on the line) */}
              <div
                className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-4 border-slate-50 dark:border-dark flex items-center justify-center
                ${isCompleted ? "bg-primary-600" : isCurrent ? "bg-primary-500 ring-4 ring-primary-500/20" : "bg-slate-200 dark:bg-slate-800"}
              `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : isCurrent ? (
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                )}
              </div>

              {/* Content Card */}
              <div
                className={`p-6 rounded-2xl border transition-all duration-300
                ${
                  isCurrent
                    ? "bg-white dark:bg-slate-900 border-primary-500/50 shadow-md dark:shadow-primary-900/10"
                    : "bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900"
                }
              `}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md
                        ${
                          isCompleted
                            ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                            : isCurrent
                              ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }
                      `}
                      >
                        {item.month}
                      </span>
                      {isCurrent && (
                        <span className="flex items-center text-xs font-semibold text-primary-600 dark:text-primary-400">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          In Progress
                        </span>
                      )}
                    </div>
                    <h3
                      className={`text-xl font-bold ${isUpcoming ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Action Button for Current Task */}
                  {isCurrent && (
                    <button className="shrink-0 mt-4 md:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2">
                      Execute Step
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Roadmap;
