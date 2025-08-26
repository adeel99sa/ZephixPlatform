import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { LANDING_CONTENT } from '../../lib/constants';
import { staggerContainer, staggerItem } from '../../lib/animations';
import { trackFAQExpand } from '../../lib/analytics';

const FAQ: React.FC = () => {
  const { ref, inView } = useScrollAnimation(0.2, true, '0px 0px -100px 0px');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    if (openIndex === index) {
      setOpenIndex(null);
    } else {
      setOpenIndex(index);
      // Track FAQ expansion for analytics
      const question = LANDING_CONTENT.faq.questions[index];
      trackFAQExpand(`faq-${index}`, question.question);
    }
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-zephix-dark/95 to-zephix-dark">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {LANDING_CONTENT.faq.title}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {LANDING_CONTENT.faq.subtitle}
          </p>
        </motion.div>

        {/* FAQ Items */}
        <motion.div
          className="space-y-4"
          {...staggerContainer}
          initial="initial"
          animate={inView ? "animate" : "initial"}
        >
          {LANDING_CONTENT.faq.questions.map((item, index) => (
            <motion.div
              key={index}
              className="overflow-hidden"
              {...staggerItem}
            >
              <motion.div
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                {/* Question */}
                <button
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors duration-200"
                  onClick={() => handleToggle(index)}
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <h3 className="text-lg font-semibold text-white pr-4">
                    {item.question}
                  </h3>
                  <motion.div
                    className="flex-shrink-0 w-6 h-6 text-zephix-purple"
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </button>

                {/* Answer */}
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      id={`faq-answer-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6">
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-gray-300 leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-zephix-purple/20 to-zephix-blue/20 border border-zephix-purple/30 text-zephix-purple">
            <span className="w-2 h-2 bg-zephix-purple rounded-full mr-3 animate-pulse" />
            Still have questions? Contact our team
          </div>
        </motion.div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-zephix-purple/5 to-zephix-blue/5" />
        </div>
        
        {/* Floating FAQ icons */}
        <motion.div
          className="absolute top-1/4 left-1/6 text-zephix-purple/20 text-4xl"
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, 0]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          ❓
        </motion.div>
        <motion.div
          className="absolute bottom-1/4 right-1/6 text-zephix-blue/20 text-5xl"
          animate={{
            y: [0, 10, 0],
            rotate: [0, -5, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        >
          💡
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-zephix-purple/15 text-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        >
          🤔
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
