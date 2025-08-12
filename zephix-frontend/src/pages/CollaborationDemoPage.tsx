export function CollaborationDemoPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Real-Time Collaboration Demo</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Enterprise Collaboration Features</h2>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-blue-600">Live Project Updates</h3>
            <p className="text-gray-600">Real-time synchronization across team members</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-green-600">AI-Powered Insights</h3>
            <p className="text-gray-600">Intelligent suggestions based on team activity</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-purple-600">Enterprise Security</h3>
            <p className="text-gray-600">Role-based access control and audit trails</p>
          </div>
        </div>
      </div>
    </div>
  );
}
