import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { ChevronLeft, Loader2, Save, X } from "lucide-react";

// ============================================================================
// MASSIVE TAXONOMY (COPY THESE EXACT ARRAYS FROM YOUR Auth.jsx!)
// ============================================================================
const COUNTRIES = ["India", "United States", "United Kingdom", "Canada"]; // <-- PASTE FULL ARRAY HERE
const DEGREES = ["B.Tech", "B.S. Computer Science", "B.A. Business", "M.Tech"]; // <-- PASTE FULL ARRAY HERE
const DOMAINS = {
  "Engineering & Tech": [
    "Software Engineering",
    "AI/ML Engineer",
    "Web Development",
  ], // <-- PASTE FULL DICT HERE
};
const SKILLS_DICT = {
  "Software Engineering": ["React", "Node.js", "Python", "C++"], // <-- PASTE FULL DICT HERE
};
const COMMITMENTS = [
  "1-10 hours/week",
  "10-20 hours/week",
  "20-40 hours/week",
  "40+ hours/week",
];

const EditProfile = () => {
  const navigate = useNavigate();
  const { userData, loading, refreshUserData } = useUserData();
  const [isSaving, setIsSaving] = useState(false);

  // --- THE MASTER FORM STATE ---
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    location: "",
    bio: "",
    institution: "",
    degree: "",
    gradYear: "",
    passion: "",
    niche: "",
    skills: [],
    goal3Months: "",
    timeCommitment: "",
    wildcardInfo: "",
    github: "",
    linkedin: "",
    twitter: "",
    website: "",
  });

  // Load user data into form on mount
  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.identity?.firstName || "",
        lastName: userData.identity?.lastName || "",
        location: userData.footprint?.location || "",
        bio: userData.footprint?.bio || "",
        institution: userData.baseline?.institution || "",
        degree: userData.baseline?.degree || "",
        gradYear: userData.baseline?.gradYear || "",
        passion: userData.vision?.passion || "",
        niche: userData.vision?.niche || "",
        skills: userData.skills?.alignedSkills || [],
        goal3Months: userData.vision?.goal3Months || "",
        timeCommitment: userData.vision?.timeCommitment || "",
        wildcardInfo: userData.vision?.wildcardInfo || "",
        github: userData.links?.github || "",
        linkedin: userData.links?.linkedin || "",
        twitter: userData.links?.twitter || "",
        website: userData.links?.website || "",
      });
    }
  }, [userData]);

  // Skill Toggle Logic
  const handleSkillToggle = (skill) => {
    setFormData((prev) => {
      const current = prev.skills;
      if (current.includes(skill))
        return { ...prev, skills: current.filter((s) => s !== skill) };
      if (current.length >= 5) return prev;
      return { ...prev, skills: [...current, skill] };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userData?.id) return;
    setIsSaving(true);

    try {
      const userRef = doc(db, "users", userData.id);
      await updateDoc(userRef, {
        "identity.firstName": formData.firstName,
        "identity.lastName": formData.lastName,
        "footprint.location": formData.location,
        "footprint.bio": formData.bio,
        "baseline.institution": formData.institution,
        "baseline.degree": formData.degree,
        "baseline.gradYear": formData.gradYear,
        "vision.passion": formData.passion,
        "vision.niche": formData.niche,
        "skills.alignedSkills": formData.skills,
        "vision.goal3Months": formData.goal3Months,
        "vision.timeCommitment": formData.timeCommitment,
        "vision.wildcardInfo": formData.wildcardInfo,
        "links.github": formData.github,
        "links.linkedin": formData.linkedin,
        "links.twitter": formData.twitter,
        "links.website": formData.website,
      });

      await refreshUserData();
      navigate("/app/profile");
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !userData)
    return <div className="min-h-screen bg-[#030303]" />;

  const inputClass =
    "w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#555] transition-colors font-medium";
  const labelClass = "block text-sm font-bold text-slate-300 mb-2";

  return (
    <div className="bg-[#030303] min-h-screen w-full text-white pb-32">
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
        {/* Fixed Header */}
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-[#222]">
          <button
            onClick={() => navigate("/app/profile")}
            className="flex items-center gap-2 text-[#888] hover:text-white transition-colors font-bold text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Profile
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-extrabold rounded-lg hover:bg-[#ccc] transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" /> Save changes
              </>
            )}
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-12">
          {/* 1. IDENTITY & FOOTPRINT */}
          <section className="space-y-6">
            <h2 className="text-xl font-extrabold text-white border-l-4 border-white pl-3">
              Identity & Footprint
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>First Name *</label>
                <input
                  required
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Last Name *</label>
                <input
                  required
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Location (Country) *</label>
                <select
                  required
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="" disabled>
                    Select your country
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Operator Biography</label>
                <textarea
                  rows="4"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  className={`${inputClass} resize-none custom-scrollbar`}
                  placeholder="Document your journey..."
                />
              </div>
            </div>
          </section>

          {/* 2. ACADEMIC BASELINE */}
          <section className="space-y-6">
            <h2 className="text-xl font-extrabold text-white border-l-4 border-white pl-3">
              Academic Baseline
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Institution *</label>
                <input
                  required
                  type="text"
                  value={formData.institution}
                  onChange={(e) =>
                    setFormData({ ...formData, institution: e.target.value })
                  }
                  className={inputClass}
                  placeholder="e.g. Stanford University"
                />
              </div>
              <div>
                <label className={labelClass}>Degree / Program *</label>
                <select
                  required
                  value={formData.degree}
                  onChange={(e) =>
                    setFormData({ ...formData, degree: e.target.value })
                  }
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="" disabled>
                    Select program
                  </option>
                  {DEGREES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Graduation Year *</label>
                <input
                  required
                  type="number"
                  min="2000"
                  max="2040"
                  value={formData.gradYear}
                  onChange={(e) =>
                    setFormData({ ...formData, gradYear: e.target.value })
                  }
                  className={inputClass}
                  placeholder="YYYY"
                />
              </div>
            </div>
          </section>

          {/* 3. VISION & ARSENAL */}
          <section className="space-y-6">
            <h2 className="text-xl font-extrabold text-white border-l-4 border-white pl-3">
              Vision & Arsenal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Macro Domain *</label>
                <select
                  required
                  value={formData.passion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passion: e.target.value,
                      niche: "",
                      skills: [],
                    })
                  }
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="" disabled>
                    Select a domain
                  </option>
                  {Object.keys(DOMAINS).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Micro Niche *</label>
                <select
                  required
                  disabled={!formData.passion}
                  value={formData.niche}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      niche: e.target.value,
                      skills: [],
                    })
                  }
                  className={`${inputClass} appearance-none cursor-pointer disabled:opacity-50`}
                >
                  <option value="" disabled>
                    Select a niche
                  </option>
                  {formData.passion &&
                    DOMAINS[formData.passion]?.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Core Arsenal (Max 5)</label>
                <div className="flex flex-wrap gap-3 mt-4">
                  {(formData.niche && SKILLS_DICT[formData.niche]
                    ? SKILLS_DICT[formData.niche]
                    : []
                  ).map((skill) => {
                    const isSelected = formData.skills.includes(skill);
                    const isDisabled =
                      !isSelected && formData.skills.length >= 5;
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleSkillToggle(skill)}
                        disabled={isDisabled}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${isSelected ? "bg-white text-black border-white" : "bg-[#111] border-[#333] text-[#888] hover:border-[#666]"} ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
                      >
                        {skill}
                        {isSelected && <X className="inline w-3 h-3 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 4. TRAJECTORY */}
          <section className="space-y-6">
            <h2 className="text-xl font-extrabold text-white border-l-4 border-white pl-3">
              Trajectory & Alignment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>90-Day Tactical Goal *</label>
                <input
                  required
                  type="text"
                  value={formData.goal3Months}
                  onChange={(e) =>
                    setFormData({ ...formData, goal3Months: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Launch MVP, Secure Internship, etc."
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Weekly Time Commitment *</label>
                <select
                  required
                  value={formData.timeCommitment}
                  onChange={(e) =>
                    setFormData({ ...formData, timeCommitment: e.target.value })
                  }
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="" disabled>
                    Select commitment level
                  </option>
                  {COMMITMENTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Wildcard Information</label>
                <textarea
                  rows="3"
                  value={formData.wildcardInfo}
                  onChange={(e) =>
                    setFormData({ ...formData, wildcardInfo: e.target.value })
                  }
                  className={`${inputClass} resize-none custom-scrollbar`}
                  placeholder="Unique constraints, mentors admired, or facts we should know."
                />
              </div>
            </div>
          </section>

          {/* 5. DIGITAL FOOTPRINT (LINKS) */}
          <section className="space-y-6">
            <h2 className="text-xl font-extrabold text-white border-l-4 border-white pl-3">
              Digital Footprint (URLs)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>GitHub</label>
                <input
                  type="url"
                  value={formData.github}
                  onChange={(e) =>
                    setFormData({ ...formData, github: e.target.value })
                  }
                  className={inputClass}
                  placeholder="https://github.com/..."
                />
              </div>
              <div>
                <label className={labelClass}>LinkedIn</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedin: e.target.value })
                  }
                  className={inputClass}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div>
                <label className={labelClass}>X (Twitter)</label>
                <input
                  type="url"
                  value={formData.twitter}
                  onChange={(e) =>
                    setFormData({ ...formData, twitter: e.target.value })
                  }
                  className={inputClass}
                  placeholder="https://x.com/..."
                />
              </div>
              <div>
                <label className={labelClass}>Personal Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 mt-8 bg-white text-black text-lg font-extrabold rounded-xl hover:bg-[#ccc] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
