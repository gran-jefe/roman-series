export default function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="p-4 bg-red-50 border border-ember rounded-lg text-ember text-sm">
      {message}
    </div>
  );
}
