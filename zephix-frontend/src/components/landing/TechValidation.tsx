import React from 'react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { LANDING_CONTENT } from '../../lib/constants';
import { staggerContainer, staggerItem } from '../../lib/animations';
import GlassCard from './shared/GlassCard';

const TechValidation: React.FC = () => {
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
            {LANDING_CONTENT.tech.title}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {LANDING_CONTENT.tech.subtitle}
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          {...staggerContainer}
          initial="initial"
          animate={inView ? "animate" : "initial"}
        >
          {LANDING_CONTENT.tech.features.map((feature, index) => (
            <motion.div
              key={index}
              {...staggerItem}
              custom={index}
            >
              <GlassCard
                hoverEffect={true}
                padding="md"
                className="h-full text-center"
              >
                {/* Icon */}
                <div className="mb-4">
                  <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-zephix-purple/20 to-zephix-blue/20 border border-zephix-purple/30"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-3xl">{feature.icon}</span>
                  </motion.div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-3">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-300 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 font-semibold">Security First</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-white/20" />
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-blue-400 font-semibold">High Availability</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-white/20" />
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
              <span className="text-purple-400 font-semibold">Modern Architecture</span>
            </div>
          </div>
        </motion.div>

        {/* Integration Logos */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <p className="text-gray-400 mb-8">Integrates seamlessly with your existing tools</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {/* Placeholder for integration logos */}
            <div className="w-24 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-white/60 text-sm font-medium">Monday</span>
            </div>
            <div className="w-24 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-white/60 text-sm font-medium">Asana</span>
            </div>
            <div className="w-24 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-white/60 text-sm font-medium">Jira</span>
            </div>
            <div className="w-24 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-white/60 text-sm font-medium">ClickUp</span>
            </div>
            <div className="w-24 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-white/60 text-sm font-medium">Slack</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-zephix-purple/5 to-zephix-blue/5" />
        </div>
        
        {/* Floating tech icons */}
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
          🔒
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
          🌐
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-1/3 text-zephix-purple/15 text-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        >
          📈
        </motion.div>
        <motion.div
          className="absolute bottom-1/3 left-1/2 text-zephix-blue/15 text-4xl"
          animate={{
            y: [0, -8, 0],
            rotate: [0, -3, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
        >
          🔌
        </motion.div>
      </div>
    </section>
  );
};

export default TechValidation;
