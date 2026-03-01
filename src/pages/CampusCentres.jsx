import { MapPin, Users, Zap, CheckCircle2 } from "lucide-react";

const CampusCentres = () => {
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-black rounded-3xl p-10 md:p-16 text-white shadow-xl relative overflow-hidden border border-indigo-500/30 mb-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
            <MapPin className="w-3.5 h-3.5" /> Offline Expansion
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            Discotive Career Hubs.
            <br />
            Now on your campus.
          </h1>
          <p className="text-lg text-indigo-100/70 mb-8 font-medium">
            Join the elite offline community. Get face-to-face mentorship,
            co-working spaces, and exclusive networking events right inside your
            college.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-950 font-extrabold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              Join for ₹199 / month
            </button>
            <span className="text-sm font-medium text-indigo-300">
              Initial rollout in Jaipur, Rajasthan.
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#121212] p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-6 text-amber-600">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
            In-Person Mentorship
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Weekly offline sessions with industry veterans and top alumni from
            your city.
          </p>
        </div>
        <div className="bg-white dark:bg-[#121212] p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
            Hardware & Co-working
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Access to premium tech infrastructure, high-speed Wi-Fi, and
            collaborative workspaces.
          </p>
        </div>
        <div className="bg-white dark:bg-[#121212] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 border-primary-500/50 shadow-[0_0_30px_rgba(37,99,235,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
            POPULAR
          </div>
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mb-6 text-primary-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
            Direct Referrals
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Priority access to local internship drives and exclusive hiring
            events hosted at the hub.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CampusCentres;
