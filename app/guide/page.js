"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Link from 'next/link'
import Navbar from '../navbar';

export default function GuidePage() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSession(session)
      else window.location.href = '/'
    })
  }, [])

  if (!session) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>

  const steps = [
    {
      num: "1",
      title: "Scan Your Inventory",
      timeframe: "Do this over several weeks",
      desc: "Take clear, well-lit photos of individual items. Let the AI automatically classify the size and category, and edit any missing details directly in your list."
    },
    {
      num: "2",
      title: "Box Up Your Life",
      timeframe: "Update as you pack",
      desc: "As you pack physical boxes, update the 'Box' column in your dashboard (e.g., 'Kitchen Box 1') so the moving team knows exactly where small items are stored."
    },
    {
      num: "3",
      title: "Propose Pickup Times",
      timeframe: "When your list is ready",
      desc: "Once your inventory is complete, navigate to Schedule & Logistics. Submit 2 to 3 proposed time slots that work for you for the movers to arrive."
    },
    {
      num: "4",
      title: "Wait for Confirmation",
      timeframe: "Check back later",
      desc: "The logistics team will review your list, approve the truck size, and lock in one of your proposed times. Keep an eye out for the green 'Confirmed' status!"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">

      {/* New Header with Pill Navigation */}
      <Navbar email={session?.user?.email} />

      <main className="max-w-4xl mx-auto px-4 sm:px-8">
        
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">How It Works</h1>
          <p className="text-slate-500 font-medium max-w-lg mx-auto">
            A simple, step-by-step guide to managing your move-out inventory and scheduling your logistics team.
          </p>
        </div>

        {/* 2x2 Grid for Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step) => (
            <div key={step.num} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all">
              
              {/* Subtle background number decoration */}
              <div className="absolute -right-4 -bottom-4 text-9xl font-black text-slate-50 opacity-50 pointer-events-none group-hover:text-indigo-50 transition-colors">
                {step.num}
              </div>
              
              {/* Icon / Number Badge */}
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold mb-5 shadow-sm relative z-10">
                {step.num}
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1 block">
                  {step.timeframe}
                </span>
                <h3 className="text-xl font-bold text-slate-800 mb-3">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Action Button */}
        <div className="mt-12 text-center">
          <Link href="/" className="inline-block bg-indigo-600 text-white px-8 py-3.5 rounded-full font-bold hover:bg-indigo-700 hover:shadow-lg transition-all">
            Get Started &rarr;
          </Link>
        </div>

      </main>
    </div>
  )
}