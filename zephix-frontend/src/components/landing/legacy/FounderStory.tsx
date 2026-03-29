import React from 'react';

const FounderStory: React.FC = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Born from frustration
          </h2>
        </div>
        
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-gray-700 text-lg mb-4">
            We're project professionals who have lived through the frustration 
            of invisible project risks. After watching too many projects fail 
            despite "green dashboards," we decided to build the tool we wish we had.
          </p>
          
          <p className="text-gray-700 text-lg mb-4">
            We're not another VC-funded startup trying to disrupt everything. 
            We're practitioners building a practical solution to a problem we 
            personally face every day.
          </p>
          
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-gray-500 text-sm">
              Currently bootstrapping development. Your early support and feedback 
              will directly shape what we build.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FounderStory;
