"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FloatingToolbarProps = {
  selectedElement: HTMLElement | null;
  cursorNode?: HTMLElement | null;
  onUpdateStyles: (styles: Record<string, string>) => void;
  visible: boolean;
  onPreserveSelection?: () => void;
  elementStyles?: Record<string, string>;
  colorSwatches: string[];
};

const FONT_OPTIONS = [
  "Cormorant Garamond",
  "Playfair Display",
  "Lora",
  "Libre Baskerville",
  "EB Garamond",
  "Source Serif 4",
  "Dancing Script",
  "Great Vibes",
  "Outfit",
  "Montserrat",
  "Josefin Sans",
  "Raleway",
];

type ToolbarState = {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  color: string;
};

function toHexColor(color: string): string {
  const match = color.match(/\d+/g);
  if (!match || match.length < 3) {
    return color.startsWith("#") ? color : "#2c2c28";
  }
  const [r, g, b] = match.slice(0, 3).map(Number);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function parseFontFamily(raw: string): string {
  const cleaned = raw.split(",")[0]?.trim().replace(/['"]/g, "");
  return FONT_OPTIONS.find((font) => cleaned?.toLowerCase().includes(font.toLowerCase())) ?? "Outfit";
}

function readStateFromElement(element: HTMLElement, explicitStyles?: Record<string, string>): ToolbarState {
  const computed = window.getComputedStyle(element);

  const fontFamily = explicitStyles?.fontFamily
    ? parseFontFamily(explicitStyles.fontFamily)
    : parseFontFamily(computed.fontFamily);

  const fontSize = explicitStyles?.fontSize
    ? Math.max(1, Math.round(Number.parseFloat(explicitStyles.fontSize) || 16))
    : Math.max(1, Math.round(Number.parseFloat(computed.fontSize) || 16));

  const bold = explicitStyles?.fontWeight
    ? Number.parseInt(explicitStyles.fontWeight, 10) >= 600
    : Number.parseInt(computed.fontWeight, 10) >= 600;

  const italic = explicitStyles?.fontStyle
    ? explicitStyles.fontStyle === "italic"
    : computed.fontStyle === "italic";

  const uppercase = explicitStyles?.textTransform
    ? explicitStyles.textTransform === "uppercase"
    : computed.textTransform === "uppercase";

  const color = explicitStyles?.color
    ? toHexColor(explicitStyles.color)
    : toHexColor(computed.color);

  return { fontFamily, fontSize, bold, italic, uppercase, color };
}

export default function FloatingToolbar({
  selectedElement,
  cursorNode,
  onUpdateStyles,
  visible,
  onPreserveSelection,
  elementStyles,
  colorSwatches,
}: FloatingToolbarProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [state, setState] = useState<ToolbarState>({
    fontFamily: "Outfit",
    fontSize: 16,
    bold: false,
    italic: false,
    uppercase: false,
    color: "#2c2c28",
  });
  const [sizeInput, setSizeInput] = useState("");
  const [sizeEditing, setSizeEditing] = useState(false);
  const sizeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedElement) {
      return;
    }
    const next = cursorNode
      ? readStateFromElement(cursorNode)
      : readStateFromElement(selectedElement, elementStyles);
    setState(next);
    if (!sizeEditing) {
      setSizeInput(String(next.fontSize));
    }
  }, [selectedElement, cursorNode, elementStyles, sizeEditing]);

  useEffect(() => {
    if (!visible || !selectedElement) {
      return;
    }

    const updatePosition = () => {
      const rect = selectedElement.getBoundingClientRect();
      const toolbarWidth = 380;
      const toolbarHeight = 132;
      const margin = 10;
      const aboveTop = rect.top - toolbarHeight - margin;
      const top = aboveTop > 60 ? aboveTop : rect.bottom + margin;
      const left = Math.min(
        Math.max(12, rect.left + rect.width / 2 - toolbarWidth / 2),
        window.innerWidth - toolbarWidth - 12
      );
      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [selectedElement, visible]);

  const commitSize = useCallback(
    (rawValue: string) => {
      const parsed = Number.parseInt(rawValue, 10);
      const clamped = Number.isNaN(parsed) ? state.fontSize : Math.min(350, Math.max(1, parsed));
      setState((prev) => ({ ...prev, fontSize: clamped }));
      setSizeInput(String(clamped));
      setSizeEditing(false);
      onUpdateStyles({ fontSize: `${clamped}px` });
    },
    [onUpdateStyles, state.fontSize]
  );

  if (!visible || !selectedElement) {
    return null;
  }

  const emit = (next: Partial<ToolbarState>, stylePatch: Record<string, string>) => {
    const merged = { ...state, ...next };
    setState(merged);
    if (next.fontSize !== undefined) {
      setSizeInput(String(next.fontSize));
    }
    onUpdateStyles(stylePatch);
  };

  return (
    <div
      data-builder-toolbar
      className="builder-toolbar visible"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseDownCapture={onPreserveSelection}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="builder-toolbar-row">
        <select
          value={state.fontFamily}
          onChange={(e) =>
            emit(
              { fontFamily: e.target.value },
              { fontFamily: `'${e.target.value}', sans-serif` }
            )
          }
          className="builder-select"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      <div className="builder-toolbar-row">
        <button
          className={`builder-icon-btn ${state.bold ? "active" : ""}`}
          onClick={() => emit({ bold: !state.bold }, { fontWeight: !state.bold ? "700" : "400" })}
        >
          B
        </button>
        <button
          className={`builder-icon-btn ${state.italic ? "active" : ""}`}
          onClick={() => emit({ italic: !state.italic }, { fontStyle: !state.italic ? "italic" : "normal" })}
        >
          I
        </button>
        <button
          className={`builder-icon-btn ${state.uppercase ? "active" : ""}`}
          onClick={() =>
            emit({ uppercase: !state.uppercase }, { textTransform: !state.uppercase ? "uppercase" : "none" })
          }
        >
          Aa
        </button>
        <span className="builder-divider" />
        <button
          className="builder-icon-btn"
          onClick={() => {
            const nextSize = Math.max(1, state.fontSize - 1);
            emit({ fontSize: nextSize }, { fontSize: `${nextSize}px` });
          }}
        >
          -
        </button>
        <input
          ref={sizeInputRef}
          className="builder-size-input"
          type="text"
          inputMode="numeric"
          value={sizeEditing ? sizeInput : String(state.fontSize)}
          onFocus={() => {
            setSizeEditing(true);
            setSizeInput(String(state.fontSize));
          }}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, "");
            setSizeInput(v);
          }}
          onBlur={() => commitSize(sizeInput)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitSize(sizeInput);
              sizeInputRef.current?.blur();
            }
            if (e.key === "Escape") {
              setSizeEditing(false);
              setSizeInput(String(state.fontSize));
              sizeInputRef.current?.blur();
            }
          }}
        />
        <button
          className="builder-icon-btn"
          onClick={() => {
            const nextSize = Math.min(350, state.fontSize + 1);
            emit({ fontSize: nextSize }, { fontSize: `${nextSize}px` });
          }}
        >
          +
        </button>
      </div>

      <div className="builder-toolbar-row">
        {colorSwatches.map((swatch) => (
          <button
            key={swatch}
            className="builder-swatch"
            style={{ background: swatch }}
            onClick={() => emit({ color: swatch }, { color: swatch })}
            aria-label={`Set color ${swatch}`}
          />
        ))}
        <input
          className="builder-color-picker"
          type="color"
          value={state.color}
          onChange={(e) => emit({ color: e.target.value }, { color: e.target.value })}
        />
      </div>
    </div>
  );
}
