// Standalone layout for the public /install route. Deliberately outside the
// (app)/(auth) route groups so it pulls in NO AuthProvider / WebSocket / Stripe
// machinery — it must render for unauthenticated visitors and installed users.

export default function InstallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-dark flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-10">
        {children}
      </main>
    </div>
  );
}
