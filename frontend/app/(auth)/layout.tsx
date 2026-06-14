import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101010] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f3f3f3] mb-4">
            <Image src="/logo.svg" alt="Logo" width={40} height={40} priority />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
