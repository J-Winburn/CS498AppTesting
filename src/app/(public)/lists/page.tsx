import Link from "next/link";

export default function ListsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <h1 className="text-4xl font-bold mb-8">Feature coming soon</h1>
      <Link href="/" className="px-6 py-3 border-2 border-[#fb3d93] text-[#fb3d93] rounded-lg hover:bg-[#fb3d93]/10 transition">
        Back to Home
      </Link>
    </main>
  );
}
