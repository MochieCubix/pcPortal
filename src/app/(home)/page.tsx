'use client';

export default function Home() {
  return (
    <>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Overview</h2>
            <p>Dashboard overview will load dynamically.</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Statistics</h2>
            <p>Statistics will load dynamically.</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Recent Activity</h2>
            <p>Activity will load dynamically.</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
          <div className="col-span-12 grid xl:col-span-8 bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Dashboard Content</h2>
            <p>Main dashboard content will load dynamically.</p>
          </div>
        </div>
      </div>
    </>
  );
} 