import React from 'react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { LANDING_CONTENT } from '../../lib/constants';
import { staggerContainer, staggerItem } from '../../lib/animations';

const ProblemSection: React.FC = () => {
  const { ref, inView } = useScrollAnimation(0.2, true, '0px 0px -100px 0px');

  return (
    <section id="how-it-works" className="relative py-24 bg-zephix-dark">
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
            {LANDING_CONTENT.problem.title}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {LANDING_CONTENT.problem.subtitle}
          </p>
        </motion.div>

        {/* Problems Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          {...staggerContainer}
          initial="initial"
          animate={inView ? "animate" : "initial"}
        >
          {LANDING_CONTENT.problem.problems.map((problem, index) => (
            <motion.div
              key={index}
              className="group relative"
              {...staggerItem}
              custom={index}
            >
              {/* Problem Card */}
              <motion.div
                className="relative p-8 rounded-2xl bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/20 hover:border-red-500/40 transition-all duration-300"
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Icon */}
                <div className="text-5xl mb-6 text-center">
                  {problem.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-4 text-center">
                  {problem.title}
                </h3>

                {/* Description */}
                <p className="text-gray-300 text-center mb-6 leading-relaxed">
                  {problem.description}
                </p>

                {/* Stat */}
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30">
                    <span className="text-2xl font-bold text-red-400">
                      {problem.stat}
                    </span>
                  </div>
                </div>

                {/* Source */}
                <p className="text-xs text-gray-500 text-center mt-4">
                  Source: {problem.source}
                </p>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.div>

              {/* Floating particles */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div
                  className="absolute top-4 right-4 w-2 h-2 bg-red-400/50 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.5
                  }}
                />
                <motion.div
                  className="absolute bottom-4 left-4 w-1 h-1 bg-orange-400/50 rounded-full"
                  animate={{
                    scale: [1, 2, 1],
                    opacity: [0.3, 0.8, 0.3]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.5 + 1
                  }}
                />
              </div>
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
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-red-500/20 border border-red-500/30 text-red-400">
            <span className="w-2 h-2 bg-red-400 rounded-full mr-3 animate-pulse" />
            These problems cost companies millions annually
          </div>
        </motion.div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5" />
        </div>
        
        {/* Floating warning icons */}
        <motion.div
          className="absolute top-1/4 left-1/6 text-red-500/20 text-6xl"
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          ⚠️
        </motion.div>
        <motion.div
          className="absolute bottom-1/4 right-1/6 text-orange-500/20 text-5xl"
          animate={{
            y: [0, 10, 0],
            rotate: [0, -5, 0]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        >
          🚨
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemSection;
