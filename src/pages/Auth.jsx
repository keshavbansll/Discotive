/**
 * @fileoverview Primary Authentication and Identity Provisioning Module.
 * @module Auth/Core
 * @description
 * Implements a highly optimized, state-machine driven authentication flow.
 * Fully populated with comprehensive Indian Subcontinent & Global Taxonomies.
 * Includes native password visibility toggling, password reset flows, and a
 * crash-proof OS Boot Sequence.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useReducer,
  useMemo,
} from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthLoader from "../components/AuthLoader";
import { awardOnboardingComplete } from "../lib/scoreEngine";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { auth, db, storage } from "../firebase";
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
  ShieldAlert,
  CheckCircle2,
  Lock,
  X,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { createPortal } from "react-dom";
import emailjs from "@emailjs/browser";

// ============================================================================
// MASSIVE TAXONOMY & DATA DICTIONARIES
// ============================================================================

const COUNTRIES = [
  "India",
  "United States of America",
  "United Kingdom",
  "Canada",
  "Australia",
  "Singapore",
  "Germany",
  "France",
  "United Arab Emirates",
  "Japan",
  "South Korea",
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Armenia",
  "Austria",
  "Bahamas",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Bulgaria",
  "Chile",
  "China",
  "Colombia",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Egypt",
  "Estonia",
  "Fiji",
  "Finland",
  "Georgia",
  "Ghana",
  "Greece",
  "Hungary",
  "Iceland",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Lebanon",
  "Malaysia",
  "Maldives",
  "Mauritius",
  "Mexico",
  "Morocco",
  "Myanmar",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Oman",
  "Pakistan",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Saudi Arabia",
  "South Africa",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Thailand",
  "Turkey",
  "Ukraine",
  "Vietnam",
  "Zambia",
  "Zimbabwe",
].sort();

const INDIAN_STATES_UTS = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const INSTITUTIONS = [
  // IITs
  "IIT Bombay",
  "IIT Delhi",
  "IIT Madras",
  "IIT Kanpur",
  "IIT Kharagpur",
  "IIT Roorkee",
  "IIT Guwahati",
  "IIT Hyderabad",
  "IIT Indore",
  "IIT BHU (Varanasi)",
  "IIT (ISM) Varanasi",
  "IIT Patna",
  "IIT Bhubaneswar",
  "IIT Mandi",
  "IIT Ropar",
  "IIT Gandhinagar",
  "IIT Jodhpur",
  "IIT Tirupati",
  "IIT Bhilai",
  "IIT Goa",
  "IIT Palakkad",
  "IIT Dharwad",
  "IIT Jammu",
  // NITs
  "NIT Trichy",
  "NIT Surathkal",
  "NIT Warangal",
  "NIT Calicut",
  "NIT Rourkela",
  "MNIT Jaipur",
  "VNIT Nagpur",
  "NIT Kurukshetra",
  "NIT Allahabad",
  "NIT Durgapur",
  "NIT Silchar",
  "NIT Jalandhar",
  "NIT Meghalaya",
  "NIT Bhopal",
  "NIT Raipur",
  "NIT Agartala",
  "NIT Goa",
  "NIT Jamshedpur",
  "NIT Patna",
  "NIT Hamirpur",
  "NIT Puducherry",
  "NIT Uttarakhand",
  "NIT Delhi",
  "NIT Mizoram",
  "NIT Srinagar",
  // Jaipur / Rajasthan Locals
  "JECRC Foundation",
  "JECRC University",
  "MNIT Jaipur",
  "LNMIIT Jaipur",
  "Manipal University Jaipur (MUJ)",
  "Swami Keshavanand Institute of Technology (SKIT)",
  "Poornima College of Engineering",
  "Poornima Institute of Engineering & Technology",
  "Poornima University",
  "Amity University Jaipur",
  "Arya College of Engineering",
  "Vivekananda Global University (VGU)",
  "Rajasthan Technical University (RTU)",
  // Major Privates & Others
  "BITS Pilani (Pilani Campus)",
  "BITS Pilani (Goa Campus)",
  "BITS Pilani (Hyderabad Campus)",
  "BITS Pilani (Dubai Campus)",
  "VIT Vellore",
  "VIT Chennai",
  "SRM University (KTR)",
  "SRM University (Ramapuram)",
  "Manipal Academy of Higher Education (MAHE)",
  "Thapar Institute of Engineering and Technology",
  "Delhi Technological University (DTU)",
  "NSUT Delhi",
  "IIIT Hyderabad",
  "IIIT Delhi",
  "IIIT Bangalore",
  "IIIT Allahabad",
  "Master's Union",
  "Scaler School of Technology",
  "Scaler School of Business",
].sort();

const COURSES = [
  // Bachelors
  "B.Tech",
  "B.E.",
  "BCA",
  "B.Sc",
  "B.Sc (Hons)",
  "BBA",
  "B.Com",
  "B.Com (Hons)",
  "B.A.",
  "B.A. (Hons)",
  "B.Des",
  "B.Arch",
  "B.Pharm",
  "MBBS",
  "BDS",
  "BPT",
  "LLB",
  "BA LLB",
  "BBA LLB",
  "BHM",
  "B.Ed",
  // Masters
  "M.Tech",
  "M.E.",
  "MCA",
  "M.Sc",
  "MBA",
  "PGDM",
  "M.Com",
  "M.A.",
  "M.Des",
  "M.Arch",
  "M.Pharm",
  "MD",
  "MS",
  "LLM",
  // Others
  "Ph.D",
  "Diploma",
  "Advanced Diploma",
  "Certificate Course",
  "Bootcamp",
  "Self-Taught",
].sort();

const SPECIALIZATIONS = [
  "Computer Science Engineering (CSE)",
  "Information Technology (IT)",
  "Artificial Intelligence & Machine Learning (AI/ML)",
  "Data Science",
  "Cyber Security",
  "Cloud Computing",
  "Software Engineering",
  "Electronics & Communication Engineering (ECE)",
  "Electrical Engineering (EE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
  "Aerospace Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Robotics & Automation",
  "Finance",
  "Marketing",
  "Human Resources (HR)",
  "Operations Management",
  "International Business",
  "Business Analytics",
  "Entrepreneurship",
  "UI/UX Design",
  "Graphic Design",
  "Product Design",
  "Fashion Design",
  "Animation & VFX",
  "Filmmaking",
  "Journalism & Mass Communication",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Economics",
  "Psychology",
  "English Literature",
  "Corporate Law",
  "Criminal Law",
  "General Medicine",
  "Surgery",
].sort();

const COUNTRY_CODES = [
  "🇮🇳 +91",
  "🇺🇸 +1",
  "🇬🇧 +44",
  "🇨🇦 +1",
  "🇦🇺 +61",
  "🇸🇬 +65",
  "🇦🇪 +971",
].sort();

const MACRO_DOMAINS = [
  "Engineering",
  "Design",
  "Filmmaking",
  "Business/Operations",
  "Marketing",
  "Sales",
  "Science",
  "Healthcare/Medical",
  "Arts/Humanities",
  "Legal",
  "Finance/Accounting",
  "Content Creation",
  "Education/Academia",
  "Architecture",
  "Government/Policy",
].sort();

const MICRO_NICHES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Developer",
  "AI/ML Engineer",
  "Data Scientist",
  "Data Analyst",
  "Data Engineer",
  "DevOps Engineer",
  "Cloud Architect",
  "Blockchain Developer",
  "Cybersecurity Analyst",
  "Game Developer",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "3D Modeler",
  "Animator",
  "Director",
  "Producer",
  "Cinematographer",
  "Video Editor",
  "Screenwriter",
  "Actor",
  "Founder / CEO",
  "COO",
  "CTO",
  "Product Manager",
  "Project Manager",
  "Consultant",
  "Venture Capitalist",
  "Investment Banker",
  "Financial Analyst",
  "Accountant",
  "Growth Marketer",
  "Digital Marketer",
  "SEO Specialist",
  "Social Media Manager",
  "B2B Sales",
  "Account Executive",
  "Copywriter",
  "Journalist",
  "Public Relations",
  "Physician",
  "Surgeon",
  "Psychologist",
  "Researcher",
  "Professor",
  "Corporate Lawyer",
].sort();

const RAW_SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React.js",
  "Next.js",
  "Vue.js",
  "Node.js",
  "Express.js",
  "Django",
  "Flask",
  "Spring Boot",
  "Java",
  "C++",
  "C#",
  "C",
  "Go",
  "Rust",
  "Ruby",
  "Swift",
  "Kotlin",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Firebase",
  "AWS",
  "Google Cloud (GCP)",
  "Microsoft Azure",
  "Docker",
  "Kubernetes",
  "Git",
  "Machine Learning",
  "Deep Learning",
  "TensorFlow",
  "PyTorch",
  "Computer Vision",
  "NLP",
  "Pandas",
  "Tableau",
  "PowerBI",
  "Blockchain",
  "Solidity",
  "Figma",
  "Adobe XD",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "Adobe Premiere Pro",
  "Adobe After Effects",
  "DaVinci Resolve",
  "Blender",
  "Unity",
  "Unreal Engine",
  "SEO",
  "SEM",
  "Google Analytics",
  "Facebook Ads",
  "Copywriting",
  "B2B Sales",
  "Cold Calling",
  "Public Speaking",
  "Financial Modeling",
  "Project Management",
  "Agile",
].sort();

const LANGUAGES = [
  "English",
  "Hindi",
  "Mandarin Chinese",
  "Spanish",
  "French",
  "Arabic",
  "Bengali",
  "Russian",
  "Portuguese",
  "Urdu",
  "Indonesian",
  "German",
  "Japanese",
  "Marathi",
  "Telugu",
  "Turkish",
  "Tamil",
  "Korean",
  "Persian",
];

const CURRENT_STATUSES = [
  "School Student",
  "Undergraduate",
  "Postgraduate",
  "Working Professional",
  "Creator",
  "Freelancer",
  "Dropped Out",
  "Building the Passion",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentYear = new Date().getFullYear();
const START_YEARS = Array.from({ length: 16 }, (_, i) =>
  (currentYear - 15 + i).toString(),
).reverse();
const END_YEARS = Array.from({ length: 16 }, (_, i) =>
  (currentYear + i).toString(),
);

// ============================================================================
// UTILITY HOOKS
// ============================================================================

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ============================================================================
// HIGH-PERFORMANCE UI COMPONENTS
// ============================================================================

const CustomSearchSelect = React.memo(
  ({ options, value, onChange, placeholder, allowCustom, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState(value || "");
    const wrapperRef = useRef(null);

    useEffect(() => setQuery(value || ""), [value]);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target))
          setIsOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = useCallback(
      (e) => {
        setQuery(e.target.value);
        setIsOpen(true);
        if (allowCustom) onChange(e.target.value);
      },
      [allowCustom, onChange],
    );

    const handleSelect = useCallback(
      (opt) => {
        setQuery(opt);
        onChange(opt);
        setIsOpen(false);
      },
      [onChange],
    );

    const filtered = useMemo(
      () =>
        options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
      [options, query],
    );

    return (
      <div ref={wrapperRef} className="relative w-full">
        <div className="flex items-center w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 focus-within:border-white/40 transition-[box-shadow,transform,background,opacity,filter]">
          <input
            type="text"
            value={query || ""}
            required={required && !value}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none text-white text-sm placeholder-[#555]"
          />
          <ChevronRight
            className={`w-4 h-4 text-[#555] transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar"
            >
              {filtered.length === 0 && !allowCustom && (
                <div className="p-3 text-xs text-[#666]">No matches found.</div>
              )}
              {filtered.map((opt) => (
                <div
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className="px-4 py-3 text-sm hover:bg-[#222] cursor-pointer transition-colors text-[#ccc] hover:text-white truncate"
                >
                  {opt}
                </div>
              ))}
              {filtered.length === 0 &&
                allowCustom &&
                query.trim().length > 0 && (
                  <div
                    onClick={() => handleSelect(query)}
                    className="px-4 py-3 text-sm hover:bg-[#222] cursor-pointer text-white font-bold border-t border-[#333]"
                  >
                    + Use "{query}"
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);
CustomSearchSelect.displayName = "CustomSearchSelect";

const CustomMultiSelect = React.memo(
  ({ options, selected, onChange, placeholder, allowCustom }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const wrapperRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target))
          setIsOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOpt = useCallback(
      (val) => {
        if (selected.includes(val)) onChange(selected.filter((i) => i !== val));
        else onChange([...selected, val]);
        setQuery("");
      },
      [selected, onChange],
    );

    const filtered = useMemo(
      () =>
        options.filter(
          (o) =>
            o.toLowerCase().includes(query.toLowerCase()) &&
            !selected.includes(o),
        ),
      [options, query, selected],
    );

    return (
      <div ref={wrapperRef} className="relative w-full">
        <div
          className="min-h-[50px] w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 focus-within:border-white/40 transition-[box-shadow,transform,background,opacity,filter] flex flex-wrap gap-2 items-center cursor-text"
          onClick={() => setIsOpen(true)}
        >
          {selected.map((item) => (
            <span
              key={item}
              className="px-2.5 py-1.5 bg-[#222] border border-[#444] rounded-lg text-xs font-bold text-white flex items-center gap-2"
            >
              {item}{" "}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOpt(item);
                }}
              />
            </span>
          ))}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={selected.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm text-white placeholder-[#555]"
          />
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar"
            >
              {filtered.map((opt) => (
                <div
                  key={opt}
                  onClick={() => toggleOpt(opt)}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[#222] cursor-pointer transition-colors text-[#ccc] hover:text-white"
                >
                  <span className="truncate">{opt}</span>
                </div>
              ))}
              {filtered.length === 0 &&
                allowCustom &&
                query.trim().length > 0 && (
                  <div
                    onClick={() => toggleOpt(query)}
                    className="px-4 py-3 text-sm hover:bg-[#222] cursor-pointer text-white font-bold border-t border-[#333]"
                  >
                    + Add "{query}"
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);
CustomMultiSelect.displayName = "CustomMultiSelect";

// ============================================================================
// OAUTH PROVIDER COMPONENTS & ICONS
// ============================================================================

const OAuthButton = React.memo(
  ({ provider, icon, label, onClick, disabled }) => (
    <button
      type="button"
      onClick={() => onClick(provider)}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#121212] border border-white/10 text-white font-bold rounded-xl hover:bg-[#222] hover:border-white/20 transition-[box-shadow,transform,background,opacity,filter] shadow-sm disabled:opacity-50"
      aria-label={`Continue with ${label}`}
    >
      {disabled ? (
        <Loader2 className="w-5 h-5 animate-spin text-[#888]" />
      ) : (
        icon
      )}
      {disabled ? "Authenticating..." : `Continue with ${label}`}
    </button>
  ),
);
OAuthButton.displayName = "OAuthButton";

const GoogleIcon = (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const FacebookIcon = (
  <svg
    className="w-5 h-5 text-[#1877F2]"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const AppleIcon = (
  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z" />
  </svg>
);

// ============================================================================
// STATE MACHINE (Reducer Architecture)
// ============================================================================

const initialProfileState = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  username: "",
  gender: "",
  userState: "",
  country: "",
  countryCode: "🇮🇳 +91",
  mobileNumber: "",
  requestMessage: "",
  currentStatus: "",
  institution: "",
  course: "",
  specialization: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  passion: "",
  niche: "",
  parallelPath: "",
  goal3Months: "",
  longTermGoal: "",
  rawSkills: [],
  alignedSkills: [],
  languages: [],
  guardianProfession: "",
  incomeBracket: "",
  financialLaunchpad: "",
  investmentCapacity: "",
  personalFootprint: {
    linkedin: "",
    github: "",
    instagram: "",
    twitter: "",
    youtube: "",
    reddit: "",
    pinterest: "",
    figma: "",
    linktree: "",
    website: "",
  },
  commercialFootprint: {
    linkedinCompany: "",
    github: "",
    instagram: "",
    twitter: "",
    youtube: "",
    reddit: "",
    pinterest: "",
    figma: "",
    linktree: "",
    website: "",
  },
  wildcardInfo: "",
  coreMotivation: "",
};

function profileReducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_NESTED_FIELD":
      return {
        ...state,
        [action.parent]: {
          ...state[action.parent],
          [action.field]: action.value,
        },
      };
    case "HYDRATE_OAUTH":
      return { ...state, ...action.payload };
    case "RESET":
      return initialProfileState;
    default:
      return state;
  }
}

// ============================================================================
// MAIN AUTH SYSTEM CONTROLLER
// ============================================================================

const Auth = () => {
  const navigate = useNavigate();

  // --- TOAST NOTIFICATION ENGINE ---
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "grey") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, msg, type }]);

    // Auto-dismiss after 4.2 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  // --- SYSTEM STATES ---
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [systemStatus, setSystemStatus] = useState({
    loading: false,
    error: "",
    success: "",
    isBooting: false,
    authTaskComplete: false,
    showSetupSequence: false,
  });
  const [showPassword, setShowPassword] = useState(false); // New: Password Toggle

  // --- FORM DATA ENGINE ---
  const [profileData, dispatch] = useReducer(
    profileReducer,
    initialProfileState,
  );
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  const debouncedUsername = useDebounce(profileData.username, 600);

  // --- VISUAL ASSET ENGINE ---
  const slides = useMemo(
    () => [
      {
        image: "/stock/Wolf of Wall Street 1.jpg",
        quote:
          "Act as if! Act as if you're a wealthy man, rich already, and then you'll surely become rich.",
        author: "Jordan Belfort",
      },
      {
        image: "/stock/F1.jpg",
        quote: "We can't win if we don't try.",
        author: "Sonny Hayes",
      },
      {
        image: "/stock/Game of Thrones.png",
        quote: "Chaos isn't a pit. Chaos is a ladder.",
        author: "Petyr Baelish",
      },
      {
        image: "/stock/Succession.jpg",
        quote:
          "The game is to act like you're relaxed while your hand is closing around something unseen",
        author: "Logan Roy",
      },
    ],
    [],
  );

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setCurrentSlide((p) => (p + 1) % slides.length),
      6000,
    );
    return () => clearInterval(timer);
  }, [slides.length]);

  // --- CORE SECURITY & SESSION ROUTING ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user || systemStatus.isBooting || systemStatus.showSetupSequence)
        return; // Prevent redirect mid-boot

      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          /**
           * @description
           * A ghost document exists (created by handleSocialAuth) but onboarding
           * is incomplete. Do NOT navigate to /app — keep the user on the auth
           * flow so they complete their profile. Only fully onboarded users
           * (onboardingComplete === true) are routed to the main app.
           */
          if (
            data?.onboardingComplete === false ||
            data?.isGhostUser === true
          ) {
            setIsLogin(false);
            // Hydrate name fields from ghost doc
            dispatch({
              type: "HYDRATE_OAUTH",
              payload: {
                firstName: data?.identity?.firstName || "",
                lastName: data?.identity?.lastName || "",
                email: data?.identity?.email || user.email || "",
                username: data?.identity?.username || "",
              },
            });
            const wlSnap = await getDocs(
              query(
                collection(db, "whitelisted_emails"),
                where("email", "==", user.email || data?.identity?.email),
              ),
            );
            if (wlSnap.empty) setStep("locked");
            else setStep(2);
            return;
          }
          // Fully onboarded — route to app
          navigate("/app", { replace: true });
        } else {
          // No document at all (email/password pre-creation flow)
          const wlSnap = await getDocs(
            query(
              collection(db, "whitelisted_emails"),
              where("email", "==", user.email),
            ),
          );

          setIsLogin(false);
          if (wlSnap.empty) {
            setStep("locked");
          } else {
            setStep(2);
          }
        }
      } catch (err) {
        console.error("[AUTH_ROUTING_ERROR]", err);
      }
    });
    return unsubscribe;
  }, [navigate, systemStatus.isBooting, systemStatus.showSetupSequence]);

  // --- USERNAME VALIDATION ENGINE ---
  useEffect(() => {
    if (debouncedUsername.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    let isMounted = true;
    const verifyIdentity = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("identity.username", "==", debouncedUsername.toLowerCase()),
        );
        const snap = await getDocs(q);
        if (isMounted) setUsernameAvailable(snap.empty);
      } catch (err) {}
    };
    verifyIdentity();
    return () => {
      isMounted = false;
    };
  }, [debouncedUsername]);

  // --- OAUTH DELEGATION CONTROLLER ---
  const handleSocialAuth = useCallback(
    async (providerType) => {
      setSystemStatus((prev) => ({
        ...prev,
        loading: true,
        error: "",
        success: "",
      }));
      try {
        const providers = {
          google: new GoogleAuthProvider(),
          facebook: new FacebookAuthProvider(),
          apple: new OAuthProvider("apple.com"),
        };

        const result = await signInWithPopup(auth, providers[providerType]);
        const user = result.user;

        const nameParts = user.displayName
          ? user.displayName.split(" ")
          : ["Operator", ""];
        const safeEmail = user.email || `${user.uid}@privaterelay.appleid.com`;
        const generatedUsername = safeEmail
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        dispatch({
          type: "HYDRATE_OAUTH",
          payload: {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" "),
            email: safeEmail,
            username: generatedUsername,
          },
        });

        // Check if a Firestore user document already exists for this UID
        const existingSnap = await getDoc(doc(db, "users", user.uid));

        if (existingSnap.exists()) {
          // Fully onboarded user — route to app
          setSystemStatus((prev) => ({ ...prev, loading: false }));
          navigate("/app", { replace: true });
          return;
        }

        /**
         * @description
         * GHOST DOCUMENT PROTOCOL:
         * Create a minimal Firestore document immediately so that:
         *  1. Auth state listener doesn't loop (snap.exists() will be true)
         *  2. All platform modules can check `onboardingComplete` to lock UI
         *  3. The user can browse leaderboard etc. in a locked/preview state
         *  4. Score percentile queries don't fail on missing documents
         *
         * This doc is upgraded to a full profile in handleFinalSubmit.
         */
        const todayStr = new Date().toISOString().split("T")[0];
        await setDoc(doc(db, "users", user.uid), {
          identity: {
            firstName: nameParts[0] || "Operator",
            lastName: nameParts.slice(1).join(" ") || "",
            email: safeEmail,
            username: "", // Not yet assigned
            gender: "",
          },
          onboardingComplete: false,
          isGhostUser: true,
          createdAt: new Date().toISOString(),
          discotiveScore: {
            current: 0,
            streak: 0,
            lastLoginDate: todayStr,
            lastAmount: 0,
            lastReason: "Ghost Account — Onboarding Pending",
            lastUpdatedAt: new Date().toISOString(),
          },
          login_history: [todayStr],
        });

        const wlSnap = await getDocs(
          query(
            collection(db, "whitelisted_emails"),
            where("email", "==", safeEmail),
          ),
        );

        setIsLogin(false);
        setSystemStatus((prev) => ({ ...prev, loading: false }));

        // Route to onboarding step 2 — ghost doc ensures auth routing won't loop
        if (wlSnap.empty) setStep("locked");
        else setStep(2);
      } catch (error) {
        console.error(`[OAUTH_PROVIDER_ERROR]`, error);
        let errorMessage = error.message.replace("Firebase: ", "");
        if (error.code === "auth/account-exists-with-different-credential") {
          errorMessage =
            "Identity conflict detected. Provider credential mismatch.";
        }
        setSystemStatus((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    },
    [navigate],
  );

  // --- PASSWORD RECOVERY ENGINE ---
  const handleForgotPassword = async () => {
    if (!profileData.email) {
      return setSystemStatus((prev) => ({
        ...prev,
        error: "Please enter your email address above to reset your password.",
        success: "",
      }));
    }
    setSystemStatus((prev) => ({
      ...prev,
      loading: true,
      error: "",
      success: "",
    }));
    try {
      await sendPasswordResetEmail(auth, profileData.email);
      setSystemStatus((prev) => ({
        ...prev,
        loading: false,
        success: "Password reset sequence initiated. Check your inbox.",
      }));
    } catch (err) {
      setSystemStatus((prev) => ({
        ...prev,
        loading: false,
        error: err.message.replace("Firebase: ", ""),
      }));
    }
  };

  const getPasswordStrength = useCallback(() => {
    const p = profileData.password;
    let s = 0;
    if (p.length > 7) s += 1;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s += 1;
    if (/\d/.test(p)) s += 1;
    if (/[^a-zA-Z0-9]/.test(p)) s += 1;
    return s;
  }, [profileData.password]);

  const pwScore = getPasswordStrength();

  const setField = useCallback((field, value) => {
    dispatch({ type: "SET_FIELD", field, value });
  }, []);
  const setNestedField = useCallback((parent, field, value) => {
    dispatch({ type: "SET_NESTED_FIELD", parent, field, value });
  }, []);

  // ============================================================================
  // STRICT VALIDATION & TRANSITION ENGINES
  // ============================================================================

  const handleSignUpStep1 = useCallback(
    async (e) => {
      e.preventDefault();
      const { email, password, firstName, lastName } = profileData;

      if (!email || !password || !firstName || !lastName) {
        return setSystemStatus((prev) => ({
          ...prev,
          error: "Identity and security fields are mandatory.",
          success: "",
        }));
      }
      if (pwScore < 2) {
        return setSystemStatus((prev) => ({
          ...prev,
          error: "Security insufficient. Enhance password entropy.",
          success: "",
        }));
      }

      setSystemStatus((prev) => ({
        ...prev,
        loading: true,
        error: "",
        success: "",
      }));
      try {
        const userSnap = await getDocs(
          query(collection(db, "users"), where("identity.email", "==", email)),
        );
        if (!userSnap.empty) {
          setSystemStatus((prev) => ({
            ...prev,
            loading: false,
            error:
              "Identity conflict: Email already provisioned. Proceed to Login.",
          }));
          return;
        }

        const wlSnap = await getDocs(
          query(
            collection(db, "whitelisted_emails"),
            where("email", "==", email),
          ),
        );
        if (wlSnap.empty) {
          setStep("locked");
        } else {
          setStep(2);
        }
      } catch (err) {
        console.error("[STEP_1_VERIFICATION_FAILED]", err);
        setSystemStatus((prev) => ({
          ...prev,
          error: "System verification protocol failed.",
        }));
      } finally {
        setSystemStatus((prev) => ({ ...prev, loading: false }));
      }
    },
    [profileData, pwScore],
  );

  const handleStep2Submit = useCallback(
    (e) => {
      e.preventDefault();
      const { username, userState, country, gender } = profileData;

      if (!username || !userState || !country || !gender) {
        return setSystemStatus((prev) => ({
          ...prev,
          error: "System coordinates and handle are mandatory.",
          success: "",
        }));
      }
      if (usernameAvailable === false) {
        return setSystemStatus((prev) => ({
          ...prev,
          error: "Handle is already claimed on the network.",
          success: "",
        }));
      }

      setSystemStatus((prev) => ({ ...prev, error: "", success: "" }));
      setStep(3);
    },
    [profileData, usernameAvailable],
  );

  const handleStep3Submit = useCallback(
    (e) => {
      e.preventDefault();
      const { startMonth, startYear, endMonth, endYear } = profileData;

      if (startMonth && !startYear)
        return setSystemStatus((prev) => ({
          ...prev,
          error:
            "Timeline constraint: Start Year required if Month is provided.",
          success: "",
        }));
      if (endMonth && !endYear)
        return setSystemStatus((prev) => ({
          ...prev,
          error: "Timeline constraint: End Year required if Month is provided.",
          success: "",
        }));

      setSystemStatus((prev) => ({ ...prev, error: "", success: "" }));
      setStep(4);
    },
    [profileData],
  );

  const handleStep4Submit = useCallback(
    (e) => {
      e.preventDefault();
      const { passion, parallelPath } = profileData;

      if (passion === parallelPath && passion !== "") {
        return setSystemStatus((prev) => ({
          ...prev,
          error:
            "Logical error: Primary macro domain and parallel goal cannot be identical.",
          success: "",
        }));
      }

      setSystemStatus((prev) => ({ ...prev, error: "", success: "" }));
      setStep(5);
    },
    [profileData],
  );

  const handleStep7Submit = useCallback(
    (e) => {
      e.preventDefault();
      setSystemStatus((prev) => ({ ...prev, error: "", success: "" }));

      let allLinks = [];
      const urlRegex =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

      const validateLinks = (obj) => {
        for (const [key, val] of Object.entries(obj)) {
          if (val.trim() !== "") {
            if (!urlRegex.test(val)) {
              setSystemStatus((prev) => ({
                ...prev,
                error: `Malformed URL detected in ${key} footprint.`,
              }));
              return false;
            }
            allLinks.push(val.trim().toLowerCase());
          }
        }
        return true;
      };

      if (
        !validateLinks(profileData.personalFootprint) ||
        !validateLinks(profileData.commercialFootprint)
      )
        return;

      if (new Set(allLinks).size !== allLinks.length) {
        return setSystemStatus((prev) => ({
          ...prev,
          error:
            "Duplicate asset constraint: Cannot map the same URL to multiple footprint nodes.",
        }));
      }

      setStep(8);
    },
    [profileData.personalFootprint, profileData.commercialFootprint],
  );

  // ============================================================================
  // DATABASE TRANSACTION & OS BOOT ENGINE
  // ============================================================================

  const handleFinalSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSystemStatus((prev) => ({
        ...prev,
        isBooting: true,
        error: "",
        success: "",
        authTaskComplete: false,
      }));

      try {
        let uid;

        if (auth.currentUser) {
          uid = auth.currentUser.uid;
        } else {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            profileData.email,
            profileData.password,
          );
          uid = userCredential.user.uid;
        }

        /**
         * @description
         * Final OS boot write. Merges the full profile over the ghost doc
         * (or creates fresh for email/password users).
         * `onboardingComplete: true` is the master gate that unlocks all
         * modules across the platform.
         */
        const systemPayload = {
          identity: {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            email: profileData.email,
            username: profileData.username.toLowerCase(),
            gender: profileData.gender,
            // Leaderboard-queryable flat fields (mirrors of nested identity)
            domain: profileData.passion,
            niche: profileData.niche,
            parallelGoal: profileData.parallelPath,
            country: profileData.country,
          },
          onboardingComplete: true,
          isGhostUser: false,
          location: {
            state: profileData.userState,
            country: profileData.country,
            displayLocation: `${profileData.userState}, ${profileData.country}`,
          },
          baseline: {
            currentStatus: profileData.currentStatus,
            institution: profileData.institution,
            course: profileData.course,
            specialization: profileData.specialization,
            startMonth: profileData.startMonth,
            startYear: profileData.startYear,
            endMonth: profileData.endMonth,
            endYear: profileData.endYear,
          },
          vision: {
            passion: profileData.passion,
            niche: profileData.niche,
            parallelPath: profileData.parallelPath,
            goal3Months: profileData.goal3Months,
            longTermGoal: profileData.longTermGoal,
          },
          /**
           * @description
           * Flat `identity.*` mirrors for Firestore compound queries.
           * Leaderboard + percentile engines query `identity.domain`,
           * `identity.niche`, `identity.parallelGoal`, `identity.country`.
           * These MUST exist at the top level of `identity` map.
           */
          "identity.domain": profileData.passion,
          "identity.niche": profileData.niche,
          "identity.parallelGoal": profileData.parallelPath,
          "identity.country": profileData.country,
          skills: {
            rawSkills: profileData.rawSkills,
            alignedSkills: profileData.alignedSkills,
            languages: profileData.languages,
          },
          resources: {
            guardianProfession: profileData.guardianProfession,
            incomeBracket: profileData.incomeBracket,
            financialLaunchpad: profileData.financialLaunchpad,
            investmentCapacity: profileData.investmentCapacity,
          },
          footprint: {
            personal: profileData.personalFootprint,
            commercial: profileData.commercialFootprint,
            location: `${profileData.userState}, ${profileData.country}`,
          },
          wildcard: {
            wildcardInfo: profileData.wildcardInfo,
            coreMotivation: profileData.coreMotivation,
          },
          /**
           * @description
           * For ghost users (Google OAuth), we DON'T reset to 70 because
           * their discotiveScore doc already exists. merge: true means only
           * missing fields get set. The 70pt onboarding bonus comes from
           * awardOnboardingComplete() called above.
           * For fresh email/password users, these defaults set the baseline.
           */
          discotiveScore: {
            current: 0,
            last24h: 0,
            lastLoginDate: new Date().toISOString().split("T")[0],
            streak: 1,
            lastAmount: 0,
            lastReason: "OS Booted",
            lastUpdatedAt: new Date().toISOString(),
          },
          score_history: [
            {
              date: new Date().toISOString().split("T")[0],
              score: 0,
            },
          ],
          consistency_log: [new Date().toISOString().split("T")[0]],
          login_history: [new Date().toISOString().split("T")[0]],
          createdAt: new Date().toISOString(),
        };

        /**
         * @description
         * merge: true ensures we UPGRADE the ghost doc rather than
         * overwrite it, preserving login_history and ghost-phase score fields.
         * awardOnboardingComplete is idempotent — it checks the flag before writing.
         */
        await setDoc(doc(db, "users", uid), systemPayload, { merge: true });
        await awardOnboardingComplete(uid);

        setSystemStatus((prev) => ({
          ...prev,
          isBooting: false,
          showSetupSequence: true,
        }));
      } catch (err) {
        console.error("[BOOT_SEQUENCE_FAILED]", err);
        setSystemStatus((prev) => ({
          ...prev,
          isBooting: false,
          error: err.message.replace("Firebase: ", ""),
        }));
      }
    },
    [profileData],
  );

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      if (!profileData.email || !profileData.password)
        return setSystemStatus((prev) => ({
          ...prev,
          error: "Credentials missing.",
          success: "",
        }));

      setSystemStatus((prev) => ({
        ...prev,
        loading: true,
        error: "",
        success: "",
      }));
      try {
        await signInWithEmailAndPassword(
          auth,
          profileData.email,
          profileData.password,
        );
        navigate("/app", { replace: true });
      } catch (err) {
        setSystemStatus((prev) => ({
          ...prev,
          loading: false,
          error:
            "Authentication failed. Invalid credentials or protocol locked.",
        }));
      }
    },
    [profileData.email, profileData.password, navigate],
  );

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const inputClass =
    "w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-[box-shadow,transform,background,opacity,filter] placeholder-[#555]";
  const labelClass =
    "block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2 px-1";

  const footprintFields = useMemo(
    () => [
      { key: "website", icon: Globe, label: "Website" },
      {
        key: "linkedin",
        icon: Linkedin,
        label: "LinkedIn",
        isCommLabel: "LinkedIn (Company)",
        commKey: "linkedinCompany",
      },
      { key: "github", icon: Github, label: "GitHub" },
      { key: "twitter", icon: Twitter, label: "X / Twitter" },
      { key: "instagram", icon: Instagram, label: "Instagram" },
      { key: "youtube", icon: Youtube, label: "YouTube" },
      { key: "figma", icon: LinkIcon, label: "Figma" },
      { key: "reddit", icon: Globe, label: "Reddit" },
      { key: "pinterest", icon: Globe, label: "Pinterest" },
      { key: "linktree", icon: LinkIcon, label: "Linktree" },
    ],
    [],
  );

  const renderFootprintNode = useCallback(
    (fieldDef, isCommercial) => {
      const activeKey =
        isCommercial && fieldDef.commKey ? fieldDef.commKey : fieldDef.key;
      const activeLabel =
        isCommercial && fieldDef.isCommLabel
          ? fieldDef.isCommLabel
          : fieldDef.label;
      const Icon = fieldDef.icon;
      const parentNode = isCommercial
        ? "commercialFootprint"
        : "personalFootprint";

      return (
        <div key={activeKey} className="relative">
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input
            type="url"
            value={profileData[parentNode][activeKey] || ""}
            onChange={(e) =>
              setNestedField(parentNode, activeKey, e.target.value)
            }
            className={`${inputClass} pl-11 text-xs`}
            placeholder={activeLabel}
          />
        </div>
      );
    },
    [profileData, setNestedField, inputClass],
  );

  if (systemStatus.isBooting)
    return <AuthLoader taskComplete={systemStatus.authTaskComplete} />;

  // --- EMAILJS: LOCKED PROTOCOL REQUEST ENGINE ---
  const handleAccessRequest = async (e) => {
    e.preventDefault();

    // Strict 10-digit validation barrier
    if (profileData.mobileNumber.length !== 10) {
      addToast(
        "Transmission failed: Invalid mobile coordinate. Must be 10 digits.",
        "red",
      );
      return;
    }

    // Grab the data directly from your state machine. No DOM scraping required.
    const userName =
      `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
      "Unknown Operator";
    const userEmail = profileData.email || "Unknown Email";
    const userContact = profileData.contact || "No Contact Provided";
    const userMessage =
      profileData.requestMessage || "No transmission attached.";

    try {
      // 1. Fire the payload to EmailJS (KEYS MUST MATCH THE HTML TEMPLATE EXACTLY)
      await emailjs.send(
        "discotive", // Your Service ID
        "requestaccess", // Your Template ID
        {
          name: userName, // Maps to {{name}}
          email: userEmail, // Maps to {{email}}
          contact: userContact, // Maps to {{contact}}
          message: userMessage, // Maps to {{message}}
        },
        "tNizhqFNon4v2m6OC", // Your Public Key
      );

      // 2. Advance the UI state
      setStep("requested");
      addToast("Access request transmitted securely.", "green");
    } catch (error) {
      console.error("EmailJS Transmission Failed:", error);
      addToast("Transmission failed. Check network.", "red");
    }
  };

  // ============================================================================
  // OS INTERFACE RENDER (Hemispheric Layout)
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row font-sans selection:bg-white selection:text-black">
      {/* --- LEFT HEMISPHERE: BRAND & MOTIVATION --- */}
      <div className="hidden md:flex md:w-5/12 p-12 flex-col justify-between relative overflow-hidden bg-black border-r border-white/5">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentSlide}
            src={slides[currentSlide].image}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.4, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            alt="Atmospheric Background"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-0 pointer-events-none" />

        <div className="relative z-10">
          <Link
            to="/"
            className="flex items-center gap-3 mb-16 hover:opacity-80 transition-opacity w-fit focus-visible:outline-none focus-visible:ring-2 ring-white/50 rounded-lg"
          >
            <img
              src="/logox.png"
              alt="Discotive Logo"
              className="h-10 w-auto object-contain"
            />
            <span className="text-2xl font-extrabold tracking-tighter drop-shadow-lg">
              DISCOTIVE
            </span>
          </Link>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[0.9] mb-6">
            Build your <br /> monopoly.
          </h1>
          <p className="text-lg text-[#ccc] font-medium max-w-sm leading-relaxed">
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
              className="max-w-md"
            >
              <p className="text-2xl font-bold tracking-tight text-white mb-4 leading-tight">
                "{slides[currentSlide].quote}"
              </p>
              <p className="text-sm text-[#888] font-bold uppercase tracking-widest">
                — {slides[currentSlide].author}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* --- RIGHT HEMISPHERE: STATE MACHINE ENGINE --- */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
        <div className="w-full max-w-lg py-10">
          <AnimatePresence mode="wait">
            {/* ==================== LOGIN PROTOCOL ==================== */}
            {isLogin && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
                  Welcome back.
                </h2>
                <p className="text-[#888] font-medium mb-8">
                  Access your Command Center.
                </p>

                {systemStatus.error && (
                  <div
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />{" "}
                    {systemStatus.error}
                  </div>
                )}
                {systemStatus.success && (
                  <div
                    className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 text-sm font-bold mb-6"
                    role="alert"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />{" "}
                    {systemStatus.success}
                  </div>
                )}

                <div className="space-y-3">
                  <OAuthButton
                    provider="google"
                    icon={GoogleIcon}
                    label="Google"
                    onClick={handleSocialAuth}
                    disabled={systemStatus.loading}
                  />
                  <div className="flex gap-3">
                    <OAuthButton
                      provider="facebook"
                      icon={FacebookIcon}
                      label="Facebook"
                      onClick={handleSocialAuth}
                      disabled={systemStatus.loading}
                    />
                    <OAuthButton
                      provider="apple"
                      icon={AppleIcon}
                      label="Apple"
                      onClick={handleSocialAuth}
                      disabled={systemStatus.loading}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 my-6 opacity-60">
                  <div className="h-px bg-[#222] flex-1"></div>
                  <span className="text-xs text-[#555] font-bold uppercase tracking-widest">
                    OR
                  </span>
                  <div className="h-px bg-[#222] flex-1"></div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  <div>
                    <label className={labelClass} htmlFor="login-email">
                      Email Address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setField("email", e.target.value)}
                      className={inputClass}
                      autoComplete="username"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <label
                        className="text-[10px] font-bold text-[#888] uppercase tracking-[0.2em]"
                        htmlFor="login-password"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[10px] font-bold text-[#888] hover:text-white transition-colors focus:outline-none"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={profileData.password}
                        onChange={(e) => setField("password", e.target.value)}
                        className={inputClass}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors focus:outline-none"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={systemStatus.loading}
                    className="w-full mt-6 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-center gap-2"
                  >
                    {systemStatus.loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Boot OS"
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm font-medium text-[#888]">
                  New here?{" "}
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setStep(1);
                      setSystemStatus((prev) => ({
                        ...prev,
                        error: "",
                        success: "",
                      }));
                    }}
                    className="text-white hover:underline transition-[box-shadow,transform,background,opacity,filter] font-bold focus:outline-none"
                  >
                    Create your universe
                  </button>
                </p>
              </motion.div>
            )}

            {/* ==================== STEP 1: IDENTITY ==================== */}
            {!isLogin && step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
                  <span className="text-white">Step 1</span>{" "}
                  <span className="opacity-30">/ 8</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
                  Initialize Profile.
                </h2>
                <p className="text-[#888] font-medium mb-8">
                  Your baseline identity.
                </p>

                {systemStatus.error && (
                  <div
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />{" "}
                    {systemStatus.error}
                  </div>
                )}

                <div className="space-y-3">
                  <OAuthButton
                    provider="google"
                    icon={GoogleIcon}
                    label="Google"
                    onClick={handleSocialAuth}
                    disabled={systemStatus.loading}
                  />
                  <div className="flex gap-3">
                    <OAuthButton
                      provider="facebook"
                      icon={FacebookIcon}
                      label="Facebook"
                      onClick={handleSocialAuth}
                      disabled={systemStatus.loading}
                    />
                    <OAuthButton
                      provider="apple"
                      icon={AppleIcon}
                      label="Apple"
                      onClick={handleSocialAuth}
                      disabled={systemStatus.loading}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 my-6 opacity-60">
                  <div className="h-px bg-[#222] flex-1"></div>
                  <span className="text-xs text-[#555] font-bold uppercase tracking-widest">
                    OR
                  </span>
                  <div className="h-px bg-[#222] flex-1"></div>
                </div>

                <form
                  onSubmit={handleSignUpStep1}
                  className="space-y-5"
                  noValidate
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>First Name</label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setField("firstName", e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Last Name</label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setField("lastName", e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setField("email", e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Secure Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={profileData.password}
                        onChange={(e) => setField("password", e.target.value)}
                        className={inputClass}
                        required
                        minLength="8"
                        placeholder="Min 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors focus:outline-none"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div
                      className="flex items-center gap-1 mt-3 px-1"
                      aria-hidden="true"
                    >
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${pwScore >= level ? (pwScore > 2 ? "bg-green-500" : pwScore === 2 ? "bg-amber-500" : "bg-red-500") : "bg-[#333]"}`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={systemStatus.loading}
                    className="w-full mt-8 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group disabled:opacity-50"
                  >
                    {systemStatus.loading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-black mx-auto" />
                    ) : (
                      <>
                        <span>Verify Credentials</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm font-medium text-[#888]">
                  Already verified?{" "}
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setSystemStatus((prev) => ({
                        ...prev,
                        error: "",
                        success: "",
                      }));
                    }}
                    className="text-white hover:underline transition-[box-shadow,transform,background,opacity,filter] font-bold focus:outline-none"
                  >
                    Log in here
                  </button>
                </p>
              </motion.div>
            )}

            {/* ==================== STEP 2: COORDINATES ==================== */}
            {!isLogin && step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
                  <span className="text-white">Step 2</span>{" "}
                  <span className="opacity-30">/ 8</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
                  System Coordinates.
                </h2>
                <p className="text-[#888] font-medium mb-8">
                  Where do you operate from?
                </p>
                {systemStatus.error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold mb-6">
                    {systemStatus.error}
                  </div>
                )}
                <form onSubmit={handleStep2Submit} className="space-y-5">
                  <div>
                    <label className={labelClass}>Operator Handle</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] font-bold">
                        @
                      </span>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) =>
                          setField(
                            "username",
                            e.target.value
                              .replace(/[^a-zA-Z0-9_]/g, "")
                              .toLowerCase(),
                          )
                        }
                        className={`${inputClass} pl-10`}
                        required
                        placeholder="johndoe"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {usernameAvailable === true && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        {usernameAvailable === false && (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                        {usernameAvailable === null &&
                          debouncedUsername.length > 2 && (
                            <Loader2 className="w-4 h-4 text-[#666] animate-spin" />
                          )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Avatar Identity (For Leaderboard)
                    </label>
                    <select
                      value={profileData.gender}
                      onChange={(e) => setField("gender", e.target.value)}
                      className={inputClass}
                      required
                    >
                      <option value="" disabled>
                        Select identity...
                      </option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other / Stealth</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>State / Province</label>
                      <CustomSearchSelect
                        options={INDIAN_STATES_UTS}
                        value={profileData.userState}
                        onChange={(v) => setField("userState", v)}
                        placeholder="e.g. Rajasthan"
                        allowCustom={true}
                        required={true}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Country</label>
                      <CustomSearchSelect
                        options={COUNTRIES}
                        value={profileData.country}
                        onChange={(v) => setField("country", v)}
                        placeholder="e.g. India"
                        allowCustom={false}
                        required={true}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8">
                    {!auth.currentUser && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors focus:outline-none"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ==================== LOCKED PROTOCOL / WAITLIST ==================== */}
            {!isLogin && step === "locked" && (
              <motion.div
                key="locked"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">
                      Protocol Locked.
                    </h2>
                    <p className="text-xs text-[#888] font-bold uppercase tracking-widest">
                      Closed Beta Architecture
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[#ccc] leading-relaxed mb-6">
                  Discotive is currently under invite-only testing phase. Your
                  coordinate{" "}
                  <strong className="text-white">({profileData.email})</strong>{" "}
                  is not verified on the chain.
                </p>
                <form
                  onSubmit={handleAccessRequest}
                  className="flex flex-col gap-4 mt-6"
                >
                  <div>
                    <label className={labelClass}>Contact Number</label>
                    <div className="flex gap-3">
                      {/* Searchable Country Code Dropdown */}
                      <div className="w-[140px] shrink-0">
                        <CustomSearchSelect
                          options={COUNTRY_CODES}
                          value={profileData.countryCode}
                          onChange={(v) => setField("countryCode", v)}
                          placeholder="+91"
                          allowCustom={false}
                          required={true}
                        />
                      </div>

                      {/* Strict Mobile Input */}
                      <div className="flex-1">
                        <input
                          type="tel"
                          required
                          value={profileData.mobileNumber}
                          onChange={(e) => {
                            // Strip all non-digits, slice to 10 max
                            let val = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10);
                            // Drop leading zero instantly
                            if (val.startsWith("0")) val = val.slice(1);

                            setField("mobileNumber", val);
                          }}
                          className={inputClass}
                          placeholder="98765 43210"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Transmission (Optional)
                    </label>
                    <textarea
                      value={profileData.requestMessage}
                      onChange={(e) =>
                        setField("requestMessage", e.target.value)
                      }
                      rows="3"
                      className={`${inputClass} resize-y max-h-40 custom-scrollbar`}
                      placeholder="Why should you be granted access?"
                    />
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-amber-500 text-black font-extrabold rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                    >
                      Request Clearance <Lock className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ==================== REQUEST LOGGED ==================== */}
            {!isLogin && step === "requested" && (
              <motion.div
                key="requested"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center py-10"
              >
                <div className="flex justify-center mb-6">
                  <CheckCircle2 className="w-20 h-20 text-green-500" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                  Transmission Logged.
                </h2>
                <p className="text-[#888] font-medium leading-relaxed max-w-sm mx-auto">
                  Your coordinates have been sent to the Discotive routing
                  engine. You will be notified via email or phone if clearance
                  is granted.
                </p>
                <div className="pt-8">
                  <Link
                    to="/"
                    className="text-sm font-bold text-white hover:text-[#888] uppercase tracking-widest transition-colors border-b border-white pb-1 focus:outline-none"
                  >
                    Return to Surface
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ==================== STEP 3: BASELINE ==================== */}
            {!isLogin && step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
                  <span className="text-white">Step 3</span>{" "}
                  <span className="opacity-30">/ 8</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
                  The Baseline.
                </h2>
                <p className="text-[#888] font-medium mb-8">
                  Where are you starting from?
                </p>
                {systemStatus.error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold mb-6">
                    {systemStatus.error}
                  </div>
                )}
                <form onSubmit={handleStep3Submit} className="space-y-5">
                  <div>
                    <label className={labelClass}>Current Status</label>
                    <CustomSearchSelect
                      options={CURRENT_STATUSES}
                      value={profileData.currentStatus}
                      onChange={(v) => setField("currentStatus", v)}
                      placeholder="Select execution state..."
                      allowCustom={false}
                      required={true}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Institution / Organization (Optional)
                    </label>
                    <CustomSearchSelect
                      options={INSTITUTIONS}
                      value={profileData.institution}
                      onChange={(v) => setField("institution", v)}
                      placeholder="Search campus or entity..."
                      allowCustom={true}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>
                        Course / Degree (Optional)
                      </label>
                      <CustomSearchSelect
                        options={COURSES}
                        value={profileData.course}
                        onChange={(v) => setField("course", v)}
                        placeholder="Search degree..."
                        allowCustom={true}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Specialization (Optional)
                      </label>
                      <CustomSearchSelect
                        options={SPECIALIZATIONS}
                        value={profileData.specialization}
                        onChange={(v) => setField("specialization", v)}
                        placeholder="Core focus..."
                        allowCustom={true}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#222]">
                    <label className={labelClass}>Timeline / Cohort</label>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-[9px] text-[#666] mb-1 pl-1 font-bold uppercase">
                          Start Month
                        </p>
                        <CustomSearchSelect
                          options={MONTHS}
                          value={profileData.startMonth}
                          onChange={(v) => setField("startMonth", v)}
                          placeholder="Month"
                          allowCustom={false}
                        />
                      </div>
                      <div>
                        <p className="text-[9px] text-[#666] mb-1 pl-1 font-bold uppercase">
                          Start Year
                        </p>
                        <CustomSearchSelect
                          options={START_YEARS}
                          value={profileData.startYear}
                          onChange={(v) => setField("startYear", v)}
                          placeholder="Year"
                          allowCustom={false}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] text-[#666] mb-1 pl-1 font-bold uppercase">
                          End / Grad Month
                        </p>
                        <CustomSearchSelect
                          options={MONTHS}
                          value={profileData.endMonth}
                          onChange={(v) => setField("endMonth", v)}
                          placeholder="Month"
                          allowCustom={false}
                        />
                      </div>
                      <div>
                        <p className="text-[9px] text-[#666] mb-1 pl-1 font-bold uppercase">
                          End / Grad Year
                        </p>
                        <CustomSearchSelect
                          options={END_YEARS}
                          value={profileData.endYear}
                          onChange={(v) => setField("endYear", v)}
                          placeholder="Year"
                          allowCustom={false}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors focus:outline-none"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ==================== STEP 4: VISION ==================== */}
            {!isLogin && step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
                  <span className="text-white">Step 4</span>{" "}
                  <span className="opacity-30">/ 8</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
                  The Vision.
                </h2>
                <p className="text-[#888] font-medium mb-8">
                  What is your ultimate coordinate?
                </p>
                {systemStatus.error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold mb-6">
                    {systemStatus.error}
                  </div>
                )}
                <form onSubmit={handleStep4Submit} className="space-y-5">
                  <div>
                    <label className={labelClass}>
                      Macro Domain (Primary Identity)
                    </label>
                    <CustomSearchSelect
                      options={MACRO_DOMAINS}
                      value={profileData.passion}
                      onChange={(v) => setField("passion", v)}
                      placeholder="Search domains..."
                      allowCustom={true}
                      required={true}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Micro Niche (Optional)</label>
                    <CustomSearchSelect
                      options={MICRO_NICHES}
                      value={profileData.niche}
                      onChange={(v) => setField("niche", v)}
                      placeholder="e.g. AI Engineer, Director, CEO..."
                      allowCustom={true}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Parallel Goal (Optional)
                    </label>
                    <CustomSearchSelect
                      options={MACRO_DOMAINS}
                      value={profileData.parallelPath}
                      onChange={(v) => setField("parallelPath", v)}
                      placeholder="e.g. Building a Startup alongside degree"
                      allowCustom={true}
                    />
                  </div>
                  <div className="pt-4 border-t border-[#222] space-y-5">
                    <div>
                      <label className={labelClass}>
                        3-Month Execution Target
                      </label>
                      <textarea
                        value={profileData.goal3Months}
                        onChange={(e) =>
                          setField("goal3Months", e.target.value)
                        }
                        className={`${inputClass} resize-y max-h-48 min-h-[80px] custom-scrollbar`}
                        placeholder="What is the immediate milestone?"
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Macro Endgame (Long-Term)
                      </label>
                      <textarea
                        value={profileData.longTermGoal}
                        onChange={(e) =>
                          setField("longTermGoal", e.target.value)
                        }
                        className={`${inputClass} resize-y max-h-48 min-h-[80px] custom-scrollbar`}
                        placeholder="What does the monopoly look like?"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors focus:outline-none"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ==================== STEP 5: ARSENAL ==================== */}
            {!isLogin && step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
                  <span className="text-white">Step 5</span>{" "}
                  <span className="opacity-30">/ 8</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
                  The Arsenal.
                </h2>
                <p className="text-[#888] font-medium mb-8">
                  What utilities and protocols do you possess?
                </p>
                {systemStatus.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl mb-6">
                    {systemStatus.error}
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (profileData.languages.length === 0)
                      return setSystemStatus((prev) => ({
                        ...prev,
                        error:
                          "Protocol constraint: Select at least one base language.",
                      }));
                    setSystemStatus((prev) => ({ ...prev, error: "" }));
                    setStep(6);
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label className={labelClass}>
                      Raw Inventory (Capabilities)
                    </label>
                    <CustomMultiSelect
                      options={RAW_SKILLS}
                      selected={profileData.rawSkills}
                      onChange={(v) => setField("rawSkills", v)}
                      placeholder="Search and add skills..."
                      allowCustom={true}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Alignment Filter (Core Focus)
                    </label>
                    <CustomMultiSelect
                      options={profileData.rawSkills}
                      selected={profileData.alignedSkills}
                      onChange={(v) => setField("alignedSkills", v)}
                      placeholder={
                        profileData.rawSkills.length === 0
                          ? "Select raw skills first"
                          : "Which matter most?"
                      }
                      allowCustom={false}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Linguistic Protocols (Required)
                    </label>
                    <CustomMultiSelect
                      options={LANGUAGES}
                      selected={profileData.languages}
                      onChange={(v) => setField("languages", v)}
                      placeholder="Select languages..."
                      allowCustom={true}
                    />
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors focus:outline-none"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ==================== STEP 6: RESOURCES ==================== */}
            {!isLogin && step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
                  <span className="text-white">Step 6</span>{" "}
                  <span className="opacity-30">/ 8</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
                  Resource Map.
                </h2>
                <p className="text-[#888] font-medium mb-8">
                  Tailoring your realistic scholarship & tool paths.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSystemStatus((prev) => ({ ...prev, error: "" }));
                    setStep(7);
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label className={labelClass}>
                      Primary Guardian's Profession (Optional)
                    </label>
                    <CustomSearchSelect
                      options={MACRO_DOMAINS}
                      value={profileData.guardianProfession}
                      onChange={(v) => setField("guardianProfession", v)}
                      placeholder="Search profession..."
                      allowCustom={true}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Household Income Bracket (Optional)
                    </label>
                    <select
                      value={profileData.incomeBracket}
                      onChange={(e) =>
                        setField("incomeBracket", e.target.value)
                      }
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
                      Financial Launchpad (Required)
                    </label>
                    <select
                      value={profileData.financialLaunchpad}
                      onChange={(e) =>
                        setField("financialLaunchpad", e.target.value)
                      }
                      className={inputClass}
                      required
                    >
                      <option value="" disabled>
                        Select backing level...
                      </option>
                      <option value="Bootstrapping">
                        Bootstrapping / Self-funded
                      </option>
                      <option value="Limited Support">Limited Support</option>
                      <option value="Highly Backed">Highly Backed</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Career Investment Capacity (Required)
                    </label>
                    <select
                      value={profileData.investmentCapacity}
                      onChange={(e) =>
                        setField("investmentCapacity", e.target.value)
                      }
                      className={inputClass}
                      required
                    >
                      <option value="" disabled>
                        Select capacity...
                      </option>
                      <option value="Minimal">Minimal (Free tools only)</option>
                      <option value="Moderate">
                        Moderate (Basic courses/tools)
                      </option>
                      <option value="High">High (Premium gear/setups)</option>
                    </select>
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(5)}
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors focus:outline-none"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ==================== STEP 7: FOOTPRINT ==================== */}
            {!isLogin && step === 7 && (
              <motion.div
                key="step7"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
                  <span className="text-white">Step 7</span>{" "}
                  <span className="opacity-30">/ 8</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
                  Digital Footprint.
                </h2>
                <p className="text-[#888] font-medium mb-8">
                  Connect your external ledger. (All optional)
                </p>
                {systemStatus.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl mb-6">
                    {systemStatus.error}
                  </div>
                )}
                <form onSubmit={handleStep7Submit} className="space-y-8">
                  <div>
                    <h3 className="text-xs font-bold text-[#ccc] border-b border-[#222] pb-2 uppercase tracking-widest mb-4">
                      Personal Footprint
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {footprintFields.map((field) =>
                        renderFootprintNode(field, false),
                      )}
                    </div>
                  </div>
                  <div className="pt-4">
                    <h3 className="text-xs font-bold text-[#ccc] border-b border-[#222] pb-2 uppercase tracking-widest mb-4">
                      Professional / Commercial
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {footprintFields.map((field) =>
                        renderFootprintNode(field, true),
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(6)}
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors focus:outline-none"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group"
                    >
                      <span>Secure Footprint</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ==================== STEP 8: FINAL CANVAS ==================== */}
            {!isLogin && step === 8 && (
              <motion.div
                key="step8"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
                  <span className="text-white">Final Step</span>{" "}
                  <span className="opacity-30">/ 8</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
                  The Open Canvas.
                </h2>
                <p className="text-[#888] font-medium mb-8">
                  Give the engine its final context.
                </p>
                {systemStatus.error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6">
                    <AlertCircle className="w-4 h-4 shrink-0" />{" "}
                    {systemStatus.error}
                  </div>
                )}
                <form onSubmit={handleFinalSubmit} className="space-y-5">
                  <div>
                    <label className={labelClass}>
                      Core Motivation (Required)
                    </label>
                    <textarea
                      value={profileData.coreMotivation}
                      onChange={(e) =>
                        setField("coreMotivation", e.target.value)
                      }
                      className={`${inputClass} resize-y max-h-48 min-h-[100px] custom-scrollbar`}
                      placeholder="Why are you building this? What drives you?"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Wildcard Variables (Optional)
                    </label>
                    <textarea
                      value={profileData.wildcardInfo}
                      onChange={(e) => setField("wildcardInfo", e.target.value)}
                      className={`${inputClass} resize-y max-h-48 min-h-[100px] custom-scrollbar`}
                      placeholder="Unique constraints, mentors admired, or facts we should know."
                    />
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(7)}
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors focus:outline-none"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={systemStatus.isBooting}
                      className="flex-1 px-6 py-4 bg-white text-black font-extrabold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50"
                    >
                      {systemStatus.isBooting ? (
                        <Loader2 className="w-5 h-5 animate-spin text-black" />
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

      {/* --- POST-AUTH BOOT SEQUENCE MOUNT --- */}
      {systemStatus.showSetupSequence && (
        <SetupSequence onComplete={() => navigate("/app", { replace: true })} />
      )}
    </div>
  );
};

// ============================================================================
// OS INITIALIZATION SEQUENCE (Post-Signup Animation) - BUG FIXED
// ============================================================================

/**
 * @component SetupSequence
 * @description Fixed CSS-driven boot animation sequence. Removed unstable `cn` dependencies
 * and replaced them with robust template literals to prevent blank-screen crashes.
 */
const SetupSequence = React.memo(({ onComplete }) => {
  const [taskIndex, setTaskIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState("tasks"); // 'tasks', 'bonus', 'done'

  // --- TOAST STATE DEFINITION ---
  const [toasts, setToasts] = useState([]); // <-- This is what was missing!

  const addToast = useCallback((msg, type = "grey") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, msg, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const tasks = useMemo(
    () => [
      "Initializing command center",
      "Deploying execution timeline",
      "Calibrating leaderboard",
      "Securing asset vault",
      "Establishing network hub",
      "Building operator profile",
    ],
    [],
  );

  const animateScore = useCallback((start, end, durationStr = 30) => {
    let current = start;
    const interval = setInterval(() => {
      current += 1;
      setScore(current);
      if (current >= end) clearInterval(interval);
    }, durationStr);
  }, []);

  useEffect(() => {
    if (phase !== "tasks") return;

    if (taskIndex < tasks.length) {
      const timer = setTimeout(
        () => {
          if (taskIndex === 0) animateScore(0, 20, 40);
          setTaskIndex((prev) => prev + 1);
        },
        taskIndex === 0 ? 2000 : 1200,
      );
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setPhase("bonus"), 500);
      return () => clearTimeout(timer);
    }
  }, [taskIndex, phase, tasks.length, animateScore]);

  useEffect(() => {
    if (phase === "bonus") {
      const timer1 = setTimeout(() => {
        animateScore(20, 70, 30);
        const timer2 = setTimeout(() => {
          setPhase("done");
        }, 2500);
        return () => clearTimeout(timer2);
      }, 1500);
      return () => clearTimeout(timer1);
    }
  }, [phase, animateScore]);

  useEffect(() => {
    if (phase === "done") onComplete();
  }, [phase, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-[#030303] flex flex-col items-center justify-center p-8 text-white selection:bg-white selection:text-black"
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-12 left-1/2 -translate-x-1/2 text-center"
      >
        <h1 className="text-xl md:text-2xl font-extrabold tracking-[0.3em] uppercase text-[#888]">
          Welcome to Discotive
        </h1>
      </motion.div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
        <div className="space-y-6">
          {tasks.map((task, i) => {
            const isPending = i > taskIndex;
            const isActive = i === taskIndex && phase === "tasks";
            const isDone = i < taskIndex || phase !== "tasks";

            if (isPending) return null;

            return (
              <motion.div
                key={task}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-4 text-sm md:text-base font-bold tracking-wide ${isDone ? "text-[#888]" : "text-white"}`}
              >
                <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                  {isActive ? (
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <span>{task}...</span>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col items-center md:items-end justify-center border-t md:border-t-0 md:border-l border-[#222] pt-12 md:pt-0 md:pl-12 h-64">
          <p className="text-[10px] md:text-xs font-bold text-[#666] uppercase tracking-[0.3em] mb-4">
            Baseline Score
          </p>
          <div className="relative flex items-center justify-center">
            <motion.span
              className={`text-8xl md:text-9xl font-black font-mono tracking-tighter transition-colors duration-500 ${phase === "bonus" ? "text-amber-500 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]" : "text-white"}`}
            >
              {score}
            </motion.span>
            <AnimatePresence>
              {phase === "bonus" && score === 20 && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.5 }}
                  animate={{ opacity: 1, y: -60, scale: 1 }}
                  exit={{ opacity: 0, y: -100 }}
                  className="absolute top-0 right-0 md:-right-12 text-3xl font-extrabold text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                >
                  +50
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {phase === "bonus" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-extrabold text-amber-500 uppercase tracking-widest">
                  Discotive Initialization Bonus
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── TOAST SYSTEM ── */}
      {createPortal(
        <div className="fixed bottom-5 left-4 right-4 md:left-6 md:right-auto z-[9999] flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -16, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: -16, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 260 }}
                className={`px-4 py-3 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center gap-3 border text-xs font-bold tracking-wide pointer-events-auto max-w-[320px] ${
                  t.type === "green"
                    ? "bg-[#041f10] border-emerald-500/25 text-emerald-400"
                    : t.type === "red"
                      ? "bg-[#1a0505] border-red-500/25 text-red-400"
                      : "bg-[#0d0d0d] border-[#1e1e1e] text-white"
                }`}
              >
                {t.type === "green" && (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                {t.type === "red" && (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                {t.type === "grey" && (
                  <Activity className="w-4 h-4 text-[#555] shrink-0" />
                )}
                <span className="truncate">{t.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </motion.div>
  );
});
SetupSequence.displayName = "SetupSequence";

export default Auth;
