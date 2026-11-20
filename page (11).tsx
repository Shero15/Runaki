import type { Metadata } from "next";
import { FieldPanel } from "@/components/FieldPanel";

export const metadata: Metadata = {
  title: "Field team detail",
};

export default function LookupPage() {
  return <FieldPanel />;
}
