import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export type AppRole = "admin" | "organiser" | "attendee";
export type ActiveWorkspaceMode = "attendee" | "organiser";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  roles: AppRole[];
  activeMode: ActiveWorkspaceMode;
  loading: boolean;
  switchMode: (mode: ActiveWorkspaceMode) => void;
  upgradeToOrganiser: () => Promise<{ success: boolean; error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ session?: Session | null; user?: User | null; error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const CACHED_ROLES_KEY = "eventrally_cached_roles_v1";
const CACHED_PROFILE_KEY = "eventrally_cached_profile_v1";
const ACTIVE_MODE_KEY = "eventguru_active_workspace_mode_v1";

function getCachedRoles(): AppRole[] {
  try {
    const raw = localStorage.getItem(CACHED_ROLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getCachedMode(): ActiveWorkspaceMode | null {
  try {
    const raw = localStorage.getItem(ACTIVE_MODE_KEY);
    if (raw === "attendee" || raw === "organiser") return raw;
  } catch {
    return null;
  }
  return null;
}

function getCachedProfile(): { full_name: string | null; avatar_url: string | null } | null {
  try {
    const raw = localStorage.getItem(CACHED_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(getCachedProfile);
  const [roles, setRoles] = useState<AppRole[]>(getCachedRoles);
  const [activeMode, setActiveModeState] = useState<ActiveWorkspaceMode>(() => {
    const cachedMode = getCachedMode();
    if (cachedMode) return cachedMode;
    const cachedRoles = getCachedRoles();
    return (cachedRoles.includes("organiser") || cachedRoles.includes("admin")) ? "organiser" : "attendee";
  });
  const [loading, setLoading] = useState(true);

  const switchMode = (mode: ActiveWorkspaceMode) => {
    setActiveModeState(mode);
    try {
      localStorage.setItem(ACTIVE_MODE_KEY, mode);
    } catch {}
  };

  const upgradeToOrganiser = async (): Promise<{ success: boolean; error: string | null }> => {
    if (!user) return { success: false, error: "You must be signed in to upgrade." };

    try {
      const { error: upsertErr } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: user.id, role: "organiser" },
          { onConflict: "user_id,role" }
        );

      if (upsertErr) {
        // Fallback: try regular insert in case conflict constraint differs
        const { error: insertErr } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "organiser" });
        if (insertErr && !insertErr.message.includes("duplicate")) {
          throw insertErr;
        }
      }

      const updatedRoles: AppRole[] = Array.from(new Set([...roles, "organiser" as AppRole]));
      setRoles(updatedRoles);
      setActiveModeState("organiser");
      try {
        localStorage.setItem(CACHED_ROLES_KEY, JSON.stringify(updatedRoles));
        localStorage.setItem(ACTIVE_MODE_KEY, "organiser");
      } catch {}

      return { success: true, error: null };
    } catch (err: any) {
      console.error("Upgrade to organizer failed:", err);
      return { success: false, error: err?.message || "Failed to upgrade account." };
    }
  };

  const fetchUserData = async (userId: string, metaRole?: AppRole) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (profileRes.data) {
        setProfile(profileRes.data);
        try { localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(profileRes.data)); } catch {}
      }
      let resolvedRoles: AppRole[] = [];
      if (rolesRes.data && rolesRes.data.length > 0) {
        resolvedRoles = rolesRes.data.map((r) => r.role as AppRole);
      } else if (metaRole) {
        resolvedRoles = [metaRole];
      } else {
        const cached = getCachedRoles();
        resolvedRoles = cached.length > 0 ? cached : ["attendee"];
      }
      setRoles(resolvedRoles);
      try { localStorage.setItem(CACHED_ROLES_KEY, JSON.stringify(resolvedRoles)); } catch {}

      const cachedMode = getCachedMode();
      const isOrg = resolvedRoles.includes("organiser") || resolvedRoles.includes("admin");
      if (cachedMode) {
        if (cachedMode === "organiser" && !isOrg) {
          setActiveModeState("attendee");
          try { localStorage.setItem(ACTIVE_MODE_KEY, "attendee"); } catch {}
        } else {
          setActiveModeState(cachedMode);
        }
      } else {
        const defaultMode: ActiveWorkspaceMode = isOrg ? "organiser" : "attendee";
        setActiveModeState(defaultMode);
        try { localStorage.setItem(ACTIVE_MODE_KEY, defaultMode); } catch {}
      }
    } catch (err) {
      console.warn("Auth user data fetch deferred:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          fetchUserData(newSession.user.id, newSession.user.user_metadata?.role as AppRole);
        } else {
          setProfile(null);
          setRoles([]);
          setActiveModeState("attendee");
          try {
            localStorage.removeItem(CACHED_ROLES_KEY);
            localStorage.removeItem(CACHED_PROFILE_KEY);
            localStorage.removeItem(ACTIVE_MODE_KEY);
          } catch {}
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      if (!isMounted) return;
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        fetchUserData(initSession.user.id, initSession.user.user_metadata?.role as AppRole);
      } else {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    });
    return { session: data.session, user: data.user, error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setActiveModeState("attendee");
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, activeMode, loading, switchMode, upgradeToOrganiser, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
