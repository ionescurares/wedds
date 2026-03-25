"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SiteState } from "@/types/database";

type State = {
  data: SiteState;
  dirty: boolean;
  localVersion: number;
};

type Action =
  | { type: "SET_STATE"; payload: SiteState; markDirty?: boolean; localVersion?: number }
  | {
      type: "UPDATE_ELEMENT";
      key: string;
      updates: Partial<{ text: string; styles: Record<string, string> }>;
    }
  | { type: "UPDATE_IMAGE"; key: string; src: string; alt?: string }
  | { type: "UPDATE_META"; updates: Partial<SiteState["meta"]> }
  | { type: "MARK_CLEAN" };

type PersistedDraft = {
  state: SiteState;
  localVersion: number;
  savedAt: number;
};

const DRAFT_PREFIX = "spunemda_draft_";

type UseSiteStateResult = {
  state: SiteState;
  updateElement: (
    key: string,
    updates: Partial<{ text: string; styles: Record<string, string> }>
  ) => void;
  updateImage: (key: string, src: string, alt?: string) => void;
  updateMeta: (updates: Partial<SiteState["meta"]>) => void;
  isSaving: boolean;
  lastSaved: Date | null;
  siteId: string;
  isDirty: boolean;
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_STATE":
      return {
        data: action.payload,
        dirty: action.markDirty ?? state.dirty,
        localVersion: action.localVersion ?? state.localVersion,
      };
    case "UPDATE_ELEMENT": {
      const prev = state.data.elements[action.key] ?? { text: "", styles: {} };
      const mergedStyles = {
        ...prev.styles,
        ...(action.updates.styles ?? {}),
      };

      return {
        ...state,
        dirty: true,
        localVersion: state.localVersion + 1,
        data: {
          ...state.data,
          elements: {
            ...state.data.elements,
            [action.key]: {
              text: action.updates.text ?? prev.text,
              styles: mergedStyles,
            },
          },
        },
      };
    }
    case "UPDATE_IMAGE": {
      const prev = state.data.images[action.key] ?? { src: "", alt: "" };
      return {
        ...state,
        dirty: true,
        localVersion: state.localVersion + 1,
        data: {
          ...state.data,
          images: {
            ...state.data.images,
            [action.key]: {
              src: action.src,
              alt: action.alt ?? prev.alt,
            },
          },
        },
      };
    }
    case "UPDATE_META":
      return {
        ...state,
        dirty: true,
        localVersion: state.localVersion + 1,
        data: {
          ...state.data,
          meta: {
            ...state.data.meta,
            ...action.updates,
          },
        },
      };
    case "MARK_CLEAN":
      return {
        ...state,
        dirty: false,
      };
    default:
      return state;
  }
}

function getStorageKey(siteId: string): string {
  return `${DRAFT_PREFIX}${siteId}`;
}

function loadPersistedDraft(siteId: string): PersistedDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(siteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDraft;
    if (!parsed?.state || typeof parsed.localVersion !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedDraft(siteId: string, draft: PersistedDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(siteId), JSON.stringify(draft));
  } catch (error) {
    console.error("Failed to persist local draft", error);
  }
}

