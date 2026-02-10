import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BaltazarTV - Downloads',
};

export default function DownloadsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-5">
      <div className="max-w-[800px] w-full bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-10 px-10 text-center">
          <h1 className="text-4xl font-bold mb-2">Download BaltazarTV</h1>
          <p className="text-lg opacity-90">Get the latest version of our application</p>
        </div>

        <div className="p-10">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-indigo-500 border-b-2 border-indigo-500 pb-2 mb-5">
              Available Downloads
            </h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
              <h3 className="text-xl font-semibold mb-2">Mobile Application</h3>
              <p className="text-gray-500 mb-4">iOS and Android apps</p>
              <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-5 text-center text-yellow-800">
                <h3 className="font-semibold mb-1">Coming Soon</h3>
                <p>Mobile applications will be available for download soon.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="text-center py-5 text-gray-500 text-sm border-t border-gray-200">
          <p>&copy; 2025 BaltazarTV. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
