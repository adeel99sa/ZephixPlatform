import React from 'react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    'Upload Your BRD',
    'AI Analysis & Planning', 
    'Review & Execute'
  ];

  const stepDescriptions = {
    0: 'Drag & drop your document in PDF, Word, or text format.',
    1: 'Our AI engine builds a full project plan with risks & milestones.',
    2: 'Tweak, assign, and launch your project in minutes.',
  };

  return (
    <section id="how-it-works" className="bg-gray-50 py-20" aria-labelledby="how-it-works-heading">
      <div className="container mx-auto px-4 text-center">
        <h2 id="how-it-works-heading" className="text-3xl font-bold text-gray-800 mb-4">
          How Zephix Works
        </h2>
        <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
          From upload to execution in just three simple steps.
        </p>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step} className="space-y-4" role="article" aria-labelledby={`step-${i + 1}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white text-2xl font-bold" aria-hidden="true">
                {i + 1}
              </div>
              <h3 id={`step-${i + 1}`} className="text-xl font-semibold">{step}</h3>
              <p className="text-gray-600">
                {stepDescriptions[i as keyof typeof stepDescriptions]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
