export function Card({ children, className = "" }: any) {
  return <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = "" }: any) {
  return <div className={`p-6 pb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: any) {
  return <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = "" }: any) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}
