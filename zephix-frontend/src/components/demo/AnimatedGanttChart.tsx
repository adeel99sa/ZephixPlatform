import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface GanttTask {
  id: string;
  name: string;
  start: number;
  duration: number;
  color: string;
  dependencies?: string[];
}

interface AnimatedGanttChartProps {
  tasks: GanttTask[];
  isAnimating: boolean;
}

export const AnimatedGanttChart: React.FC<AnimatedGanttChartProps> = ({ 
  tasks, 
  isAnimating 
}) => {
  const [visibleTasks, setVisibleTasks] = useState<string[]>([]);
  const totalDuration = Math.max(...tasks.map(t => t.start + t.duration));
  const weeks = Array.from({ length: totalDuration }, (_, i) => `W${i + 1}`);

  useEffect(() => {
    if (isAnimating) {
      tasks.forEach((task, index) => {
        setTimeout(() => {
          setVisibleTasks(prev => [...prev, task.id]);
        }, index * 300);
      });
    } else {
      setVisibleTasks([]);
    }
  }, [isAnimating, tasks]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        AI-Generated Project Timeline
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Week headers */}
          <div className="flex mb-4 text-xs text-slate-400">
            <div className="w-32 pr-4">Phase</div>
            {weeks.map(week => (
              <div key={week} className="flex-1 text-center">{week}</div>
            ))}
          </div>

          {/* Tasks */}
          <div className="space-y-2">
            {tasks.map((task) => {
              const isVisible = visibleTasks.includes(task.id);
              return (
                <div key={task.id} className="flex items-center">
                  <div className="w-32 pr-4 text-sm text-slate-300 truncate">
                    {task.name}
                  </div>
                  <div className="flex-1 relative h-8">
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={isVisible ? { 
                        width: `${(task.duration / totalDuration) * 100}%`,
                        opacity: 1 
                      } : {}}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`absolute h-full rounded ${task.color} flex items-center px-2 overflow-hidden`}
                      style={{
                        left: `${(task.start / totalDuration) * 100}%`,
                      }}
                    >
                      {/* Task progress animation */}
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={isVisible ? { x: "0%" } : {}}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                        className="absolute inset-0 bg-white/10"
                      />
                      
                      <span className="text-xs text-white font-medium relative z-10">
                        {task.duration}w
                      </span>
                    </motion.div>

                    {/* Dependencies lines */}
                    {task.dependencies?.map(depId => {
                      const depTask = tasks.find(t => t.id === depId);
                      if (!depTask) return null;
                      
                      return (
                        <motion.div
                          key={depId}
                          initial={{ opacity: 0 }}
                          animate={isVisible ? { opacity: 0.3 } : {}}
                          transition={{ delay: 1 }}
                          className="absolute h-px bg-slate-500"
                          style={{
                            left: `${((depTask.start + depTask.duration) / totalDuration) * 100}%`,
                            width: `${((task.start - depTask.start - depTask.duration) / totalDuration) * 100}%`,
                            top: '50%',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Critical path indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isAnimating ? { opacity: 1 } : {}}
            transition={{ delay: tasks.length * 0.3 + 0.5 }}
            className="mt-4 pt-4 border-t border-slate-700"
          >
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-red-400">Critical Path: 18 weeks</span>
              <span className="text-slate-400 ml-2">(Optimized from 24 weeks)</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};