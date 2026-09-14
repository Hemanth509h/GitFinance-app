export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#081421] text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <a href="/" className="text-emerald-400 hover:text-emerald-300">
          Back to home
        </a>
      </div>
    </main>
  );
}
