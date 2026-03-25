"use client";

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import ElegantEditorial from "@/components/templates/ElegantEditorial";
import { useSiteState } from "@/hooks/useSiteState";
import type { SiteState } from "@/types/database";
import EditorBanner from "./EditorBanner";
import FloatingToolbar from "./FloatingToolbar";
import PublishModal from "./PublishModal";

type BuilderClientProps = {
  initialState: SiteState;
  templateDefaults: SiteState;
  siteId: string | null;
  templateId: string;
  initialStatus: "draft" | "published";
  initialSlug: string | null;
  initialPartner1Name: string | null;
  initialPartner2Name: string | null;
  initialEventDate: string | null;
};

type SelectedElement = {
  key: string;
  element: HTMLElement;
};

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function setCSSHighlight(range: Range | null): void {
  if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
  const highlights = CSS.highlights as Map<string, unknown>;
  if (range && typeof globalThis.Highlight === "function") {
    highlights.set("builder-selection", new Highlight(range));
  } else {
    highlights.delete("builder-selection");
  }
}

function getNodeAtCaret(container: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.getRangeAt(0).startContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (node instanceof HTMLElement && container.contains(node) && node !== container) {
    return node;
  }
  return null;
}

const DB_SYNC_KEY = "spunemda_db_sync_disabled";

