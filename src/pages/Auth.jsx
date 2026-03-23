import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthLoader from "../components/AuthLoader";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
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
import { auth, db } from "../firebase";
import emailjs from "@emailjs/browser";
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
  Search,
  X,
  Check,
  Sparkles,
} from "lucide-react";

import { cn } from "../components/ui/BentoCard";

// --- EMAILJS CONFIG ---
const EMAILJS_SERVICE_ID = "discotive";
const EMAILJS_TEMPLATE_ID = "requestaccess";
const EMAILJS_PUBLIC_KEY = "tNizhqFNon4v2m6OC";

// ============================================================================
// MASSIVE TAXONOMY & DATA DICTIONARIES (MAANG-GRADE SCALE)
// ============================================================================

const COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Côte d'Ivoire",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Holy See",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine State",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States of America",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

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

// Broad Macro Categories
const MACRO_DOMAINS = [
  "Engineer",
  "Designer",
  "Filmmaker",
  "Artist",
  "Business/Operations",
  "Marketing",
  "Sales",
  "Writer / Author",
  "Scientist",
  "Medical Professional",
  "Educator / Academic",
  "Legal Professional",
  "Finance / Accounting",
  "Freelancer",
  "Content Creator",
  "Musician / Audio",
  "Architect",
  "Psychologist",
  "Consultant",
  "Data Professional",
  "Product Manager",
  "Venture Capitalist",
  "Investor",
  "Indie Hacker",
  "Game Developer",
  "Blockchain/Web3 Builder",
  "Cybersecurity Analyst",
  "Actor / Performer",
  "Athlete",
  "Journalist",
  "Public Relations",
  "Human Resources",
  "Supply Chain/Logistics",
  "Real Estate Professional",
  "Chef / Culinary",
  "Event Manager",
  "Non-Profit/NGO",
  "Government/Policy",
  "Researcher",
  "Translator",
  "Hardware/Electronics",
  "Robotics",
  "Aviation/Aerospace",
  "Urban Planner",
  "Agriculture/Farming",
  "Environmentalist",
  "Fitness Trainer",
  "Influencer",
  "Podcaster",
  "Photographer",
].sort();

// Specific Micro Categories
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
  "Smart Contract Engineer",
  "Game Developer",
  "Mobile App Developer",
  "Embedded Systems Engineer",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "3D Modeler",
  "Motion Graphics Artist",
  "Animator",
  "Illustrator",
  "VFX Artist",
  "Cinematographer",
  "Director",
  "Video Editor",
  "Cinematic Colorist",
  "Screenwriter",
  "Producer",
  "Sound Designer",
  "Music Producer",
  "Founder / CEO",
  "COO",
  "CTO",
  "Product Manager",
  "Project Manager",
  "Scrum Master",
  "B2B Sales",
  "B2C Sales",
  "Account Executive",
  "Growth Marketer",
  "Digital Marketer",
  "SEO/SEM Specialist",
  "Social Media Manager",
  "Copywriter",
  "Technical Writer",
  "Journalist",
  "Investment Banker",
  "Financial Analyst",
  "Quant Trader",
  "Venture Capitalist",
  "Private Equity",
  "Auditor",
  "Corporate Lawyer",
  "IP Lawyer",
  "Physician",
  "Surgeon",
  "Nurse",
  "Pharmacist",
  "Clinical Researcher",
  "Biotechnologist",
  "Chemist",
  "Physicist",
  "Professor",
  "Instructional Designer",
  "Freelance Developer",
  "Freelance Designer",
  "YouTuber",
  "Streamer",
  "Podcaster",
  "TikTok Creator",
  "Instagram Influencer",
  "Substack Writer",
  "Indie Hacker",
  "Robotics Engineer",
  "Aerospace Engineer",
  "Mechanical Engineer",
  "Civil Engineer",
  "Electrical Engineer",
  "Architectural Designer",
  "Interior Designer",
  "Event Planner",
  "Supply Chain Manager",
  "Logistics Coordinator",
  "HR Manager",
  "Talent Acquisition",
  "PR Manager",
  "Ethical Hacker",
  "Security Researcher",
  "Penetration Tester",
  "Data Privacy Officer",
  "AR/VR Developer",
  "Computer Vision Engineer",
  "QA Tester",
  "Automation Engineer",
  "System Administrator",
  "Database Administrator",
].sort();

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
  "NIT Manipur",
  "NIT Sikkim",
  "NIT Arunachal Pradesh",
  "NIT Nagaland",
  "NIT Andhra Pradesh",
  "NIT Shibpur",
  // Private / Specific
  "BITS Pilani (Pilani Campus)",
  "BITS Pilani (Goa Campus)",
  "BITS Pilani (Hyderabad Campus)",
  "BITS Pilani (Dubai Campus)",
  "JECRC Foundation",
  "JECRC University",
  "Poornima College of Engineering",
  "Poornima Institute of Engineering & Technology",
  "Poornima University",
  "Swami Keshavanand Institute of Technology (SKIT)",
  "Amity University (Noida)",
  "Amity University (Mumbai)",
  "Amity University (Jaipur)",
  "Amity University (Gurugram)",
  "Amity University (Lucknow)",
  "Amity University (Gwalior)",
  "Amity University (Raipur)",
  "Amity University (Kolkata)",
  "Amity University (Ranchi)",
  "Amity University (Patna)",
  "Amity University (Mohali)",
  "MIT (Massachusetts)",
  "MIT Manipal",
  "VIT Vellore",
  "SRM University",
  "Master's Union",
  "Scaler School of Technology",
  "Scaler School of Business",
  "Delhi University (DU)",
  "Delhi Technological University (DTU)",
  "NSUT",
  "IIIT Delhi",
  "Sri Chaitanya Techno School",
  "Allen Career Institute",
  // MAANG & Corporate
  "Google",
  "Apple",
  "Meta",
  "Amazon",
  "Netflix",
  "Microsoft",
  "Nvidia",
  "McKinsey & Company",
  "BCG",
  "Bain & Company",
  "Deloitte",
  "PwC",
  "EY",
  "KPMG",
  "TCS",
  "Wipro",
  "Infosys",
  "Accenture",
  "Cognizant",
  "Capgemini",
  "IBM",
  "Tech Mahindra",
  "HCL",
  "Goldman Sachs",
  "Morgan Stanley",
  "JPMorgan Chase",
].sort();

