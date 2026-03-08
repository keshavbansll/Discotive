import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthLoader from "../components/AuthLoader";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  ChevronRight,
  Loader2,
  AlertCircle,
  Github,
  Linkedin,
  Globe,
  Youtube,
  Instagram,
  Twitter,
  Link as LinkIcon,
} from "lucide-react";

// --- SLIDESHOW DATA (Custom Quotes) ---
const slides = [
  {
    image: "/stock/Wolf of Wall Street 1.jpg",
    quote:
      "The only thing standing between you and your goal is the bulls**t story you keep telling yourself as to why you can’t achieve it.",
    author: "Jordan Belfort",
  },
  {
    image: "/stock/F1.jpg",
    quote: "We can't win if we don't try.",
    author: "Sonny Hayes",
  },
  {
    image: "/stock/The Social Network.jpg",
    quote:
      "Look, a guy who builds a nice chair doesn't owe money to everyone who has ever built a chair, okay? They came to me with an idea, I had a better one.",
    author: "Mark Zuckerberg",
  },
  {
    image: "/stock/American Psycho.jpg",
    quote:
      "I'm at a point in my life where there seems to be so many possibilities but just so unsure.",
    author: "Patrick Bateman",
  },
];

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isBooting, setIsBooting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // --- STATE VARIABLES ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [currentStatus, setCurrentStatus] = useState("");
  const [institution, setInstitution] = useState("");
  const [course, setCourse] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [gradYear, setGradYear] = useState("");

  const [passion, setPassion] = useState("");
  const [niche, setNiche] = useState("");
  const [parallelPath, setParallelPath] = useState("");
  const [goal3Months, setGoal3Months] = useState("");
  const [longTermGoal, setLongTermGoal] = useState("");

  const [rawSkills, setRawSkills] = useState("");
  const [alignedSkills, setAlignedSkills] = useState("");
  const [languages, setLanguages] = useState("");

  const [guardianProfession, setGuardianProfession] = useState("");
  const [incomeBracket, setIncomeBracket] = useState("");
  const [financialLaunchpad, setFinancialLaunchpad] = useState("");
  const [investmentCapacity, setInvestmentCapacity] = useState("");

  const [socials, setSocials] = useState({
    linkedin: "",
    github: "",
    youtube: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    linktree: "",
    reddit: "",
    portfolio: "",
    other: "",
  });
  const handleSocialChange = (field, value) =>
    setSocials((prev) => ({ ...prev, [field]: value }));

  // Step 7: The Open Canvas
  const [wildcardInfo, setWildcardInfo] = useState("");
  const [coreMotivation, setCoreMotivation] = useState("");

  // --- HANDLERS ---
  const handleSignUpStep1 = (e) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName)
      return setError("Identity fields are required.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    setError("");
    // Notice we do NOT create the account here anymore! We just go to step 2.
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setIsBooting(true); // Trigger the cinematic full-screen AI loader instantly!
    setError("");

    try {
      // 1. Create the Auth user in the background
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 2. Save all data to Firestore in the background
      await setDoc(doc(db, "users", user.uid), {
        identity: { firstName, lastName, email },
        baseline: {
          currentStatus,
          institution,
          course,
          specialization,
          gradYear,
        },
        vision: { passion, niche, parallelPath, goal3Months, longTermGoal },
        skills: { rawSkills, alignedSkills, languages },
        resources: {
          guardianProfession,
          incomeBracket,
          financialLaunchpad,
          investmentCapacity,
        },
        footprint: socials,
        wildcard: { wildcardInfo, coreMotivation },
        discotiveScore: 500,
        createdAt: new Date().toISOString(),
      });
      // We do NOT navigate here. The AuthLoader handles navigation after 6 seconds.
    } catch (err) {
      // If Firebase fails, kill the loader and show the error
      setIsBooting(false);
      setError(err.message.replace("Firebase: ", ""));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Enter email and password.");
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app");
    } catch (err) {
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  // --- UI COMPONENTS ---
  const inputClass =
    "w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-all [&::-webkit-scrollbar]:hidden";
  const labelClass =
    "block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row font-sans selection:bg-white selection:text-black">
      {/* LEFT SIDE: Cinematic Slideshow & Branding */}
      <div className="hidden md:flex md:w-5/12 p-12 flex-col justify-between relative overflow-hidden bg-black border-r border-white/5">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentSlide}
            src={slides[currentSlide].image}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.4, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-0" />

        <div className="relative z-10">
          <Link
            to="/"
            className="flex items-center gap-3 mb-16 hover:opacity-80 transition-opacity w-fit"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black font-extrabold text-xl shadow-[0_0_20px_white]">
              D
            </div>
            <span className="text-2xl font-extrabold tracking-tighter drop-shadow-lg">
              DISCOTIVE
            </span>
          </Link>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[0.9] mb-6 drop-shadow-xl">
            Build your <br />
            monopoly.
          </h1>
          <p className="text-lg text-slate-300 font-medium max-w-sm leading-relaxed drop-shadow-md">
            Stop consuming. Start executing. Join the ecosystem of outlier
            founders, engineers, and creators.
          </p>
        </div>

        <div className="relative z-10 my-auto pt-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.8 }}
              className="max-w-md"
            >
              <p className="text-2xl font-bold tracking-tight text-white mb-4 leading-tight">
                "{slides[currentSlide].quote}"
              </p>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
                — {slides[currentSlide].author}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative z-10 -mx-12 overflow-hidden border-t border-white/10 bg-black/40 backdrop-blur-md py-4 flex items-center mt-10">
          <div className="absolute left-0 w-16 h-full bg-gradient-to-r from-black to-transparent z-10" />
          <div className="absolute right-0 w-16 h-full bg-gradient-to-l from-black to-transparent z-10" />
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
            className="flex items-center gap-8 whitespace-nowrap text-xs font-bold tracking-widest uppercase text-slate-500"
          >
            <span className="text-white">Trusted by talent from:</span>
            <span>✦ IIT Bombay</span>
            <span>✦ BITS Pilani</span>
            <span>✦ JECRC Foundation</span>
            <span>✦ VIT Vellore</span>
            <span>✦ SRM Institute</span>
            <span>✦ NID</span>
            <span>✦ Stanford</span>
            <span>✦ IIT Bombay</span>
            <span>✦ BITS Pilani</span>
            <span>✦ JECRC Foundation</span>
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDE: The Forms */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
        <div className="w-full max-w-lg py-10">
          <AnimatePresence mode="wait">
            {/* LOGIN */}
            {isLogin && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
                  Welcome back.
                </h2>
                <p className="text-slate-400 font-medium mb-8">
                  Access your Command Center.
                </p>
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Boot OS"
                    )}
                  </button>
                </form>
                <p className="mt-8 text-center text-sm font-medium text-slate-500">
                  New here?{" "}
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setStep(1);
                      setError("");
                    }}
                    className="text-white hover:underline transition-all font-bold"
                  >
                    Create your universe
                  </button>
                </p>
              </motion.div>
            )}

            {/* STEP 1: IDENTITY */}
            {!isLogin && step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                  <span className="text-white">Step 1</span>{" "}
                  <span className="opacity-30">/ 7</span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
                  Initialize Profile.
                </h2>
                <p className="text-slate-400 font-medium mb-8">
                  Your baseline identity.
                </p>
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}
                <form onSubmit={handleSignUpStep1} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Secure Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      required
                      minLength="6"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-6 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-between group"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
                <p className="mt-8 text-center text-sm font-medium text-slate-500">
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setError("");
                    }}
                    className="text-white hover:underline transition-all font-bold"
                  >
                    Log in here
                  </button>
                </p>
              </motion.div>
            )}

            {/* STEP 2: EDUCATION */}
            {!isLogin && step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                  <span className="text-white">Step 2</span>{" "}
                  <span className="opacity-30">/ 7</span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
                  The Baseline.
                </h2>
                <p className="text-slate-400 font-medium mb-8">
                  Where are you starting from?
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(3);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass}>Current Status</label>
                    <select
                      value={currentStatus}
                      onChange={(e) => setCurrentStatus(e.target.value)}
                      className={inputClass}
                      required
                    >
                      <option value="" disabled>
                        Select status...
                      </option>
                      <option value="Undergraduate">
                        Undergraduate Student
                      </option>
                      <option value="Working Professional">
                        Working Professional
                      </option>
                      <option value="Freelancer/Creator">
                        Freelancer / Creator
                      </option>
                      <option value="Dropped Out/Building">
                        Dropped Out / Building
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Institution / Organization (Optional)
                    </label>
                    <input
                      list="colleges"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className={inputClass}
                      placeholder="Type to search or enter custom..."
                    />
                    <datalist id="colleges">
                      <option value="JECRC Foundation" />
                      <option value="IIT Bombay" />
                      <option value="IIT Delhi" />
                      <option value="BITS Pilani" />
                      <option value="VIT Vellore" />
                      <option value="SRM Institute" />
                    </datalist>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>
                        Course / Degree (Optional)
                      </label>
                      <input
                        list="courses"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className={inputClass}
                        placeholder="e.g., B.Tech, B.Des..."
                      />
                      <datalist id="courses">
                        <option value="B.Tech" />
                        <option value="BCA" />
                        <option value="BBA" />
                        <option value="B.Des" />
                        <option value="MBA" />
                      </datalist>
                    </div>
                    <div>
                      <label className={labelClass}>
                        Specialization (Optional)
                      </label>
                      <input
                        list="specs"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className={inputClass}
                        placeholder="e.g., Computer Science..."
                      />
                      <datalist id="specs">
                        <option value="Computer Science (CSE)" />
                        <option value="Artificial Intelligence" />
                        <option value="Film Production" />
                        <option value="UI/UX Design" />
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Graduation Year (Optional)
                    </label>
                    <input
                      type="number"
                      value={gradYear}
                      onChange={(e) => setGradYear(e.target.value)}
                      className={inputClass}
                      placeholder="e.g., 2027"
                    />
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-4 bg-[#121212] border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-between group"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 3: VISION */}
            {!isLogin && step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                  <span className="text-white">Step 3</span>{" "}
                  <span className="opacity-30">/ 7</span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
                  The Vision.
                </h2>
                <p className="text-slate-400 font-medium mb-8">
                  What do you want to be called?
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(4);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass}>
                      #PASSION (Ultimate Title)
                    </label>
                    <input
                      list="passions"
                      value={passion}
                      onChange={(e) => setPassion(e.target.value)}
                      className={inputClass}
                      placeholder="Type or select..."
                      required
                    />
                    <datalist id="passions">
                      <option value="Founder" />
                      <option value="Software Engineer" />
                      <option value="Filmmaker / Director" />
                      <option value="Content Creator" />
                      <option value="Product Designer" />
                      <option value="AI Researcher" />
                    </datalist>
                  </div>
                  <div>
                    <label className={labelClass}>The Niche (Optional)</label>
                    <input
                      type="text"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      className={inputClass}
                      placeholder="e.g., Full-Stack, Indie Hacker, Editor..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Parallel Goal (Optional)
                    </label>
                    <input
                      type="text"
                      value={parallelPath}
                      onChange={(e) => setParallelPath(e.target.value)}
                      className={inputClass}
                      placeholder="e.g., Filmmaking alongside Engineering"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>3-Month Goal</label>
                      <input
                        type="text"
                        value={goal3Months}
                        onChange={(e) => setGoal3Months(e.target.value)}
                        className={inputClass}
                        placeholder="e.g., Land a frontend internship"
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Long-Term Goal</label>
                      <input
                        type="text"
                        value={longTermGoal}
                        onChange={(e) => setLongTermGoal(e.target.value)}
                        className={inputClass}
                        placeholder="e.g., Raise Seed Round"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-4 bg-[#121212] border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-between group"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 4: SKILLS */}
            {!isLogin && step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                  <span className="text-white">Step 4</span>{" "}
                  <span className="opacity-30">/ 7</span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
                  The Skill Audit.
                </h2>
                <p className="text-slate-400 font-medium mb-8">
                  What is your current arsenal?
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(5);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass}>Raw Inventory</label>
                    <textarea
                      value={rawSkills}
                      onChange={(e) => setRawSkills(e.target.value)}
                      rows="2"
                      className={inputClass}
                      placeholder="List everything. Python, Video Editing, Cooking..."
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      The Alignment Filter (Optional)
                    </label>
                    <textarea
                      value={alignedSkills}
                      onChange={(e) => setAlignedSkills(e.target.value)}
                      rows="2"
                      className={inputClass}
                      placeholder="Which of these align with your goals?"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Languages Known (Optional)
                    </label>
                    <input
                      type="text"
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      className={inputClass}
                      placeholder="English, Hindi, Japanese..."
                    />
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-6 py-4 bg-[#121212] border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-between group"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 5: RESOURCES */}
            {!isLogin && step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                  <span className="text-white">Step 5</span>{" "}
                  <span className="opacity-30">/ 7</span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
                  Resource Map.
                </h2>
                <p className="text-slate-400 font-medium mb-8">
                  Tailoring your realistic scholarship & tool paths.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(6);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass}>
                      Primary Guardian's Profession (Optional)
                    </label>
                    <input
                      type="text"
                      value={guardianProfession}
                      onChange={(e) => setGuardianProfession(e.target.value)}
                      className={inputClass}
                      placeholder="e.g., Teacher, Business Owner"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Household Income Bracket (Optional)
                    </label>
                    <select
                      value={incomeBracket}
                      onChange={(e) => setIncomeBracket(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select bracket...</option>
                      <option value="< 5L">Less than ₹5 Lakhs</option>
                      <option value="5L - 10L">₹5 Lakhs - ₹10 Lakhs</option>
                      <option value="> 10L">More than ₹10 Lakhs</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Financial Launchpad (Optional)
                    </label>
                    <select
                      value={financialLaunchpad}
                      onChange={(e) => setFinancialLaunchpad(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select backing level...</option>
                      <option value="Bootstrapping">
                        Bootstrapping / Self-funded
                      </option>
                      <option value="Limited Support">Limited Support</option>
                      <option value="Highly Backed">Highly Backed</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Career Investment Capacity (Optional)
                    </label>
                    <select
                      value={investmentCapacity}
                      onChange={(e) => setInvestmentCapacity(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select capacity...</option>
                      <option value="Minimal">Minimal (Free tools only)</option>
                      <option value="Moderate">
                        Moderate (Basic courses/tools)
                      </option>
                      <option value="High">High (Premium gear)</option>
                    </select>
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="px-6 py-4 bg-[#121212] border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-between group"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 6: FOOTPRINT */}
            {!isLogin && step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                  <span className="text-white">Step 6</span>{" "}
                  <span className="opacity-30">/ 7</span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
                  Digital Footprint.
                </h2>
                <p className="text-slate-400 font-medium mb-8">
                  Connect your external ledger. (All optional)
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(7);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={socials.linkedin}
                        onChange={(e) =>
                          handleSocialChange("linkedin", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="LinkedIn URL"
                      />
                    </div>
                    <div className="relative">
                      <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={socials.github}
                        onChange={(e) =>
                          handleSocialChange("github", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="GitHub URL"
                      />
                    </div>
                    <div className="relative">
                      <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={socials.youtube}
                        onChange={(e) =>
                          handleSocialChange("youtube", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="YouTube Channel"
                      />
                    </div>
                    <div className="relative">
                      <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={socials.instagram}
                        onChange={(e) =>
                          handleSocialChange("instagram", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="Instagram Profile"
                      />
                    </div>
                    <div className="relative">
                      <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={socials.twitter}
                        onChange={(e) =>
                          handleSocialChange("twitter", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="X / Twitter"
                      />
                    </div>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={socials.linktree}
                        onChange={(e) =>
                          handleSocialChange("linktree", e.target.value)
                        }
                        className={`${inputClass} pl-10`}
                        placeholder="Linktree"
                      />
                    </div>
                  </div>
                  <div className="relative mt-2">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="url"
                      value={socials.portfolio}
                      onChange={(e) =>
                        handleSocialChange("portfolio", e.target.value)
                      }
                      className={`${inputClass} pl-12`}
                      placeholder="Personal Website / Portfolio URL"
                    />
                  </div>
                  <div className="relative mt-2">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="url"
                      value={socials.other}
                      onChange={(e) =>
                        handleSocialChange("other", e.target.value)
                      }
                      className={`${inputClass} pl-12`}
                      placeholder="Any other important link"
                    />
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(5)}
                      className="px-6 py-4 bg-[#121212] border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-between group"
                    >
                      <span>Continue to Final Step</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 7: THE OPEN CANVAS (Final Save) */}
            {!isLogin && step === 7 && (
              <motion.div
                key="step7"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                  <span className="text-white">Final Step</span>{" "}
                  <span className="opacity-30">/ 7</span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
                  The Open Canvas.
                </h2>
                <p className="text-slate-400 font-medium mb-8">
                  Give our AI the context it needs to guide you.
                </p>
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <form onSubmit={handleFinalSubmit} className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      Core Motivation (Optional)
                    </label>
                    <textarea
                      value={coreMotivation}
                      onChange={(e) => setCoreMotivation(e.target.value)}
                      rows="2"
                      className={inputClass}
                      placeholder="Why are you doing this? What drives you?"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Anything Else? (Optional)
                    </label>
                    <textarea
                      value={wildcardInfo}
                      onChange={(e) => setWildcardInfo(e.target.value)}
                      rows="3"
                      className={inputClass}
                      placeholder="Any unique situations, constraints, specific mentors you admire, or random facts our AI should know about you."
                    />
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(6)}
                      className="px-6 py-4 bg-[#121212] border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 group shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Boot Discotive OS"
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Auth;
