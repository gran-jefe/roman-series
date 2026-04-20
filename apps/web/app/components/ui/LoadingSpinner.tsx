export default function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "w-6 h-6" : size === "lg" ? "w-16 h-16" : "w-10 h-10";
  return (
    <div className={`${dim} border-4 border-forest border-t-transparent rounded-full animate-spin`} />
  );
}
