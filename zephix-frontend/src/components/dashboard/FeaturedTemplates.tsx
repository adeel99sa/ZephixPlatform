const templates = [
  { name: 'Software Development PMO', category: 'Engineering', icon: '💻' },
  { name: 'Marketing Campaign Tracker', category: 'Marketing', icon: '📊' },
  { name: 'Construction Project', category: 'Construction', icon: '🏗️' },
  { name: 'IT Service Desk', category: 'IT Operations', icon: '🎫' }
];

export function FeaturedTemplates() {
  return (
    <section>
      <h2 className="text-sm font-medium text-gray-500 mb-4">
        Featured templates
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map(template => (
          <TemplateCard key={template.name} template={template} />
        ))}
      </div>
    </section>
  );
}

function TemplateCard({ template }: { template: { name: string; category: string; icon: string } }) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
          <span className="text-xl">{template.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
            {template.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{template.category}</p>
        </div>
      </div>
    </div>
  );
}




