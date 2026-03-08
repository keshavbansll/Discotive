// src/hooks/useUserData.js
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export const useUserData = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          console.log("No user data found in database!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        // Add a slight artificial delay so the aesthetic skeleton loader always plays
        setTimeout(() => setLoading(false), 800);
      }
    };

    fetchUserData();
  }, [currentUser]);

  return { userData, loading };
};
