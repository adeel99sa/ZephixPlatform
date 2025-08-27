import React, { useState } from 'react';
import { LANDING_CONTENT } from '../../lib/constants';

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    if (openIndex === index) {
      setOpenIndex(null);
    } else {
      setOpenIndex(index);
    }
  };

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {LANDING_CONTENT.faq.title}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {LANDING_CONTENT.faq.subtitle}
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {LANDING_CONTENT.faq.questions.map((item, index) => (
            <div
              key={index}
              className="overflow-hidden"
            >
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Question */}
                <button
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => handleToggle(index)}
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <h3 className="text-lg font-semibold text-gray-900 pr-4">
                    {item.question}
                  </h3>
                  <div className="flex-shrink-0 w-6 h-6 text-blue-600">
                    <svg 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      className={`transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Answer */}
                {openIndex === index && (
                  <div
                    id={`faq-answer-${index}`}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-gray-600 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
