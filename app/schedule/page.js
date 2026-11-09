"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Link from 'next/link'

export default function SchedulePage() {
  const [session, setSession] = useState(null)
  const [allBookings, setAllBookings] = useState([])
  const [unassignedCount, setUnassignedCount] = useState(0)
  
  // Pickup Form State (Now handles multiple dates)
  const [currentDateInput, setCurrentDateInput] = useState('')
  const [proposedDates, setProposedDates] = useState([])
  const [boxCount, setBoxCount] = useState('')
  const [submittingPickup, setSubmittingPickup] = useState(false)

  // Cleaning Form State
  const [cleaningDate, setCleaningDate] = useState('')
  const [submittingCleaning, setSubmittingCleaning] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        fetchData(session.user.id)
      } else {
        window.location.href = '/'
      }
    })
  }, [])

  async function fetchData(userId) {
    const { data: pickupData } = await supabase.from('pickups').select('*').eq('user_id', userId)
    const { data: cleanData } = await supabase.from('cleanings').select('*').eq('user_id', userId)

    const combined = [
      ...(pickupData || []).map(p => ({ 
        ...p, 
        type: 'Pickup', 
        // Use confirmed date if admin set it, otherwise use the first proposed date for sorting
        sortDate: p.pickup_datetime || (p.proposed_times && p.proposed_times[0]) || p.created_at 
      })),
      ...(cleanData || []).map(c => ({ 
        ...c, 
        type: 'Cleaning', 
        sortDate: c.cleaning_datetime 
      }))
    ].sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate))
    
    setAllBookings(combined)

    const { count } = await supabase.from('items').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).is('pickup_id', null)
    if (count !== null) setUnassignedCount(count)
  }

  // Add a date to the proposed list
  const addProposedDate = () => {
    if (!currentDateInput) return
    if (!proposedDates.includes(currentDateInput)) {
      setProposedDates([...proposedDates, currentDateInput].sort())
    }
    setCurrentDateInput('')
  }

  // Remove a date from the list
  const removeProposedDate = (dateToRemove) => {
    setProposedDates(proposedDates.filter(d => d !== dateToRemove))
  }

  async function handleSubmitPickup() {
    if (proposedDates.length === 0) return alert("Please add at least one proposed date & time.")
    if (unassignedCount === 0) return alert("You have no unscheduled items in your inventory.")
    
    setSubmittingPickup(true)

    const { data: newPickup, error: pickupError } = await supabase
      .from('pickups')
      .insert([{
        user_id: session.user.id,
        proposed_times: proposedDates,
        box_count: parseInt(boxCount) || 0
      }])
      .select()
      .single()

    if (!pickupError) {
      await supabase
        .from('items')
        .update({ pickup_id: newPickup.id })
        .eq('user_id', session.user.id)
        .is('pickup_id', null)
      
      setProposedDates([])
      setBoxCount('')
      fetchData(session.user.id)
    }
    setSubmittingPickup(false)
  }

  async function handleSubmitCleaning() {
    if (!cleaningDate) return alert("Please select a cleaning date and time.")
    setSubmittingCleaning(true)

    const { error } = await supabase.from('cleanings').insert([{
      user_id: session.user.id,
      cleaning_datetime: cleaningDate
    }])

    if (!error) {
      setCleaningDate('')
      fetchData(session.user.id)
    } else alert("Failed to book cleaning.")
    
    setSubmittingCleaning(false)
  }

  async function deleteBooking(id, type) {
    const table = type === 'Pickup' ? 'pickups' : 'cleanings'
    const warning = type === 'Pickup' ? "Cancel this pickup? Your items will be returned to your inventory." : "Cancel this cleaning appointment?"
    if (!window.confirm(warning)) return
    
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) fetchData(session.user.id)
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return "Pending"
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
    })
  }

  if (!session) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>

