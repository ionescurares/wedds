import ElegantEditorial from "@/components/templates/ElegantEditorial";
import RomanticFloral from "@/components/templates/RomanticFloral";
import type { ComponentType } from "react";
import type { SiteState } from "@/types/database";

export type InvitationContext = {
  id: string;
  guestNames: string[];
};

export type TemplateComponentProps = {
  state: SiteState;
  editable?: boolean;
  siteId?: string;
  invitation?: InvitationContext;
};

export type TemplateComponent = ComponentType<TemplateComponentProps>;

export type TemplateConfig = {
  component: TemplateComponent;
  colorSwatches: string[];
};

export const templateRegistry: Record<string, TemplateConfig> = {
  "elegant-editorial": {
    component: ElegantEditorial,
    colorSwatches: ["#FDFCFA", "#D4C8A8", "#B8A67E", "#C4BAA8", "#7A7A5E", "#2C2C28", "#1A1A17"],
  },
  "romantic-floral": {
    component: RomanticFloral,
    colorSwatches: ["#4A3F3A", "#6B5D56", "#9B6B7A", "#B88A96", "#6A8760", "#8EA882", "#E8B4A2"],
  },
};

export function getTemplateComponent(slug: string): TemplateComponent {
  return (templateRegistry[slug] ?? templateRegistry["elegant-editorial"]).component;
}

export function getTemplateConfig(slug: string): TemplateConfig {
  return templateRegistry[slug] ?? templateRegistry["elegant-editorial"];
}

