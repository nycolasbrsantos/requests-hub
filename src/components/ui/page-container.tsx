import React from 'react'

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PageContainer({ children, className = '', ...props }: PageContainerProps) {
  return (
    <div
      {...props}
      className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  )
}
