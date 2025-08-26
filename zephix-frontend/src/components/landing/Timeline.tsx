import React from 'react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { LANDING_CONTENT } from '../../lib/constants';
import { staggerContainer, staggerItem } from '../../lib/animations';

const Timeline: React.FC = () => {
  const { ref, inView } = useScrollAnimation(0.2, true, '0px 0px -100px 0px');

  return (
    <section className="relative py-24 bg-gradient-to-b from-zephix-dark/95 to-zephix-dark">
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
            {LANDING_CONTENT.timeline.title}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {LANDING_CONTENT.timeline.subtitle}
          </p>
        </motion.div>

        {/* Timeline */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Timeline Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-zephix-purple/50 to-zephix-blue/50" />

          {/* Timeline Items */}
          <motion.div
            className="space-y-16"
            {...staggerContainer}
            initial="initial"
            animate={inView ? "animate" : "initial"}
          >
            {LANDING_CONTENT.timeline.phases.map((phase, index) => (
              <motion.div
                key={index}
                className={`relative flex items-center ${
                  index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                }`}
                {...staggerItem}
              >
                {/* Timeline Dot */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-zephix-purple to-zephix-blue border-4 border-zephix-dark z-10" />

                {/* Content Card */}
                <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                  <motion.div
                    className={`p-6 rounded-2xl border transition-all duration-300 ${
                      phase.status === 'current'
                        ? 'bg-gradient-to-br from-zephix-purple/20 to-zephix-blue/20 border-zephix-purple/30'
                        : phase.status === 'upcoming'
                        ? 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30'
                        : 'bg-gradient-to-br from-gray-900/20 to-gray-800/20 border-gray-500/30'
                    }`}
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Phase Badge */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                      phase.status === 'current'
                        ? 'bg-zephix-purple/30 text-zephix-purple'
                        : phase.status === 'upcoming'
                        ? 'bg-blue-500/30 text-blue-400'
                        : 'bg-gray-500/30 text-gray-400'
                    }`}>
                      {phase.status === 'current' && (
                        <span className="w-2 h-2 bg-zephix-purple rounded-full mr-2 animate-pulse" />
                      )}
                      {phase.status === 'upcoming' && (
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                      )}
                      {phase.status === 'planned' && (
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                      )}
                      {phase.phase}
                    </div>

                    {/* Title */}
                    <h3 className={`text-xl font-bold mb-3 ${
                      phase.status === 'current' ? 'text-zephix-purple' : 'text-white'
                    }`}>
                      {phase.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {phase.description}
                    </p>

                    {/* Status Indicator */}
                    <div className="mt-4 flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        phase.status === 'current' ? 'bg-zephix-purple animate-pulse' :
                        phase.status === 'upcoming' ? 'bg-blue-400' : 'bg-gray-400'
                      }`} />
                      <span className={`text-xs font-medium ${
                        phase.status === 'current' ? 'text-zephix-purple' :
                        phase.status === 'upcoming' ? 'text-blue-400' : 'text-gray-400'
                      }`}>
                        {phase.status === 'current' ? 'In Progress' :
                         phase.status === 'upcoming' ? 'Coming Soon' : 'Planned'}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-zephix-purple/20 to-zephix-blue/20 border border-zephix-purple/30 text-zephix-purple">
            <span className="w-2 h-2 bg-zephix-purple rounded-full mr-3 animate-pulse" />
            Help shape our development roadmap
          </div>
        </motion.div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-zephix-purple/5 to-zephix-blue/5" />
        </div>
        
        {/* Floating timeline icons */}
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
          📅
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
          🚀
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
          🎯
        </motion.div>
      </div>
    </section>
  );
};

export default Timeline;
