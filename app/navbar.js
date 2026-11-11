"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar({ email }) {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 mb-6 sm:mb-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
        
        <div className="flex items-center space-x-4">
          <img src="/Good_Exit_Logo.png" alt="Good Exit Logo" className="h-8 sm:h-10 w-auto object-contain" />
          {email && (
            <div className="border-l border-slate-300 pl-4 hidden sm:block">
              <p className="text-xs text-slate-500 font-medium">{email}</p>
            </div>
          )}
        </div>

        <div className="flex bg-slate-100 p-1 rounded-full overflow-x-auto w-full sm:w-auto">
          <Link 
            href="/guide" 
            className={`flex-1 sm:flex-none text-center px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              pathname === '/guide' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            How it works
          </Link>
          <Link 
            href="/" 
            className={`flex-1 sm:flex-none text-center px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              pathname === '/' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/schedule" 
            className={`flex-1 sm:flex-none text-center px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              pathname === '/schedule' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Schedule
          </Link>
        </div>
        
      </div>
    </header>
  )
}