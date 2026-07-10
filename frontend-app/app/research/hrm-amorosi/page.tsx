import type { Metadata } from "next";
import { HrmDossier } from "@/components/research/HrmDossier";

export const metadata: Metadata = {
  title: "HRM—Amorosi Research Dossier",
  description: "Foundations and Blueprint research dossier for Amorosi-HRM.",
  alternates: { canonical: "/research/hrm-amorosi" },
};

export default function HrmAmorosiPage() {
  return <HrmDossier />;
}
