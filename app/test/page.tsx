"use client";

import ElegantEditorial from "@/components/templates/ElegantEditorial";
import { useSiteState } from "@/hooks/useSiteState";
import type { SiteState } from "@/types/database";

const TEMPLATE_ID = "87930b18-df82-4704-a600-475c579b7a11";

const DEFAULT_STATE: SiteState = {
  templateId: TEMPLATE_ID,
  version: 1,
  meta: {
    partner1: "Marco",
    partner2: "Julian",
    date: "September 14, 2026",
    slug: "marco-julian",
  },
  elements: {
    "nav-monogram": { text: "M & J", styles: {} },
    "nav-link-1": { text: "Details", styles: {} },
    "nav-link-2": { text: "RSVP", styles: {} },
    "hero-date": { text: "September 14, 2026", styles: {} },
    "hero-names": { text: "Marco & Julian", styles: {} },
    "hero-sub": { text: "Request the pleasure of your company", styles: {} },
    "story-label": { text: "Our Story", styles: {} },
    "story-title": { text: "Two paths, one journey", styles: {} },
    "story-body": {
      text: "What started as a chance meeting in a small bookshop in Florence became the greatest adventure of our lives.",
      styles: {},
    },
    "story-caption-1": { text: "Florence, 2019", styles: {} },
    "story-caption-2": { text: "The proposal", styles: {} },
    "story-caption-3": { text: "Santorini, 2023", styles: {} },
    "story-caption-4": { text: "Our first trip", styles: {} },
    "story-caption-5": { text: "Engagement party, 2025", styles: {} },
    "details-label": { text: "The Celebration", styles: {} },
    "details-title": { text: "Where it all comes together", styles: {} },
    "ceremony-type": { text: "Ceremony", styles: {} },
    "ceremony-name": { text: "The Vows", styles: {} },
    "ceremony-time": { text: "3:00 PM, September 14, 2026", styles: {} },
    "ceremony-venue": { text: "Villa Botanica Chapel, Amalfi Coast, Italy", styles: {} },
    "ceremony-dress": { text: "Cocktail attire encouraged", styles: {} },
    "reception-type": { text: "Reception", styles: {} },
    "reception-name": { text: "The Party", styles: {} },
    "reception-time": { text: "6:00 PM until late", styles: {} },
    "reception-venue": { text: "Terrazza del Tramonto, Amalfi Coast, Italy", styles: {} },
    "reception-note": { text: "Dinner, dancing, and open bar all night", styles: {} },
    "rsvp-label": { text: "Respond", styles: {} },
    "rsvp-title": { text: "Will you join us?", styles: {} },
    "rsvp-body": {
      text: "We would be honored to have you celebrate with us. Please let us know by August 1, 2026.",
      styles: {},
    },
    "footer-names": { text: "Marco & Julian", styles: {} },
    "footer-date": { text: "14 . 09 . 2026", styles: {} },
  },
  images: {
    "hero-1": { src: "https://picsum.photos/seed/wedding1/800/1000", alt: "Wedding couple" },
    "hero-2": { src: "https://picsum.photos/seed/wedding2/800/1000", alt: "Wedding rings" },
    "hero-3": { src: "https://picsum.photos/seed/wedding3/800/1000", alt: "Wedding venue" },
    "gallery-1": { src: "https://picsum.photos/seed/couple1/800/600", alt: "Couple walking together" },
    "gallery-2": { src: "https://picsum.photos/seed/couple2/600/600", alt: "Engagement dinner" },
    "gallery-3": { src: "https://picsum.photos/seed/couple3/600/600", alt: "Couple portrait" },
    "gallery-4": { src: "https://picsum.photos/seed/couple4/600/500", alt: "Adventure together" },
    "gallery-5": { src: "https://picsum.photos/seed/couple5/1000/500", alt: "Celebration with friends" },
  },
};

export default function TestPage() {
  const { state, updateElement, updateMeta, isSaving, lastSaved, siteId } = useSiteState(
    DEFAULT_STATE,
    null
  );
  const elementPreview = Object.fromEntries(Object.entries(state.elements).slice(0, 3));

  return (
    <div className="flex min-h-screen bg-zinc-900 text-zinc-100">
      <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-zinc-700 bg-zinc-950 p-4 text-sm">
        <h1 className="mb-4 text-lg font-semibold">State Test Panel</h1>

        <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900 p-3">
          <div>
            <span className="text-zinc-400">siteId:</span> <span className="break-all">{siteId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isSaving ? "bg-green-400" : "bg-zinc-500"
              }`}
            />
            <span>{isSaving ? "Saving..." : "Idle"}</span>
          </div>
          <div>
            <span className="text-zinc-400">lastSaved:</span>{" "}
            {lastSaved ? lastSaved.toLocaleString() : "(never)"}
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <button
            className="rounded bg-zinc-700 px-3 py-2 text-left hover:bg-zinc-600"
            onClick={() => updateElement("hero-names", { text: `Test Name ${Date.now()}` })}
          >
            Update Hero Names
          </button>
          <button
            className="rounded bg-zinc-700 px-3 py-2 text-left hover:bg-zinc-600"
            onClick={() => updateElement("hero-date", { text: "October 25, 2027" })}
          >
            Update Hero Date
          </button>
          <button
            className="rounded bg-zinc-700 px-3 py-2 text-left hover:bg-zinc-600"
            onClick={() =>
              updateElement("hero-names", {
                styles: { fontFamily: "'Dancing Script', cursive" },
              })
            }
          >
            Change Font on Names
          </button>
          <button
            className="rounded bg-zinc-700 px-3 py-2 text-left hover:bg-zinc-600"
            onClick={() =>
              updateMeta({ partner1: "Ana", partner2: "Mihai", slug: "ana-si-mihai" })
            }
          >
            Update Meta
          </button>
        </div>

        <div className="mt-4 rounded border border-zinc-800 bg-black/40 p-3">
          <h2 className="mb-2 font-medium text-zinc-300">State Snapshot</h2>
          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-300">
            {JSON.stringify({ meta: state.meta, elements: elementPreview }, null, 2)}
          </pre>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto bg-zinc-100">
        <ElegantEditorial state={state} editable={false} />
      </main>
    </div>
  );
}
