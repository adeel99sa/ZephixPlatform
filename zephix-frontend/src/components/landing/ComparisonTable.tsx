import React from 'react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { LANDING_CONTENT } from '../../lib/constants';
import { fadeInUp, staggerContainer, staggerItem } from '../../lib/animations';

const ComparisonTable: React.FC = () => {
  const { ref, inView } = useScrollAnimation(0.2, true, '0px 0px -100px 0px');

  return (
    <section id="pricing" className="relative py-24 bg-gradient-to-b from-zephix-dark to-zephix-dark/95">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {LANDING_CONTENT.comparison.title}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {LANDING_CONTENT.comparison.subtitle}
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          className="overflow-x-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="min-w-[800px]">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="p-4"></div> {/* Empty corner */}
              <div className="p-4 text-center">
                <h3 className="text-lg font-semibold text-gray-400">Task Tracking</h3>
              </div>
              <div className="p-4 text-center">
                <h3 className="text-lg font-semibold text-gray-400">Resource Conflicts</h3>
              </div>
              <div className="p-4 text-center">
                <h3 className="text-lg font-semibold text-gray-400">Predictive Analytics</h3>
              </div>
              <div className="p-4 text-center">
                <h3 className="text-lg font-semibold text-gray-400">AI Learning</h3>
              </div>
            </div>

            {/* Table Rows */}
            <motion.div
              {...staggerContainer}
              initial="initial"
              animate={inView ? "animate" : "initial"}
            >
              {LANDING_CONTENT.comparison.competitors.map((competitor, index) => (
                <motion.div
                  key={index}
                  className={`grid grid-cols-5 gap-4 p-4 rounded-xl transition-all duration-300 ${
                    competitor.name === 'Zephix' 
                      ? 'bg-gradient-to-r from-zephix-purple/20 to-zephix-blue/20 border border-zephix-purple/30' 
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                  {...staggerItem}
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  {/* Competitor Name */}
                  <div className="flex items-center">
                    <span className={`font-semibold ${
                      competitor.name === 'Zephix' ? 'text-zephix-purple' : 'text-white'
                    }`}>
                      {competitor.name}
                    </span>
                    {competitor.name === 'Zephix' && (
                      <span className="ml-2 px-2 py-1 text-xs bg-zephix-purple/30 text-zephix-purple rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>

                  {/* Task Tracking */}
                  <div className="flex items-center justify-center">
                    <span className={`text-2xl ${
                      competitor.taskTracking === '✅' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {competitor.taskTracking}
                    </span>
                  </div>

                  {/* Resource Conflicts */}
                  <div className="flex items-center justify-center">
                    <span className={`text-2xl ${
                      competitor.resourceConflicts === '✅' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {competitor.resourceConflicts}
                    </span>
                  </div>

                  {/* Predictive Analytics */}
                  <div className="flex items-center justify-center">
                    <span className={`text-2xl ${
                      competitor.predictiveAnalytics === '✅' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {competitor.predictiveAnalytics}
                    </span>
                  </div>

                  {/* AI Learning */}
                  <div className="flex items-center justify-center">
                    <span className={`text-2xl ${
                      competitor.aiLearning === '✅' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {competitor.aiLearning}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Key Differentiators */}
        <motion.div
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/20">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-3">Proactive vs Reactive</h3>
            <p className="text-gray-300">
              While others wait for problems to surface, Zephix predicts and prevents them weeks in advance.
            </p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-bold text-white mb-3">AI-Powered Intelligence</h3>
            <p className="text-gray-300">
              Machine learning that gets smarter with every decision, unlike static rule-based systems.
            </p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/20">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-xl font-bold text-white mb-3">Seamless Integration</h3>
            <p className="text-gray-300">
              Works with your existing tools instead of forcing you to replace your entire workflow.
            </p>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-zephix-purple/20 to-zephix-blue/20 border border-zephix-purple/30 text-zephix-purple">
            <span className="w-2 h-2 bg-zephix-purple rounded-full mr-3 animate-pulse" />
            Don't just track tasks - prevent disasters
          </div>
        </motion.div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5" />
        </div>
        
        {/* Floating comparison icons */}
        <motion.div
          className="absolute top-1/4 left-1/6 text-green-400/20 text-4xl"
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
          ✅
        </motion.div>
        <motion.div
          className="absolute bottom-1/4 right-1/6 text-red-400/20 text-5xl"
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
          ❌
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-zephix-purple/15 text-3xl"
          >
            🎯
        </motion.div>
      </div>
    </section>
  );
};

export default ComparisonTable;