return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 mb-6 sm:mb-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          
          {/* Logo & User Email */}
          <div className="flex items-center space-x-4">
            <img 
              src="/Good_Exit_Logo.png" 
              alt="Good Exit Logo" 
              className="h-8 sm:h-10 w-auto object-contain" 
            />
            <div className="border-l border-slate-300 pl-4 hidden sm:block">
              <p className="text-xs text-slate-500 font-medium">{session.user.email}</p>
            </div>
          </div>

          {/* Navigation */}
          <Link href="/" className="text-slate-500 hover:text-indigo-600 text-sm font-semibold transition-colors">
            &larr; Back to Inventory
          </Link>
          
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-5 space-y-6">
          {/* Pickup Booking */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Book Inventory Pickup</h2>
            <p className="text-slate-500 text-sm mb-5">
              Propose one or more times for your <strong className="text-indigo-600">{unassignedCount} items</strong>.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Add Proposed Times</label>
                <div className="flex space-x-2 mb-3">
                  <input type="datetime-local" value={currentDateInput} onChange={(e) => setCurrentDateInput(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm" />
                  <button onClick={addProposedDate} className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 rounded-xl transition-colors text-sm">Add</button>
                </div>
                
                {/* Proposed Dates Tag List */}
                {proposedDates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {proposedDates.map(date => (
                      <div key={date} className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-sm">
                        {formatDateTime(date)}
                        <button onClick={() => removeProposedDate(date)} className="ml-2 text-indigo-400 hover:text-red-500 text-lg leading-none">&times;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estimated Moving Boxes</label>
                <input type="number" placeholder="e.g. 15" value={boxCount} onChange={(e) => setBoxCount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" />
              </div>
              <button onClick={handleSubmitPickup} disabled={submittingPickup || unassignedCount === 0 || proposedDates.length === 0} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
                {submittingPickup ? "Processing..." : "Submit Proposed Times"}
              </button>
            </div>
          </div>

          {/* Cleaning Booking (Unchanged) */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Book Move-Out Clean</h2>
            <div className="space-y-4 mt-5">
              <input type="datetime-local" value={cleaningDate} onChange={(e) => setCleaningDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 transition-all" />
              <button onClick={handleSubmitCleaning} disabled={submittingCleaning} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all">
                {submittingCleaning ? "Processing..." : "Book Cleaning"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Combined Itinerary */}
        <div className="lg:col-span-7">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Your Itinerary</h2>
          
          {allBookings.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-slate-500 font-medium">You have no upcoming services scheduled.</p>
            </div>
          ) : (
            <div className="space-y-4 relative">
              <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-200 -z-10 hidden sm:block"></div>

              {allBookings.map((booking) => (
                <div key={`${booking.type}-${booking.id}`} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 relative">
                  <div className="hidden sm:flex items-center justify-center w-14">
                    <div className={`w-4 h-4 rounded-full border-4 border-white shadow-sm ${booking.type === 'Pickup' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide ${booking.type === 'Pickup' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {booking.type}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md uppercase tracking-wide">
                          {booking.status}
                        </span>
                      </div>
                      
                      {booking.type === 'Pickup' ? (
                        <>
                          {booking.pickup_datetime ? (
                            <h3 className="text-lg font-bold text-slate-900 mt-1">Confirmed: {formatDateTime(booking.pickup_datetime)}</h3>
                          ) : (
                            <div className="mt-2">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Proposed Times</p>
                              <ul className="space-y-1">
                                {(booking.proposed_times || []).map((time, i) => (
                                  <li key={i} className="text-sm font-semibold text-slate-700 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full mr-2"></span>
                                    {formatDateTime(time)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p className="text-sm text-slate-500 font-medium mt-3 border-t border-slate-100 pt-2">
                            {booking.box_count > 0 ? `${booking.box_count} Boxes + Inventory` : 'Inventory logistics'}
                          </p>
                        </>
                      ) : (
                        <h3 className="text-lg font-bold text-slate-900 mt-1">{formatDateTime(booking.sortDate)}</h3>
                      )}
                    </div>
                    
                    <button onClick={() => deleteBooking(booking.id, booking.type)} className="text-red-500 hover:bg-red-50 font-semibold px-4 py-2 rounded-lg transition-colors text-sm border border-transparent hover:border-red-100 mt-2 sm:mt-0">
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}