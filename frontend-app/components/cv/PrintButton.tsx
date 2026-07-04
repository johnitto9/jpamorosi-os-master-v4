"use client";

// Small client button to trigger the browser's print / "Save as PDF".
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}

export default PrintButton;
