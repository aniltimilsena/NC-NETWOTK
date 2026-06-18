import { collection, addDoc, query, where, getDocs, limit, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PasswordRules {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

export function evaluatePasswordStrength(password: string): {
  strength: 'Weak' | 'Medium' | 'Strong';
  rules: PasswordRules;
} {
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const count = Object.values(rules).filter(Boolean).length;
  let strength: 'Weak' | 'Medium' | 'Strong' = 'Weak';
  
  if (rules.length && count === 4) {
    strength = 'Strong';
  } else if (rules.length && count >= 2) {
    strength = 'Medium';
  }

  return { strength, rules };
}

export function getSessionInfo() {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  let browser = "Unknown Browser";

  if (ua.includes("Windows NT 10.0")) os = "Windows 11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.2")) os = "Windows 8";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";

  if (ua.includes("Chrome") && !ua.includes("Chromium") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  
  return { os, browser };
}

export async function fetchLocation() {
  try {
    const res = await fetch("https://freeipapi.com/api/json");
    if (res.ok) {
      const data = await res.json();
      if (data.cityName && data.countryName) {
        return `${data.cityName}, ${data.countryName}`;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch location from IP:", err);
  }
  return "Unknown Location";
}

export async function logLoginAttempt(email: string, status: 'success' | 'failed') {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.trim().toLowerCase()));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.warn(`Could not resolve user UID for email: ${email}`);
      return { suspicious: false };
    }
    
    const uid = snap.docs[0].id;
    const { os, browser } = getSessionInfo();
    const location = await fetchLocation();
    
    // Check if this is a suspicious location
    let suspicious = false;
    if (status === 'success' && location !== 'Unknown Location') {
      const historyRef = collection(db, 'profiles', uid, 'login_history');
      const historyQuery = query(
        historyRef, 
        where('status', '==', 'success'), 
        orderBy('timestamp', 'desc'), 
        limit(5)
      );
      const historySnap = await getDocs(historyQuery);
      
      if (!historySnap.empty) {
        const locations = historySnap.docs.map(d => d.data().location).filter(l => l && l !== 'Unknown Location');
        if (locations.length > 0 && !locations.includes(location)) {
          suspicious = true;
        }
      }
    }
    
    const historyRef = collection(db, 'profiles', uid, 'login_history');
    await addDoc(historyRef, {
      timestamp: serverTimestamp(),
      os,
      browser,
      location,
      status,
      suspicious,
      userAgent: navigator.userAgent
    });

    return { suspicious };
  } catch (err) {
    console.error("Failed to log login attempt:", err);
    return { suspicious: false };
  }
}