const COURSES = [
  "High School (Science)",
  "High School (Commerce)",
  "High School (Arts/Humanities)",
  "B.Tech",
  "B.E.",
  "B.Sc",
  "B.A.",
  "B.Com",
  "BBA",
  "BCA",
  "B.Arch",
  "B.Des",
  "B.Pharm",
  "MBBS",
  "BDS",
  "BPT",
  "LLB",
  "BA LLB",
  "B.Ed",
  "BHM",
  "M.Tech",
  "M.E.",
  "M.Sc",
  "M.A.",
  "M.Com",
  "MBA",
  "MCA",
  "M.Arch",
  "M.Des",
  "LLM",
  "MD",
  "MS",
  "Ph.D",
  "Diploma",
  "Certificate Course",
  "Bootcamp",
  "Self-Taught",
].sort();

const SPECIALIZATIONS = [
  "PCM (Physics, Chemistry, Math)",
  "PCB (Physics, Chemistry, Biology)",
  "PCMB",
  "Commerce with Math",
  "Commerce without Math",
  "Humanities",
  "Computer Science",
  "Mechanical",
  "Civil",
  "Electrical",
  "Electronics & Communication",
  "Information Technology",
  "AI/ML",
  "Data Science",
  "Cybersecurity",
  "Aerospace",
  "Chemical",
  "Biotechnology",
  "Robotics",
  "UI/UX Design",
  "Graphic Design",
  "Fashion Design",
  "Industrial Design",
  "Finance",
  "Marketing",
  "Human Resources",
  "Operations",
  "International Business",
  "Economics",
  "Psychology",
  "Sociology",
  "English Literature",
  "Political Science",
  "History",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Statistics",
  "Law (Corporate)",
  "Law (Criminal)",
  "Medicine",
  "Surgery",
  "Dentistry",
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
  "Dart",
  "PHP",
  "Laravel",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Firebase",
  "Supabase",
  "AWS",
  "Google Cloud (GCP)",
  "Microsoft Azure",
  "Docker",
  "Kubernetes",
  "CI/CD",
  "Git",
  "GitHub",
  "Linux",
  "Bash/Shell",
  "Machine Learning",
  "Deep Learning",
  "TensorFlow",
  "PyTorch",
  "NLP",
  "Computer Vision",
  "Data Analysis",
  "Pandas",
  "NumPy",
  "Tableau",
  "PowerBI",
  "Excel",
  "Blockchain",
  "Solidity",
  "Web3.js",
  "Figma",
  "Adobe XD",
  "Sketch",
  "Framer",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "Adobe Premiere Pro",
  "Adobe After Effects",
  "DaVinci Resolve",
  "Final Cut Pro",
  "Blender",
  "Maya",
  "Cinema 4D",
  "ZBrush",
  "Unity",
  "Unreal Engine",
  "Godot",
  "AutoCAD",
  "SolidWorks",
  "SEO",
  "SEM",
  "Google Analytics",
  "Facebook Ads",
  "Copywriting",
  "Content Strategy",
  "Email Marketing",
  "B2B Sales",
  "B2C Sales",
  "Cold Calling",
  "Lead Generation",
  "Negotiation",
  "Public Speaking",
  "Pitching",
  "Financial Modeling",
  "Accounting",
  "Financial Analysis",
  "Project Management",
  "Agile/Scrum",
  "Jira",
  "Notion",
  "Trello",
  "Leadership",
  "Team Building",
  "Problem Solving",
  "Critical Thinking",
  "Time Management",
  "Networking",
  "Event Management",
  "Research",
].sort();

