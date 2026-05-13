import { useEffect, useState } from 'react'

export default function BookFactoryDashboardPWA(){
  const [jobs] = useState([{id:'book1',status:'running',chapter:4,score:8.6},{id:'book2',status:'done',chapter:10,score:9.1}])
  useEffect(()=>{
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
    const manifest = {name:'Book Factory',short_name:'BookFactory',display:'standalone',start_url:'/',background_color:'#f8fafc',theme_color:'#0f172a',icons:[]}
    const blob = new Blob([JSON.stringify(manifest)], {type:'application/json'})
    const link = document.createElement('link'); link.rel='manifest'; link.href = URL.createObjectURL(blob); document.head.appendChild(link)
  },[])
  const avg=(jobs.reduce((a,b)=>a+b.score,0)/jobs.length).toFixed(1)
  return <div className='min-h-screen bg-slate-50 p-6'>
    <div className='max-w-6xl mx-auto space-y-6'>
      <div className='bg-white rounded-3xl shadow-sm p-6'><h1 className='text-3xl font-bold'>Book Factory Dashboard</h1><p className='text-slate-600 mt-2'>Installabile offline</p></div>
      <div className='grid md:grid-cols-3 gap-4'>{[['Books',jobs.length],['Avg Score',avg],['Active',jobs.filter(j=>j.status==='running').length]].map(([k,v])=><div key={k} className='bg-white rounded-3xl shadow-sm p-6'><div className='text-sm text-slate-500'>{k}</div><div className='text-3xl font-semibold mt-2'>{v}</div></div>)}</div>
      <div className='bg-white rounded-3xl shadow-sm overflow-hidden'><table className='w-full'><thead className='bg-slate-100'><tr><th className='p-4 text-left'>Job</th><th>Status</th><th>Chapter</th><th>Score</th><th>Actions</th></tr></thead><tbody>{jobs.map(j=><tr key={j.id} className='border-t'><td className='p-4'>{j.id}</td><td>{j.status}</td><td>{j.chapter}</td><td>{j.score}</td><td><button className='px-3 py-1 rounded-xl bg-slate-200 mr-2'>Resume</button><button className='px-3 py-1 rounded-xl bg-slate-200'>Export</button></td></tr>)}</tbody></table></div>
      <div className='text-sm text-slate-500'>Per offline, aggiungi public/sw.js con cache delle route/API statiche.</div>
    </div>
  </div>
}
