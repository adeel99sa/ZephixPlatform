import React from 'react';

const SolutionsSection: React.FC = () => {
  return (
    <section id="solutions" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Three Solutions, One Integrated Platform
        </h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Unlike tools that work in silos, Zephix integrates work management, 
          risk intelligence, and resource optimization into a unified system.
        </p>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Work Management */}
          <div className="bg-gray-50 rounded-lg p-8">
            <div className="text-blue-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Work Management</h3>
            <p className="text-gray-600 mb-4">
              Complete project lifecycle management from initiation to closure.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Project templates (Agile, Waterfall, Hybrid)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Task dependencies and workflows</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Team collaboration tools</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Gantt charts and sprint planning</span>
              </li>
            </ul>
          </div>
          
          {/* Risk Intelligence */}
          <div className="bg-gray-50 rounded-lg p-8">
            <div className="text-orange-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Risk Intelligence</h3>
            <p className="text-gray-600 mb-4">
              AI-powered risk detection and management across your portfolio.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Automated risk identification</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Risk scoring and prioritization</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Impact analysis across projects</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Early warning alerts</span>
              </li>
            </ul>
          </div>
          
          {/* Resource Optimization */}
          <div className="bg-gray-50 rounded-lg p-8">
            <div className="text-purple-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Resource Optimization</h3>
            <p className="text-gray-600 mb-4">
              Prevent burnout and conflicts before they derail your projects.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Real-time allocation tracking</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Conflict detection (the "Sarah problem")</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Workload balancing</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Capacity planning</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Integration message */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            The Power is in the Integration
          </h3>
          <p className="text-gray-700 max-w-3xl mx-auto">
            Work creates risks. Risks consume resources. Resource conflicts cascade into delays. 
            Zephix connects these dots automatically, giving you insights no single tool can provide.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