const LANGUAGES = [
  "English",
  "Mandarin Chinese",
  "Hindi",
  "Spanish",
  "French",
  "Modern Standard Arabic",
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
  "Yue Chinese (Cantonese)",
  "Vietnamese",
  "Tagalog",
  "Wu Chinese",
  "Korean",
  "Persian",
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
// CUSTOM UI COMPONENTS
// ============================================================================

const CustomSearchSelect = ({
  options,
  value,
  onChange,
  placeholder,
  allowCustom,
  required,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // FIX: Default to "" to prevent the uncontrolled input error
  const [query, setQuery] = useState(value || "");

  // FIX: Sync query state if the parent value prop changes
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex items-center w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 focus-within:border-white/40 transition-all">
        <input
          type="text"
          value={query || ""} // FIX: Enforce string type
          required={required && !value}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (allowCustom) onChange(e.target.value);
          }}
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
                onClick={() => {
                  setQuery(opt);
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="px-4 py-3 text-sm hover:bg-[#222] cursor-pointer transition-colors text-[#ccc] hover:text-white truncate"
              >
                {opt}
              </div>
            ))}
            {filtered.length === 0 &&
              allowCustom &&
              query.trim().length > 0 && (
                <div
                  onClick={() => {
                    onChange(query);
                    setIsOpen(false);
                  }}
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
};

const CustomMultiSelect = ({
  options,
  selected,
  onChange,
  placeholder,
  allowCustom,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpt = (val) => {
    if (selected.includes(val)) onChange(selected.filter((i) => i !== val));
    else onChange([...selected, val]);
    setQuery("");
  };

  const filtered = options.filter(
    (o) =>
      o.toLowerCase().includes(query.toLowerCase()) && !selected.includes(o),
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className="min-h-[50px] w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 focus-within:border-white/40 transition-all flex flex-wrap gap-2 items-center cursor-text"
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
};

// --- REUSABLE GOOGLE AUTH BUTTON ---
const GoogleAuthButton = ({ onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#121212] border border-white/10 text-white font-bold rounded-xl hover:bg-[#222] hover:border-white/20 transition-all shadow-sm disabled:opacity-50"
  >
    {disabled ? (
      <Loader2 className="w-5 h-5 animate-spin text-[#888]" />
    ) : (
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
    )}
    {disabled ? "Authenticating..." : "Continue with Google"}
  </button>
);

// ============================================================================
// MAIN AUTH COMPONENT
// ============================================================================
const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [isBooting, setIsBooting] = useState(false);
  const [authTaskComplete, setAuthTaskComplete] = useState(false);

  const [showSetupSequence, setShowSetupSequence] = useState(false);

  const slides = [
    {
      image: "/stock/Wolf of Wall Street 1.jpg",
      quote:
        "The only thing standing between you and your goal is the bulls**t story...",
      author: "Jordan Belfort",
    },
    {
      image: "/stock/F1.jpg",
      quote: "We can't win if we don't try.",
      author: "Sonny Hayes",
    },
    {
      image: "/stock/The Social Network.jpg",
      quote: "They came to me with an idea, I had a better one.",
      author: "Mark Zuckerberg",
    },
  ];
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- SECURE RETURNING USER REDIRECT & AUTO-RESUME ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // 1. Check if they have a completed database profile
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          // Profile exists -> Send to OS
          navigate("/app");
        } else {
          // GHOST USER DETECTED: They authenticated but abandoned the form.
          // 2. Re-verify their whitelist status
          const wlSnap = await getDocs(
            query(
              collection(db, "whitelisted_emails"),
              where("email", "==", user.email),
            ),
          );

          setIsLogin(false); // Force out of login screen

          if (wlSnap.empty) {
            setStep("locked"); // Boot them if they aren't whitelisted
          } else {
            setStep(2); // Trap them on Step 2 to finish Coordinates
          }
        }
      }
    });
    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    const t = setInterval(
      () => setCurrentSlide((p) => (p + 1) % slides.length),
      6000,
    );
    return () => clearInterval(t);
  }, [slides.length]);

  // --- FORM STATES ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [gender, setGender] = useState("");

  const [userState, setUserState] = useState("");
  const [country, setCountry] = useState("");
  const [contact, setContact] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  const [currentStatus, setCurrentStatus] = useState("");
  const [institution, setInstitution] = useState("");
  const [course, setCourse] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [endYear, setEndYear] = useState("");

  const [passion, setPassion] = useState("");
  const [niche, setNiche] = useState("");
  const [parallelPath, setParallelPath] = useState("");
  const [goal3Months, setGoal3Months] = useState("");
  const [longTermGoal, setLongTermGoal] = useState("");

  const [rawSkills, setRawSkills] = useState([]);
  const [alignedSkills, setAlignedSkills] = useState([]);
  const [languages, setLanguages] = useState([]);

  const [guardianProfession, setGuardianProfession] = useState("");
  const [incomeBracket, setIncomeBracket] = useState("");
  const [financialLaunchpad, setFinancialLaunchpad] = useState("");
  const [investmentCapacity, setInvestmentCapacity] = useState("");

  const defaultFootprint = {
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
  };
  const [personalFootprint, setPersonalFootprint] = useState(defaultFootprint);
  const [commercialFootprint, setCommercialFootprint] = useState({
    ...defaultFootprint,
    linkedinCompany: "",
  });

  const [wildcardInfo, setWildcardInfo] = useState("");
  const [coreMotivation, setCoreMotivation] = useState("");

  // Password Strength Logic
  const getPasswordStrength = () => {
    let s = 0;
    if (password.length > 7) s += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s += 1;
    if (/\d/.test(password)) s += 1;
    if (/[^a-zA-Z0-9]/.test(password)) s += 1;
    return s;
  };
  const pwScore = getPasswordStrength();

  // Username Debounce
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    const checkUsername = async () => {
      const q = query(
        collection(db, "users"),
        where("identity.username", "==", username.toLowerCase()),
      );
      const snap = await getDocs(q);
      setUsernameAvailable(snap.empty);
    };
    const t = setTimeout(checkUsername, 500);
    return () => clearTimeout(t);
  }, [username]);

  const handleGoogleAuth = async () => {
    try {
      setLoading(true); // <--- Use setLoading instead of setIsBooting
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const nameParts = user.displayName
        ? user.displayName.split(" ")
        : ["Operator", ""];
      setFirstName(nameParts[0]);
      setLastName(nameParts.slice(1).join(" "));
      setEmail(user.email);
      setUsername(user.email.split("@")[0].toLowerCase());

      // 1. Check if user already exists in DB
      const userSnap = await getDocs(
        query(
          collection(db, "users"),
          where("identity.email", "==", user.email),
        ),
      );
      if (!userSnap.empty) {
        setLoading(false);
        navigate("/app");
        return;
      }

      // 2. Check Whitelist for new Google Users
      const wlSnap = await getDocs(
        query(
          collection(db, "whitelisted_emails"),
          where("email", "==", user.email),
        ),
      );

      setLoading(false);
      setIsLogin(false);

      if (wlSnap.empty) {
        setStep("locked");
      } else {
        setStep(2); // Bypass Step 1, go straight to Location/Handle
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      setError(error.message.replace("Firebase: ", ""));
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleSignUpStep1 = async (e) => {
    e.preventDefault();
    // FIX: Only validate Step 1 fields
    if (!email || !password || !firstName || !lastName) {
      return setError("All identity and security fields are required.");
    }
    if (pwScore < 2)
      return setError("Password too weak. Add numbers or symbols.");

    setLoading(true);
    setError("");
    try {
      const userSnap = await getDocs(
        query(collection(db, "users"), where("identity.email", "==", email)),
      );
      if (!userSnap.empty) {
        setError("Identity already exists. Proceed to Login.");
        setLoading(false);
        return;
      }

      const wlSnap = await getDocs(
        query(
          collection(db, "whitelisted_emails"),
          where("email", "==", email),
        ),
      );
      if (wlSnap.empty) setStep("locked");
      else setStep(2);
    } catch (err) {
      setError("System verification failed.");
    }
    setLoading(false);
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    // FIX: Validate Step 2 fields here
    if (!username || !userState || !country || !gender)
      return setError(
        "All handle, identity, and location fields are required.",
      );
    if (usernameAvailable === false)
      return setError("Username is already taken.");

    setError("");
    setStep(3);
  };

  const handleStep3Submit = (e) => {
    e.preventDefault();
    setError("");
    // FIX: Validate baseline dates here
    if (startMonth && !startYear)
      return setError("If Start Month is selected, Start Year is required.");
    if (endMonth && !endYear)
      return setError("If End Month is selected, End Year is required.");
    setStep(4);
  };

  const handleStep4Submit = (e) => {
    e.preventDefault();
    setError("");
    // FIX: Validate vision goals here
    if (passion === parallelPath && passion !== "")
      return setError(
        "Primary Macro Domain and Parallel Goal cannot be identical.",
      );
    setStep(5);
  };

  const handleStep7Submit = (e) => {
    e.preventDefault();
    setError("");
    let allLinks = [];

    const validate = (obj) => {
      for (const [key, val] of Object.entries(obj)) {
        if (val.trim() !== "") {
          const rule =
            FOOTPRINT_VALIDATORS[key] || FOOTPRINT_VALIDATORS["website"];
          if (!rule.regex.test(val)) {
            setError(
              `Invalid URL format for ${key}. Must start with ${rule.prefix}`,
            );
            return false;
          }
          allLinks.push(val.trim().toLowerCase());
        }
      }
      return true;
    };

    if (!validate(personalFootprint) || !validate(commercialFootprint)) return;
    if (new Set(allLinks).size !== allLinks.length)
      return setError(
        "Duplicate links detected. You cannot use the same URL across different fields.",
      );

    setStep(8);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setIsBooting(true);
    setError("");
    setAuthTaskComplete(false);

    try {
      let uid;
      // If auth.currentUser exists, they used Google. If not, they used Email/Password.
      if (auth.currentUser) {
        uid = auth.currentUser.uid;
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        uid = userCredential.user.uid;
      }

      await setDoc(doc(db, "users", uid), {
        identity: {
          firstName,
          lastName,
          email,
          username: username.toLowerCase(),
          gender,
        },
        location: {
          state: userState,
          country,
          displayLocation: `${userState}, ${country}`,
        },
        baseline: {
          currentStatus,
          institution,
          course,
          specialization,
          startMonth,
          startYear,
          endMonth,
          endYear,
        },
        vision: { passion, niche, parallelPath, goal3Months, longTermGoal },
        skills: { rawSkills, alignedSkills, languages },
        resources: {
          guardianProfession,
          incomeBracket,
          financialLaunchpad,
          investmentCapacity,
        },
        footprint: {
          personal: personalFootprint,
          commercial: commercialFootprint,
          location: `${userState}, ${country}`,
        },
        wildcard: { wildcardInfo, coreMotivation },
        discotiveScore: {
          current: 70,
          last24h: 0,
          lastLoginDate: new Date().toISOString().split("T")[0],
        },
        createdAt: new Date().toISOString(),
      });

      setIsBooting(false);
      setShowSetupSequence(true);
    } catch (err) {
      setIsBooting(false);
      setError(err.message.replace("Firebase: ", ""));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Enter credentials.");
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app");
    } catch (err) {
      setError("Invalid credentials or protocol locked.");
    } finally {
      setLoading(false);
    }
  };

  if (isBooting) return <AuthLoader taskComplete={authTaskComplete} />;

  const inputClass =
    "w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-all placeholder-[#555]";
  const labelClass =
    "block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2 px-1";

  // Footprint Render Helper
  const renderFootprintFields = (
    stateObj,
    setStateFunc,
    isCommercial = false,
  ) => {
    const fields = [
      { key: "website", icon: Globe, label: "Website" },
      {
        key: isCommercial ? "linkedinCompany" : "linkedin",
        icon: Linkedin,
        label: isCommercial ? "LinkedIn (Company)" : "LinkedIn",
      },
      { key: "github", icon: Github, label: "GitHub" },
      { key: "twitter", icon: Twitter, label: "X / Twitter" },
      { key: "instagram", icon: Instagram, label: "Instagram" },
      { key: "youtube", icon: Youtube, label: "YouTube" },
      { key: "figma", icon: LinkIcon, label: "Figma" },
      { key: "reddit", icon: Globe, label: "Reddit" },
      { key: "pinterest", icon: Globe, label: "Pinterest" },
      { key: "linktree", icon: LinkIcon, label: "Linktree" },
    ];

    return fields.map(({ key, icon: Icon, label }) => (
      <div key={key} className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
        <input
          type="url"
          value={stateObj[key] || ""}
          onChange={(e) =>
            setStateFunc((p) => ({ ...p, [key]: e.target.value }))
          }
          className={`${inputClass} pl-11 text-xs`}
          placeholder={label}
        />
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row font-sans selection:bg-white selection:text-black">
      {/* LEFT SIDE */}
      <div className="hidden md:flex md:w-5/12 p-12 flex-col justify-between relative overflow-hidden bg-black border-r border-white/5">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentSlide}
            src={slides[currentSlide].image}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.4, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-0" />
        <div className="relative z-10">
          <Link
            to="/"
            className="flex items-center gap-3 mb-16 hover:opacity-80 transition-opacity w-fit"
          >
            <img
              src="/logox.png"
              alt="Discotive"
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

      {/* RIGHT SIDE */}
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
              >
                <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
                  Welcome back.
                </h2>
                <p className="text-[#888] font-medium mb-8">
                  Access your Command Center.
                </p>
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                {/* --- GOOGLE LOGIN --- */}
                <GoogleAuthButton
                  onClick={handleGoogleAuth}
                  disabled={loading}
                />

                <div className="flex items-center gap-4 my-6">
                  <div className="h-px bg-[#222] flex-1"></div>
                  <span className="text-xs text-[#555] font-bold uppercase tracking-widest">
                    OR
                  </span>
                  <div className="h-px bg-[#222] flex-1"></div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={email || ""}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <input
                      type="password"
                      value={password || ""}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
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
                      setError("");
                    }}
                    className="text-white hover:underline transition-all font-bold"
                  >
                    Create your universe
                  </button>
                </p>
              </motion.div>
            )}

            {/* STEP 1: IDENTITY & SECURITY */}
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
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                {/* --- GOOGLE SIGNUP --- */}
                <GoogleAuthButton
                  onClick={handleGoogleAuth}
                  disabled={loading}
                />

                <div className="flex items-center gap-4 my-6"></div>

                <form onSubmit={handleSignUpStep1} className="space-y-5">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-px bg-[#222] flex-1"></div>
                    <span className="text-xs text-[#555] font-bold uppercase tracking-widest">
                      OR
                    </span>
                    <div className="h-px bg-[#222] flex-1"></div>
                  </div>
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
                      minLength="8"
                      placeholder="Min 8 characters"
                    />
                    <div className="flex items-center gap-1 mt-3 px-1">
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
                    disabled={loading}
                    className="w-full mt-8 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-black" />
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
                      setError("");
                    }}
                    className="text-white hover:underline transition-all font-bold"
                  >
                    Log in here
                  </button>
                </p>
              </motion.div>
            )}

            {/* STEP 2: HANDLE & LOCATION */}
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
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold mb-6">
                    {error}
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
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
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
                        {usernameAvailable === null && username.length > 2 && (
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
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
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
                        value={userState}
                        onChange={setUserState}
                        placeholder="e.g. Rajasthan"
                        allowCustom={true}
                        required={true}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Country</label>
                      <CustomSearchSelect
                        options={COUNTRIES}
                        value={country}
                        onChange={setCountry}
                        placeholder="e.g. India"
                        allowCustom={false}
                        required={true}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                    {/* Only show back button if they didn't use Google (Google users lack a password so they can't go back to step 1 safely) */}
                    {!auth.currentUser && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors"
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

            {/* LOCKED PROTOCOL / REQUEST ACCESS */}
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
                  Discotive is currently invite-only for the top 1% of builders.
                  Your coordinate{" "}
                  <strong className="text-white">({email})</strong> is not
                  verified on the chain.
                </p>
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold mb-4">
                    {error}
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    /* EmailJS logic if needed */ setStep("requested");
                  }}
                  className="space-y-4 pt-4 border-t border-[#222]"
                >
                  <div>
                    <label className={labelClass}>Contact Number</label>
                    <input
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className={inputClass}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Transmission (Optional)
                    </label>
                    <textarea
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
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

            {/* REQUESTED */}
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
                    className="text-sm font-bold text-white hover:text-[#888] uppercase tracking-widest transition-colors border-b border-white pb-1"
                  >
                    Return to Surface
                  </Link>
                </div>
              </motion.div>
            )}

            {/* STEP 3: BASELINE */}
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
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold mb-6">
                    {error}
                  </div>
                )}

                <form onSubmit={handleStep3Submit} className="space-y-5">
                  <div>
                    <label className={labelClass}>Current Status</label>
                    <CustomSearchSelect
                      options={CURRENT_STATUSES}
                      value={currentStatus}
                      onChange={setCurrentStatus}
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
                      value={institution}
                      onChange={setInstitution}
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
                        value={course}
                        onChange={setCourse}
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
                        value={specialization}
                        onChange={setSpecialization}
                        placeholder="Core focus..."
                        allowCustom={true}
                      />
                    </div>
                  </div>

                  {/* TIMELINE FIELDS */}
                  <div className="pt-4 border-t border-[#222]">
                    <label className={labelClass}>Timeline / Cohort</label>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-[9px] text-[#666] mb-1 pl-1">
                          Start Month
                        </p>
                        <CustomSearchSelect
                          options={MONTHS}
                          value={startMonth}
                          onChange={setStartMonth}
                          placeholder="Month"
                          allowCustom={false}
                        />
                      </div>
                      <div>
                        <p className="text-[9px] text-[#666] mb-1 pl-1">
                          Start Year
                        </p>
                        <CustomSearchSelect
                          options={START_YEARS}
                          value={startYear}
                          onChange={setStartYear}
                          placeholder="Year"
                          allowCustom={false}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] text-[#666] mb-1 pl-1">
                          End / Grad Month
                        </p>
                        <CustomSearchSelect
                          options={MONTHS}
                          value={endMonth}
                          onChange={setEndMonth}
                          placeholder="Month"
                          allowCustom={false}
                        />
                      </div>
                      <div>
                        <p className="text-[9px] text-[#666] mb-1 pl-1">
                          End / Grad Year
                        </p>
                        <CustomSearchSelect
                          options={END_YEARS}
                          value={endYear}
                          onChange={setEndYear}
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
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors"
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

            {/* STEP 4: VISION */}
            {!isLogin && step === 4 && (
              <motion.div
                key="step3"
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
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold mb-6">
                    {error}
                  </div>
                )}

                <form onSubmit={handleStep4Submit} className="space-y-5">
                  <div>
                    <label className={labelClass}>
                      Macro Domain (Primary Identity)
                    </label>
                    <CustomSearchSelect
                      options={MACRO_DOMAINS}
                      value={passion}
                      onChange={setPassion}
                      placeholder="Search roles..."
                      allowCustom={true}
                      required={true}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Micro Niche (Optional)</label>
                    <CustomSearchSelect
                      options={MICRO_NICHES}
                      value={niche}
                      onChange={setNiche}
                      placeholder="e.g. AI Engineer, UI Designer..."
                      allowCustom={true}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Parallel Goal (Optional)
                    </label>
                    <CustomSearchSelect
                      options={MACRO_DOMAINS}
                      value={parallelPath}
                      onChange={setParallelPath}
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
                        value={goal3Months}
                        onChange={(e) => setGoal3Months(e.target.value)}
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
                        value={longTermGoal}
                        onChange={(e) => setLongTermGoal(e.target.value)}
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
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors"
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

            {/* STEP 4: ARSENAL (SKILLS) */}
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
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl mb-6">
                    {error}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (languages.length === 0)
                      return setError("Select at least one language.");
                    setError("");
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
                      selected={rawSkills}
                      onChange={setRawSkills}
                      placeholder="Search and add skills..."
                      allowCustom={true}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Alignment Filter (Core Focus)
                    </label>
                    <CustomMultiSelect
                      options={rawSkills}
                      selected={alignedSkills}
                      onChange={setAlignedSkills}
                      placeholder={
                        rawSkills.length === 0
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
                      selected={languages}
                      onChange={setLanguages}
                      placeholder="Select languages..."
                      allowCustom={true}
                    />
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors"
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

            {/* STEP 6: RESOURCES */}
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
                    setError("");
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
                      value={guardianProfession}
                      onChange={setGuardianProfession}
                      placeholder="Search profession..."
                      allowCustom={true}
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
                      Financial Launchpad (Required)
                    </label>
                    <select
                      value={financialLaunchpad}
                      onChange={(e) => setFinancialLaunchpad(e.target.value)}
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
                      value={investmentCapacity}
                      onChange={(e) => setInvestmentCapacity(e.target.value)}
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
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors"
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

            {/* STEP 7: FOOTPRINT */}
            {!isLogin && step === 7 && (
              <motion.div
                key="step6"
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
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl mb-6">
                    {error}
                  </div>
                )}

                <form onSubmit={handleStep7Submit} className="space-y-8">
                  <div>
                    <h3 className="text-xs font-bold text-[#ccc] border-b border-[#222] pb-2 uppercase tracking-widest mb-4">
                      Personal Footprint
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {renderFootprintFields(
                        personalFootprint,
                        setPersonalFootprint,
                        false,
                      )}
                    </div>
                  </div>

                  <div className="pt-4">
                    <h3 className="text-xs font-bold text-[#ccc] border-b border-[#222] pb-2 uppercase tracking-widest mb-4">
                      Professional / Commercial
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {renderFootprintFields(
                        commercialFootprint,
                        setCommercialFootprint,
                        true,
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(6)}
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors"
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

            {/* STEP 8: CANVAS & BOOT */}
            {!isLogin && step === 8 && (
              <motion.div
                key="step7"
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
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <form onSubmit={handleFinalSubmit} className="space-y-5">
                  <div>
                    <label className={labelClass}>
                      Core Motivation (Required)
                    </label>
                    <textarea
                      value={coreMotivation}
                      onChange={(e) => setCoreMotivation(e.target.value)}
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
                      value={wildcardInfo}
                      onChange={(e) => setWildcardInfo(e.target.value)}
                      className={`${inputClass} resize-y max-h-48 min-h-[100px] custom-scrollbar`}
                      placeholder="Unique constraints, mentors admired, or facts we should know."
                    />
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(7)}
                      className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || isBooting}
                      className="flex-1 px-6 py-4 bg-white text-black font-extrabold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50"
                    >
                      {isBooting ? (
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
    </div>
  );
};

// ============================================================================
// OS INITIALIZATION SEQUENCE (Post-Signup Animation)
// ============================================================================
const SetupSequence = ({ onComplete }) => {
  const [taskIndex, setTaskIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState("tasks"); // 'tasks', 'bonus', 'done'

  const tasks = [
    "Initializing command center",
    "Deploying execution timeline",
    "Calibrating leaderboard",
    "Securing asset vault",
    "Establishing network hub",
    "Building operator profile",
  ];

  const animateScore = (start, end, durationStr = 30) => {
    let current = start;
    const interval = setInterval(() => {
      current += 1;
      setScore(current);
      if (current >= end) clearInterval(interval);
    }, durationStr);
  };

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
  }, [taskIndex, phase]);

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
  }, [phase]);

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
                className={cn(
                  "flex items-center gap-4 text-sm md:text-base font-bold tracking-wide",
                  isDone ? "text-[#888]" : "text-white",
                )}
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
              className={cn(
                "text-8xl md:text-9xl font-black font-mono tracking-tighter transition-colors duration-500",
                phase === "bonus"
                  ? "text-amber-500 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]"
                  : "text-white",
              )}
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
    </motion.div>
  );
};

export default Auth;