export function useSiteState(
  initialState: SiteState,
  siteId: string | null,
  dbSyncEnabled = true
): UseSiteStateResult {
  const initialSiteId = siteId ?? "new";
  const [currentSiteId, setCurrentSiteId] = useState(initialSiteId);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [store, dispatch] = useReducer(reducer, {
    data: initialState,
    dirty: false,
    localVersion: 0,
  });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef(store);
  const siteIdRef = useRef(currentSiteId);
  const hydratedForIdRef = useRef<string | null>(null);

  // Hydrate from localStorage when siteId is known
  useEffect(() => {
    if (currentSiteId === "new") return;
    if (hydratedForIdRef.current === currentSiteId) return;
    hydratedForIdRef.current = currentSiteId;
    const localDraft = loadPersistedDraft(currentSiteId);
    if (localDraft && localDraft.localVersion > 0) {
      dispatch({
        type: "SET_STATE",
        payload: localDraft.state,
        markDirty: false,
        localVersion: localDraft.localVersion,
      });
    }
  }, [currentSiteId]);

  useEffect(() => {
    latestStateRef.current = store;
  }, [store]);

  useEffect(() => {
    siteIdRef.current = currentSiteId;
  }, [currentSiteId]);

  // Supabase save logic
  const runSupabaseSave = useCallback(async () => {
    const snapshot = latestStateRef.current;
    if (!snapshot.dirty) return;

    setIsSaving(true);

    try {
      const supabase = createClient();
      const nowIso = new Date().toISOString();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (siteIdRef.current === "new") {
        const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
          .from("sites")
          .insert({
            template_id: snapshot.data.templateId,
            user_id: user?.id ?? null,
            state: snapshot.data,
            status: "draft",
            expires_at: expiresAt,
          })
          .select("id")
          .single();

        if (error) throw error;

        const nextId = data?.id as string | undefined;
        if (!nextId) throw new Error("Site created without id");

        await supabase
          .from("sites")
          .update({ slug: nextId })
          .eq("id", nextId)
          .is("slug", null);

        const previousKey = getStorageKey(siteIdRef.current);
        siteIdRef.current = nextId;
        setCurrentSiteId(nextId);

        window.history.replaceState(null, "", `/builder/${nextId}`);

        try {
          const previousDraft = window.localStorage.getItem(previousKey);
          if (previousDraft) {
            window.localStorage.setItem(getStorageKey(nextId), previousDraft);
            window.localStorage.removeItem(previousKey);
          }
        } catch (err) {
          console.error("Failed to migrate local draft key", err);
        }
      } else {
        let updateQuery = supabase
          .from("sites")
          .update({
            state: snapshot.data,
            updated_at: nowIso,
          })
          .eq("id", siteIdRef.current);

        if (user?.id) {
          updateQuery = updateQuery.eq("user_id", user.id);
        } else {
          updateQuery = updateQuery.is("user_id", null);
        }

        const { error } = await updateQuery;

        if (error) throw error;
      }

      dispatch({ type: "MARK_CLEAN" });
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save site draft to Supabase", error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Debounced localStorage write (300ms)
  useEffect(() => {
    if (store.localVersion === 0) return;

    if (localTimerRef.current) clearTimeout(localTimerRef.current);

    localTimerRef.current = setTimeout(() => {
      savePersistedDraft(siteIdRef.current, {
        state: latestStateRef.current.data,
        localVersion: latestStateRef.current.localVersion,
        savedAt: Date.now(),
      });
    }, 300);

    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
    };
  }, [store.data, store.localVersion]);

  // Debounced Supabase save (3s)
  useEffect(() => {
    if (!store.dirty || !dbSyncEnabled) {
      if (!dbSyncEnabled && store.dirty) {
        dispatch({ type: "MARK_CLEAN" });
      }
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      void runSupabaseSave();
    }, 3000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dbSyncEnabled, runSupabaseSave, store.dirty, store.localVersion]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      if (latestStateRef.current.dirty && dbSyncEnabled) {
        void runSupabaseSave();
      }
    };
  }, [dbSyncEnabled, runSupabaseSave]);

  const updateElement = useCallback(
    (
      key: string,
      updates: Partial<{ text: string; styles: Record<string, string> }>
    ) => {
      dispatch({ type: "UPDATE_ELEMENT", key, updates });
    },
    []
  );

  const updateImage = useCallback((key: string, src: string, alt?: string) => {
    dispatch({ type: "UPDATE_IMAGE", key, src, alt });
  }, []);

  const updateMeta = useCallback((updates: Partial<SiteState["meta"]>) => {
    dispatch({ type: "UPDATE_META", updates });
  }, []);

  return {
    state: store.data,
    updateElement,
    updateImage,
    updateMeta,
    isSaving,
    lastSaved,
    siteId: currentSiteId,
    isDirty: store.dirty,
  };
}
