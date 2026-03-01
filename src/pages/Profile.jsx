import {
  Mail,
  MapPin,
  Building,
  GraduationCap,
  Github,
  Linkedin,
  ExternalLink,
  Edit2,
  Upload,
} from "lucide-react";

const Profile = () => {
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-12">
      {/* Cover & Avatar */}
      <div className="relative rounded-3xl overflow-hidden mb-16 bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="h-48 bg-gradient-to-r from-primary-600 to-blue-400 relative">
          <button className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 -mt-12 md:-mt-16 mb-6">
            <div className="flex items-end gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white dark:bg-[#121212] p-1.5 shadow-xl relative">
                <div className="w-full h-full bg-gradient-to-tr from-primary-600 to-blue-400 rounded-xl flex items-center justify-center text-white text-4xl font-bold">
                  JD
                </div>
                <button className="absolute bottom-2 right-2 p-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:text-primary-600 transition-colors">
                  <Upload className="w-4 h-4" />
                </button>
              </div>
              <div className="mb-2">
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  John Doe
                </h1>
                <p className="text-primary-600 dark:text-primary-400 font-semibold mt-1 flex items-center gap-2">
                  <Building className="w-4 h-4" /> B.Tech Computer Science and
                  Engineering
                </p>
              </div>
            </div>

            <button className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-sm hover:shadow transition-all w-full md:w-auto">
              Share Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mt-8 border-t border-slate-100 dark:border-slate-800/50 pt-8">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <GraduationCap className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  University
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  JECRC Foundation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <MapPin className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Location
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  Jaipur, Rajasthan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <Mail className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Email
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  john.doe@jecrc.ac.in
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 md:mt-0">
              <a
                href="#"
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
