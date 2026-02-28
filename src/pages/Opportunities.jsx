import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Sparkles,
  Building2,
  Filter,
} from "lucide-react";

const Opportunities = () => {
  // Production-grade mock data reflecting algorithmic matching
  const opportunities = [
    {
      id: 1,
      company: "Nexus Tech",
      role: "Frontend Engineering Intern",
      type: "Internship",
      location: "Remote",
      duration: "6 Months",
      stipend: "$2,000/mo",
      matchScore: 94,
      logo: "N",
      tags: ["React", "Tailwind", "TypeScript"],
    },
    {
      id: 2,
      company: "Global FinServe",
      role: "Product Management Apprentice",
      type: "Mentorship Program",
      location: "Hybrid",
      duration: "3 Months",
      stipend: "Unpaid (Academic Credit)",
      matchScore: 88,
      logo: "GF",
      tags: ["Strategy", "Agile", "Wireframing"],
    },
    {
      id: 3,
      company: "Pinnacle AI",
      role: "Global AI Hackathon 2026",
      type: "Competition",
      location: "Online",
      duration: "48 Hours",
      stipend: "$50k Prize Pool",
      matchScore: 98,
      logo: "PA",
      tags: ["Machine Learning", "Python", "Innovation"],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Opportunity Intelligence
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Curated roles and programs matched to your verified skill ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 shadow-sm border border-slate-200 dark:border-slate-800 focus-within:border-primary-500 transition-all w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles..."
              className="bg-transparent border-none outline-none ml-2 w-full text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
            />
          </div>
          <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shadow-sm">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary-500/50 dark:hover:border-primary-500/50 shadow-sm hover:shadow-md transition-all group flex flex-col h-full relative overflow-hidden"
          >
            {/* Match Score Badge */}
            <div className="absolute top-0 right-0 bg-primary-50 dark:bg-primary-900/20 border-b border-l border-primary-100 dark:border-primary-900/50 px-3 py-1.5 rounded-bl-xl flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                {opp.matchScore}% Match
              </span>
            </div>

            <div className="flex items-start gap-4 mb-5 pt-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-700 dark:text-slate-300 shrink-0">
                {opp.logo}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {opp.role}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  <Building2 className="w-4 h-4" />
                  {opp.company}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mb-6">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400" />
                {opp.location}
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" />
                {opp.duration}
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 col-span-2">
                <DollarSign className="w-4 h-4 text-slate-400" />
                {opp.stipend}
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex flex-wrap gap-2 mb-5">
                {opp.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button className="w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-primary-600 text-slate-700 dark:text-slate-200 hover:text-white transition-all">
                View Opportunity
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Opportunities;