function formatDate(isoDate: string, format: "long" | "dotted"): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  if (format === "dotted") {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd} . ${mm} . ${yyyy}`;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default function BuilderClient({
  initialState,
  templateDefaults,
  siteId,
  templateId,
  initialStatus,
  initialSlug,
  initialPartner1Name,
  initialPartner2Name,
  initialEventDate,
}: BuilderClientProps) {
  const [dbSyncEnabled, setDbSyncEnabled] = useState(true);

  useEffect(() => {
    setDbSyncEnabled(window.localStorage.getItem(DB_SYNC_KEY) !== "1");
  }, []);

  const toggleDbSync = useCallback(() => {
    setDbSyncEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(DB_SYNC_KEY, next ? "0" : "1");
      return next;
    });
  }, []);

  const {
    state,
    updateElement,
    updateImage,
    updateMeta,
    isSaving,
    lastSaved,
    siteId: resolvedSiteId,
    isDirty,
  } = useSiteState(
    { ...initialState, templateId },
    siteId,
    dbSyncEnabled
  );

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [siteStatus, setSiteStatus] = useState<"draft" | "published">(initialStatus);
  const [siteSlug, setSiteSlug] = useState<string | null>(initialSlug);
  const [partner1Name, setPartner1Name] = useState<string | null>(initialPartner1Name);
  const [partner2Name, setPartner2Name] = useState<string | null>(initialPartner2Name);
  const [eventDate, setEventDate] = useState<string | null>(initialEventDate);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [isFirstPublishAttempt, setIsFirstPublishAttempt] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const claimDraftForUser = useCallback(async () => {
    const id = resolvedSiteId;
    if (id === "new") {
      throw new Error("Cannot link site yet. Save your draft first, then try again.");
    }
    const res = await fetch(`/api/sites/${id}/claim`, {
      method: "POST",
      credentials: "same-origin",
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? "Failed to link your site to this account.");
    }
  }, [resolvedSiteId]);

  const applyWeddingDetails = useCallback(
    (partner1: string, partner2: string, isoDate: string) => {
      const p1 = partner1.trim();
      const p2 = partner2.trim();
      const monogram = `${p1.charAt(0).toUpperCase()} & ${p2.charAt(0).toUpperCase()}`;
      const combinedNames = `${p1} & ${p2}`;
      const longDate = formatDate(isoDate, "long");
      const dottedDate = formatDate(isoDate, "dotted");

      updateMeta({ partner1: p1, partner2: p2, date: isoDate });

      const maybeUpdateIfUnedited = (key: string, nextText: string) => {
        const current = state.elements[key]?.text ?? "";
        const base = templateDefaults.elements[key]?.text ?? "";
        if (current === base) {
          updateElement(key, { text: nextText });
        }
      };

      maybeUpdateIfUnedited("hero-names", combinedNames);
      maybeUpdateIfUnedited("nav-monogram", monogram);
      maybeUpdateIfUnedited("footer-names", combinedNames);
      maybeUpdateIfUnedited("hero-date", longDate);
      maybeUpdateIfUnedited("footer-date", dottedDate);
      setPartner1Name(p1);
      setPartner2Name(p2);
      setEventDate(isoDate);
    },
    [state.elements, templateDefaults.elements, updateElement, updateMeta]
  );

  const togglePublishStatus = useCallback(async () => {
    if (resolvedSiteId === "new" || isTogglingPublish) return;
    setIsTogglingPublish(true);
    try {
      if (siteStatus === "published") {
        const res = await fetch(`/api/sites/${resolvedSiteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "draft" }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          site?: { status?: "draft" | "published"; slug?: string | null };
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Failed to unpublish site.");
        setSiteStatus("draft");
        if (typeof json.site?.slug === "string" || json.site?.slug === null) {
          setSiteSlug(json.site.slug);
        }
        return;
      }

      const effectiveSlug = (siteSlug || "").trim().toLowerCase();
      const effectivePartner1 = (partner1Name || "").trim();
      const effectivePartner2 = (partner2Name || "").trim();
      const effectiveDate = (eventDate || "").trim();
      const hasSetup =
        Boolean(effectiveSlug) &&
        effectiveSlug !== resolvedSiteId &&
        Boolean(effectivePartner1) &&
        Boolean(effectivePartner2) &&
        /^\d{4}-\d{2}-\d{2}$/.test(effectiveDate);

      if (!hasSetup) {
        setIsFirstPublishAttempt(siteStatus === "draft");
        setShowPublishModal(true);
        return;
      }

      const res = await fetch(`/api/sites/${resolvedSiteId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: effectiveSlug,
          partner1_name: effectivePartner1,
          partner2_name: effectivePartner2,
          event_date: effectiveDate,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        url?: string;
      };
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to publish site.");
      setSiteStatus("published");
      if (json.url?.startsWith("/")) {
        setSiteSlug(json.url.slice(1));
      } else {
        setSiteSlug(effectiveSlug);
      }
      setToastMessage("Site updated successfully");
    } catch (error) {
      console.error(error);
    } finally {
      setIsTogglingPublish(false);
    }
  }, [
    eventDate,
    isTogglingPublish,
    partner1Name,
    partner2Name,
    resolvedSiteId,
    siteSlug,
    siteStatus,
  ]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageKeyRef = useRef<string | null>(null);
  const textInputTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRangeRef = useRef<{ range: Range; key: string; at: number } | null>(null);
  const editingKeyRef = useRef<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [cursorNode, setCursorNode] = useState<HTMLElement | null>(null);
  const [renderState, setRenderState] = useState(state);

  useEffect(() => {
    if (!editingKeyRef.current) {
      setRenderState(state);
      return;
    }

    const editingKey = editingKeyRef.current;
    setRenderState((prev) => {
      let changed = false;
      const nextElements = { ...prev.elements };

      for (const key of Object.keys(state.elements)) {
        const prevStyles = prev.elements[key]?.styles;
        const nextStyles = state.elements[key]?.styles;
        if (prevStyles !== nextStyles && JSON.stringify(prevStyles) !== JSON.stringify(nextStyles)) {
          changed = true;
          nextElements[key] = {
            text: key === editingKey ? (prev.elements[key]?.text ?? state.elements[key].text) : state.elements[key].text,
            styles: nextStyles ?? {},
          };
        }
      }

      if (!changed) {
        return prev;
      }

      return { ...prev, elements: nextElements };
    });
  }, [state]);

  const teardownEditing = useCallback(() => {
    if (!selectedElement) {
      return;
    }

    const { element, key } = selectedElement;
    const nextHtml = element.innerHTML;
    element.removeAttribute("contenteditable");
    element.classList.remove("editing");
    editingKeyRef.current = null;
    updateElement(key, { text: nextHtml });
    setSelectedElement(null);
    setCursorNode(null);
    setCSSHighlight(null);
  }, [selectedElement, updateElement]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const onWrapperClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const toolbar = target.closest("[data-builder-toolbar]");
      if (toolbar) {
        return;
      }

      const changeBtn = target.closest("[data-img-change-btn]") as HTMLButtonElement | null;
      if (changeBtn) {
        event.preventDefault();
        event.stopPropagation();
        const key = changeBtn.getAttribute("data-img-key");
        if (!key) {
          return;
        }
        imageKeyRef.current = key;
        fileInputRef.current?.click();
        return;
      }

      const editableTarget = target.closest("[data-key]") as HTMLElement | null;
      if (!editableTarget) {
        teardownEditing();
        return;
      }

      const key = editableTarget.getAttribute("data-key");
      if (!key) {
        return;
      }

      if (selectedElement?.key === key) {
        return;
      }

      event.preventDefault();

      if (selectedElement?.element && selectedElement.element !== editableTarget) {
        teardownEditing();
      }

      editableTarget.setAttribute("contenteditable", "true");
      editableTarget.classList.add("editing");
      editableTarget.focus();
      selectedRangeRef.current = null;
      editingKeyRef.current = key;
      setSelectedElement({ key, element: editableTarget });
    };

    wrapper.addEventListener("click", onWrapperClick);
    return () => {
      wrapper.removeEventListener("click", onWrapperClick);
    };
  }, [selectedElement, teardownEditing]);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-builder-toolbar]")) {
        return;
      }
      if (
        target.closest("[data-key]") ||
        target.closest("[data-img-key]") ||
        target.closest("[data-img-change-btn]")
      ) {
        return;
      }
      teardownEditing();
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
    };
  }, [teardownEditing]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const onInput = (event: Event) => {
      const target = event.target as HTMLElement;
      const editableTarget = target.closest("[data-key]") as HTMLElement | null;
      if (!editableTarget) {
        return;
      }
      const key = editableTarget.getAttribute("data-key");
      if (!key || editingKeyRef.current !== key) {
        return;
      }

      if (textInputTimerRef.current) {
        clearTimeout(textInputTimerRef.current);
      }
      textInputTimerRef.current = setTimeout(() => {
        updateElement(key, { text: editableTarget.innerHTML });
      }, 300);
    };

    wrapper.addEventListener("input", onInput);
    return () => {
      wrapper.removeEventListener("input", onInput);
    };
  }, [updateElement]);

  useEffect(() => {
    return () => {
      if (textInputTimerRef.current) {
        clearTimeout(textInputTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      if (!selectedElement) {
        selectedRangeRef.current = null;
        setCursorNode(null);
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);

      if (!selectedElement.element.contains(range.commonAncestorContainer)) {
        return;
      }

      setCursorNode(getNodeAtCaret(selectedElement.element));

      if (range.collapsed) {
        return;
      }

      setCSSHighlight(range);

      selectedRangeRef.current = {
        range: range.cloneRange(),
        key: selectedElement.key,
        at: Date.now(),
      };
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [selectedElement]);

  const onFilePicked = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const key = imageKeyRef.current;
      const file = event.target.files?.[0];
      if (!key || !file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? "");
        if (dataUrl) {
          updateImage(key, dataUrl);
        }
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    },
    [updateImage]
  );

  const preserveSelection = useCallback(() => {
    if (!selectedElement) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      return;
    }

    if (!selectedElement.element.contains(range.commonAncestorContainer)) {
      return;
    }

    setCSSHighlight(range);

    selectedRangeRef.current = {
      range: range.cloneRange(),
      key: selectedElement.key,
      at: Date.now(),
    };
  }, [selectedElement]);

  const onUpdateStyles = useCallback(
    (styles: Record<string, string>) => {
      if (!selectedElement) {
        return;
      }

      const applyToRange = (range: Range) => {
        const span = document.createElement("span");
        Object.entries(styles).forEach(([property, value]) => {
          span.style.setProperty(toKebabCase(property), value);
        });

        const fragment = range.extractContents();
        const kebab = Object.keys(styles).map(toKebabCase);
        fragment.querySelectorAll("*").forEach((child) => {
          if (child instanceof HTMLElement) {
            kebab.forEach((prop) => child.style.removeProperty(prop));
          }
        });
        span.appendChild(fragment);
        range.insertNode(span);

        const selection = window.getSelection();
        if (selection) {
          const nextRange = document.createRange();
          nextRange.selectNodeContents(span);
          selection.removeAllRanges();
          selection.addRange(nextRange);
          selectedRangeRef.current = {
            range: nextRange.cloneRange(),
            key: selectedElement.key,
            at: Date.now(),
          };
        }
      };

      const selection = window.getSelection();
      const liveRange =
        selection &&
        selection.rangeCount > 0 &&
        !selection.getRangeAt(0).collapsed &&
        selectedElement.element.contains(selection.getRangeAt(0).commonAncestorContainer)
          ? selection.getRangeAt(0).cloneRange()
          : null;

      const cachedSelection = selectedRangeRef.current;
      const recentCachedRange =
        !liveRange &&
        cachedSelection &&
        cachedSelection.key === selectedElement.key &&
        Date.now() - cachedSelection.at < 30000 &&
        !cachedSelection.range.collapsed &&
        selectedElement.element.contains(cachedSelection.range.commonAncestorContainer)
          ? cachedSelection.range.cloneRange()
          : null;

      const activeRange = liveRange ?? recentCachedRange;

      if (activeRange) {
        applyToRange(activeRange);
        updateElement(selectedElement.key, { text: selectedElement.element.innerHTML });
        return;
      }

      const kebabKeys = Object.keys(styles).map(toKebabCase);
      selectedElement.element.querySelectorAll("*").forEach((child) => {
        if (child instanceof HTMLElement) {
          kebabKeys.forEach((prop) => child.style.removeProperty(prop));
        }
      });
      const cleanedHtml = selectedElement.element.innerHTML;

      setRenderState((prev) => ({
        ...prev,
        elements: {
          ...prev.elements,
          [selectedElement.key]: {
            text: cleanedHtml,
            styles: {
              ...(prev.elements[selectedElement.key]?.styles ?? {}),
              ...styles,
            },
          },
        },
      }));
      updateElement(selectedElement.key, { text: cleanedHtml, styles });
    },
    [selectedElement, updateElement]
  );

  return (
    <div className="builder-shell">
      <EditorBanner
        isSaving={isSaving}
        lastSaved={lastSaved}
        dbSyncEnabled={dbSyncEnabled}
        onToggleDbSync={toggleDbSync}
        isDirty={isDirty}
        primaryActionLabel={siteStatus === "published" ? "Unpublish" : "Publish"}
        onPrimaryAction={togglePublishStatus}
        primaryActionDisabled={isTogglingPublish}
        isPublished={siteStatus === "published"}
        publishedSlug={siteSlug}
      />

      <FloatingToolbar
        selectedElement={selectedElement?.element ?? null}
        cursorNode={cursorNode}
        onUpdateStyles={onUpdateStyles}
        visible={!!selectedElement}
        onPreserveSelection={preserveSelection}
        elementStyles={selectedElement ? renderState.elements[selectedElement.key]?.styles : undefined}
      />

      <div className="builder-canvas" ref={wrapperRef}>
        <ElegantEditorial state={renderState} editable />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFilePicked} />

      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        siteId={resolvedSiteId}
        onPublished={(url) => {
          setSiteStatus("published");
          if (url.startsWith("/")) {
            setSiteSlug(url.slice(1));
          }
          if (!isFirstPublishAttempt) {
            setShowPublishModal(false);
            setToastMessage("Site updated successfully");
          }
        }}
        onAuthComplete={claimDraftForUser}
        meta={state.meta}
        defaultMeta={templateDefaults.meta}
        onApplyWeddingDetails={applyWeddingDetails}
        isFirstPublish={isFirstPublishAttempt}
      />
      {toastMessage ? <div className="builder-toast">{toastMessage}</div> : null}
    </div>
  );
}
