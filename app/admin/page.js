"use client"
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import Link from 'next/link'

export default function AdminDashboard() {
  const [session, setSession] = useState(null)
  const [logistics, setLogistics] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)

  // UI Controls
  const [viewMode, setViewMode] = useState('grouped')
  const [filterType, setFilterType] = useState('All')
  const [expandedUsers, setExpandedUsers] = useState({}) 
  
  // Track dropdown selections for proposed times
  const [selectedProposedTimes, setSelectedProposedTimes] = useState({})

  const itemTypes = ['All', 'Furniture', 'Cutlery', 'Appliances', 'Electronics', 'Clothes', 'Decor', 'Other']

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setSession(session); fetchAllData(); } 
      else { window.location.href = '/' }
    })
  }, [])

  async function fetchAllData() {
    setLoading(true)
    const { data: profiles } = await supabase.from('profiles').select('*')
    const profileMap = (profiles || []).reduce((acc, curr) => { acc[curr.id] = curr.email; return acc }, {})

    const { data: pickups } = await supabase.from('pickups').select('*')
    const { data: cleanings } = await supabase.from('cleanings').select('*')

    setLogistics([
      ...(pickups || []).map(p => ({ 
        ...p, 
        type: 'Pickup', 
        // For sorting, use confirmed time, then first proposed time, then creation time
        sortDate: p.pickup_datetime || (p.proposed_times && p.proposed_times[0]) || p.created_at 
      })),
      ...(cleanings || []).map(c => ({ 
        ...c, 
        type: 'Cleaning', 
        sortDate: c.cleaning_datetime 
      }))
    ].sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate))
     .map(job => ({ ...job, user_email: profileMap[job.user_id] || 'Unknown User' })))

    const { data: items } = await supabase.from('items').select('*')
    setAllItems((items || []).map(item => ({ ...item, user_email: profileMap[item.user_id] || 'Unknown User' })))
    setLoading(false)
  }

  // Update overall status (Pending vs Completed)
  async function updateStatus(id, type, newStatus) {
    const table = type === 'Pickup' ? 'pickups' : 'cleanings'
    const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', id)
    if (!error) fetchAllData()
  }

  // New function: Confirm a proposed time
  async function confirmPickupTime(id, proposedTimes) {
    // If admin didn't touch the dropdown, default to the first proposed time
    const timeToConfirm = selectedProposedTimes[id] || proposedTimes[0]
    
    if (!timeToConfirm) return alert("No time selected.")

    const { error } = await supabase
      .from('pickups')
      .update({ 
        pickup_datetime: timeToConfirm, 
        status: 'Confirmed' // Automatically bump status forward
      })
      .eq('id', id)
      
    if (!error) fetchAllData()
    else alert("Failed to confirm time")
  }

  const toggleUser = (email) => {
    setExpandedUsers(prev => ({ ...prev, [email]: !prev[email] }))
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return "No date"
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
    })
  }

  const filteredItems = useMemo(() => {
    return filterType === 'All' ? allItems : allItems.filter(item => item.item_type === filterType)
  }, [allItems, filterType])

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.user_email]) acc[item.user_email] = []
      acc[item.user_email].push(item)
      return acc
    }, {})
  }, [filteredItems])

  if (!session || loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Command Center...</div>

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans pb-12">
      <header className="bg-slate-950 border-b border-slate-800 px-8 py-5 mb-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">GE</div>
            <h1 className="text-xl font-bold text-white tracking-tight">Admin Center</h1>
          </div>
          <Link href="/" className="text-slate-400 hover:text-white font-semibold transition-colors">Exit Admin View &rarr;</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 space-y-12">
        
        {/* Logistics Queue Section */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Logistics Queue</h2>
          <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="p-4 pl-6">Client Email</th>
                    <th className="p-4 w-32">Service</th>
                    <th className="p-4 w-80">Scheduling</th>
                    <th className="p-4">Details</th>
                    <th className="p-4 w-32">Status</th>
                    <th className="p-4 pr-6 w-40 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {logistics.map((job) => (
                    <tr key={`${job.type}-${job.id}`} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 pl-6 font-medium text-white">{job.user_email}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide ${job.type === 'Pickup' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {job.type}
                        </span>
                      </td>
                      
                      <td className="p-4 text-sm font-medium">
                        {job.type === 'Cleaning' ? (
                          <span className="text-slate-200">{formatDateTime(job.cleaning_datetime)}</span>
                        ) : (
                          /* Pickup Scheduling Logic */
                          job.pickup_datetime ? (
                            <span className="text-emerald-400 flex items-center">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
                              {formatDateTime(job.pickup_datetime)}
                            </span>
                          ) : (
                            <div className="flex flex-col space-y-2">
                              <select 
                                className="bg-slate-900 text-slate-200 text-xs border border-slate-600 rounded p-1.5 outline-none max-w-[220px]"
                                value={selectedProposedTimes[job.id] || job.proposed_times[0] || ''}
                                onChange={(e) => setSelectedProposedTimes({ ...selectedProposedTimes, [job.id]: e.target.value })}
                              >
                                {(job.proposed_times || []).map((time, i) => (
                                  <option key={i} value={time}>{formatDateTime(time)}</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => confirmPickupTime(job.id, job.proposed_times)}
                                className="self-start text-[10px] uppercase tracking-wider font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors"
                              >
                                Confirm Selection
                              </button>
                            </div>
                          )
                        )}
                      </td>

                      <td className="p-4 text-sm text-slate-400">
                        {job.type === 'Pickup' ? `${job.box_count || 0} Boxes` : 'Deep Clean'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide ${job.status === 'Pending' ? 'bg-amber-500/20 text-amber-300' : job.status === 'Confirmed' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {job.status === 'Completed' ? (
                          <button onClick={() => updateStatus(job.id, job.type, 'Pending')} className="bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors">
                            Revert
                          </button>
                        ) : (
                          <button onClick={() => updateStatus(job.id, job.type, 'Completed')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors">
                            Mark Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {logistics.length === 0 && (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-500">No jobs scheduled yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Dynamic Inventory Pipeline (Unchanged) */}
        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 space-y-4 sm:space-y-0">
            <h2 className="text-2xl font-bold text-white">Inventory Pipeline</h2>
            
            <div className="flex items-center space-x-4 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-900 text-slate-200 text-sm font-semibold border-none outline-none rounded py-1.5 px-3"
              >
                {itemTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              
              <div className="flex bg-slate-900 rounded p-1">
                <button onClick={() => setViewMode('grouped')} className={`px-3 py-1 text-sm font-bold rounded transition-colors ${viewMode === 'grouped' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  By Client
                </button>
                <button onClick={() => setViewMode('global')} className={`px-3 py-1 text-sm font-bold rounded transition-colors ${viewMode === 'global' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  Global List
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
            {viewMode === 'global' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold">
                      <th className="p-4 pl-6 w-20">Img</th>
                      <th className="p-4">Client Email</th>
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-700/30">
                        <td className="p-4 pl-6">{item.image_url ? <img src={item.image_url} className="w-10 h-10 object-cover rounded border border-slate-600" /> : 'N/A'}</td>
                        <td className="p-4 text-sm font-medium text-white">{item.user_email}</td>
                        <td className="p-4 text-sm text-slate-300">{item.title}</td>
                        <td className="p-4 text-sm text-indigo-300">{item.item_type || 'Uncategorized'}</td>
                        <td className="p-4 text-xs font-bold uppercase">{item.pickup_id ? <span className="text-emerald-400">Scheduled</span> : <span className="text-amber-400">Unscheduled</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {Object.entries(groupedItems).map(([email, userItems]) => (
                  <div key={email} className="bg-slate-800">
                    <div 
                      onClick={() => toggleUser(email)}
                      className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-white font-bold">{email}</span>
                        <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-full">
                          {userItems.length} {filterType !== 'All' ? filterType : 'Total'} Items
                        </span>
                      </div>
                      <span className="text-slate-400 font-bold">{expandedUsers[email] ? '▼' : '▶'}</span>
                    </div>

                    {expandedUsers[email] && (
                      <div className="bg-slate-900/50 border-t border-slate-700 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {userItems.map(item => (
                            <div key={item.id} className="bg-slate-800 border border-slate-700 p-3 rounded-lg flex items-center space-x-4">
                              {item.image_url ? <img src={item.image_url} className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 bg-slate-700 rounded" />}
                              <div>
                                <h4 className="text-sm font-bold text-white truncate max-w-[150px]">{item.title}</h4>
                                <p className="text-xs text-indigo-300">{item.item_type || 'Uncategorized'} • {item.size}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {Object.keys(groupedItems).length === 0 && (
                  <div className="p-8 text-center text-slate-500">No items match this filter.</div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}