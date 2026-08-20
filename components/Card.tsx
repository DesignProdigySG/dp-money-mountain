export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border p-4 ${className}`}
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      {children}
    </div>
  );
}
