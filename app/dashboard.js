"use client"
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Link from 'next/link'

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Max width of 800px is plenty for OpenAI to classify items
        const MAX_WIDTH = 800; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Compress to JPEG at 70% quality
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
    };
  });
};

export default function Dashboard({ session }) {
  const [uploading, setUploading] = useState(false)
  const [items, setItems] = useState([])

  // The strict categories allowed in the system
  const itemTypes = ['Furniture', 'Cutlery', 'Appliances', 'Electronics', 'Clothes', 'Decor', 'Other']
  const sizes = ['Small', 'Medium', 'Large']
  const dispositions = ['Sell', 'Recycle', 'Donate']

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', session.user.id)
      .is('pickup_id', null)
      .order('created_at', { ascending: true })
    if (data) setItems(data)
  }

  // 1. Put this helper function RIGHT ABOVE your handleImageUpload function
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Shrinks it enough for Vercel, keeps enough detail for AI
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compresses to 70% quality JPEG
      };
    };
  });
};

async function handleImageUpload(e) {
  const files = Array.from(e.target.files)
  if (files.length === 0) return
  
  setUploading(true)

  try {
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Upload full quality image to your Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, file)

      if (uploadError) throw new Error("Storage Error: " + uploadError.message)

      const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(fileName)
      const imageUrl = urlData.publicUrl

      // Compress the image specifically for the OpenAI API call
      const compressedBase64 = await compressImage(file);

      // Send the compressed version to Vercel/OpenAI
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedBase64 })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        const { data: savedItem, error } = await supabase
          .from('items')
          .insert([{
            user_id: session.user.id,
            image_url: imageUrl,
            title: data.title,
            description: data.description,
            size: data.size,
            disposition: data.disposition,
            item_type: data.item_type,
            box: "TBD"
          }])
          .select()
          .single()
          
        if (!error && savedItem) {
          setItems(prevItems => [...prevItems, savedItem])
        }
      }
    }
  } catch (err) {
    alert(err.message)
  } finally {
    setUploading(false)
    e.target.value = null
  }
}

  const updateLocalItem = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const saveItemToDatabase = async (item) => {
    const { error } = await supabase
      .from('items')
      .update({
        title: item.title,
        description: item.description,
        size: item.size,
        disposition: item.disposition,
        item_type: item.item_type,
        box: item.box
      })
      .eq('id', item.id)
      
    if (error) alert("Failed to save changes")
  }

  const deleteItem = async (id) => {
    await supabase.from('items').delete().eq('id', id)
    setItems(items.filter(item => item.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 mb-6 sm:mb-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <div className="flex items-center space-x-4">
            <img src="/Good_Exit_Logo.png" alt="Good Exit Logo" className="h-8 sm:h-10 w-auto object-contain" />
            <div className="border-l border-slate-300 pl-4 hidden sm:block">
              <p className="text-xs text-slate-500 font-medium">{session.user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-3 sm:space-x-4">
            <Link href="/guide" className="text-slate-500 hover:text-indigo-600 text-sm font-semibold transition-colors">
              How it works
            </Link>
            <Link href="/schedule" className="bg-indigo-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all">
              Schedule Pickup
            </Link>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-500 hover:text-red-500 text-sm font-semibold transition-colors">
              Log out
            </button>
          </div>
          
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Scan new items</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">Upload clear photos of your items. You can select multiple images at once.</p>
          
          <div className="relative max-w-sm mx-auto">
            <input 
              type="file" 
              accept="image/*" 
              multiple
              onChange={handleImageUpload} 
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`bg-white border-2 border-dashed ${uploading ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300'} rounded-xl p-4 flex items-center justify-center space-x-2 transition-colors`}>
              {uploading ? (
                <span className="text-indigo-600 font-semibold animate-pulse">Analyzing images...</span>
              ) : (
                <span className="text-slate-600 font-semibold">Choose files or drag & drop</span>
              )}
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Your Inventory List</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="p-4 pl-6 w-24">Image</th>
                    <th className="p-4 w-48">Item Name</th>
                    <th className="p-4 w-36">Type</th>
                    <th className="p-4 w-32">Size</th>
                    <th className="p-4 w-36">Disposition</th>
                    <th className="p-4 w-20">Box</th>
                    <th className="p-4 pr-6 w-24">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4 pl-6">
                        {item.image_url ? (
                          <img src={item.image_url} alt="Item" className="w-14 h-14 object-cover rounded-lg shadow-sm border border-slate-200" />
                        ) : (
                          <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">No Img</div>
                        )}
                      </td>
                      <td className="p-4">
                        <input value={item.title || ''} onChange={(e) => updateLocalItem(index, 'title', e.target.value)} className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-300 rounded outline-none transition-all font-medium text-slate-700" />
                      </td>
                      
                      {/* Type Dropdown */}
                      <td className="p-4">
                        <select 
                          value={item.item_type || ''} 
                          onChange={(e) => updateLocalItem(index, 'item_type', e.target.value)} 
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-300 rounded outline-none transition-all text-sm font-medium cursor-pointer"
                        >
                          <option value="" disabled>Select...</option>
                          {itemTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </td>
                      
                      {/* Size Dropdown */}
                      <td className="p-4">
                        <select 
                          value={item.size || ''} 
                          onChange={(e) => updateLocalItem(index, 'size', e.target.value)} 
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-300 rounded outline-none transition-all text-sm font-medium cursor-pointer"
                        >
                          <option value="" disabled>Select...</option>
                          {sizes.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </td>
                      
                      {/* Disposition Dropdown */}
                      <td className="p-4">
                        <select 
                          value={item.disposition || ''} 
                          onChange={(e) => updateLocalItem(index, 'disposition', e.target.value)} 
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-300 rounded outline-none transition-all text-sm text-slate-600 cursor-pointer"
                        >
                          <option value="" disabled>Select...</option>
                          {dispositions.map(disp => <option key={disp} value={disp}>{disp}</option>)}
                        </select>
                      </td>
                      
                      <td className="p-4">
                        <input value={item.box || ''} onChange={(e) => updateLocalItem(index, 'box', e.target.value)} className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-300 rounded outline-none transition-all text-sm text-center font-semibold text-slate-700" />
                      </td>
                      <td className="p-4 pr-6 space-y-1">
                        <button onClick={() => saveItemToDatabase(item)} className="block w-full py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded transition-colors">Save</button>
                        <button onClick={() => deleteItem(item.id)} className="block w-full py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded transition-colors">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}