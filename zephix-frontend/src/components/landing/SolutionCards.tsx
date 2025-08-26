import React from 'react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { LANDING_CONTENT } from '../../lib/constants';
import { staggerContainer, staggerItem, tiltEffect } from '../../lib/animations';
import GlassCard from './shared/GlassCard';

const SolutionCards: React.FC = () => {
  const { ref, inView } = useScrollAnimation(0.2, true, '0px 0px -100px 0px');

  return (
    <section id="features" className="relative py-24 bg-gradient-to-b from-zephix-dark to-zephix-dark/95">
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
            {LANDING_CONTENT.solution.title}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {LANDING_CONTENT.solution.subtitle}
          </p>
        </motion.div>

        {/* Solutions Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          {...staggerContainer}
          initial="initial"
          animate={inView ? "animate" : "initial"}
        >
          {LANDING_CONTENT.solution.solutions.map((solution, index) => (
            <motion.div
              key={index}
              {...staggerItem}
              custom={index}
            >
              <GlassCard
                hoverEffect={true}
                tiltEffect={true}
                padding="lg"
                className="h-full"
              >
                {/* Icon */}
                <div className="text-center mb-6">
                  <motion.div
                    className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-zephix-purple/20 to-zephix-blue/20 border border-zephix-purple/30"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-4xl">{solution.icon}</span>
                  </motion.div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-4 text-center">
                  {solution.title}
                </h3>

                {/* Description */}
                <p className="text-gray-300 text-center mb-6 leading-relaxed">
                  {solution.description}
                </p>

                {/* Benefit */}
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-zephix-purple/20 to-zephix-blue/20 border border-zephix-purple/30">
                    <span className="text-sm font-semibold text-zephix-purple">
                      {solution.benefit}
                    </span>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute inset-0 pointer-events-none">
                  <motion.div
                    className="absolute top-4 right-4 w-2 h-2 bg-zephix-purple/50 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.3
                    }}
                  />
                  <motion.div
                    className="absolute bottom-4 left-4 w-1 h-1 bg-zephix-blue/50 rounded-full"
                    animate={{
                      scale: [1, 2, 1],
                      opacity: [0.3, 0.8, 0.3]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.3 + 1
                    }}
                  />
                </div>
              </GlassCard>
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
            Start detecting conflicts before they become disasters
          </div>
        </motion.div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-zephix-purple/5 to-zephix-blue/5" />
        </div>
        
        {/* Floating solution icons */}
        <motion.div
          className="absolute top-1/3 left-1/8 text-zephix-purple/20 text-5xl"
          animate={{
            y: [0, -15, 0],
            rotate: [0, 10, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          🔍
        </motion.div>
        <motion.div
          className="absolute bottom-1/3 right-1/8 text-zephix-blue/20 text-6xl"
          animate={{
            y: [0, 15, 0],
            rotate: [0, -10, 0]
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        >
          📊
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-zephix-purple/15 text-4xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        >
          ⚡
        </motion.div>
      </div>
    </section>
  );
};

export default SolutionCards;
